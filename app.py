from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId
from urllib.parse import quote_plus
import certifi

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev_key_fallback")

# Configuración para manejar correctamente los templates
app.template_folder = 'templates'
app.static_folder = 'static'

# MongoDB Configuration with your correct connection string
MONGODB_URI = "mongodb+srv://jhphill:5T9g9OamyEt78PLz@cluster0.olgavu8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

try:
    client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
    db = client.dress_management_db  # Using a more specific database name
    users_collection = db.users
    vestidos_collection = db.vestidos
    clientes_collection = db.clientes
    pedidos_collection = db.pedidos
    proveedores_collection = db.proveedores
    materias_primas_collection = db.materias_primas
    print("Conexión a MongoDB Atlas exitosa.")
except Exception as e:
    print(f"Error de conexión a MongoDB: {e}")
    exit(1)

# Flask-Login configuration
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

class User:
    def __init__(self, user_data):
        self.id = str(user_data['_id'])
        self.username = user_data['username']
        self.password_hash = user_data['password_hash']
    
    def is_authenticated(self):
        return True
    
    def is_active(self):
        return True
    
    def is_anonymous(self):
        return False
    
    def get_id(self):
        return self.id
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    try:
        user_data = users_collection.find_one({'_id': ObjectId(user_id)})
        if user_data:
            return User(user_data)
        return None
    except:
        return None

def to_dict(document):
    if not document:
        return None
    document = document.copy()
    document['id'] = str(document['_id'])
    del document['_id']
    
    # Convert datetime fields to ISO format
    for key, value in document.items():
        if isinstance(value, datetime):
            document[key] = value.isoformat()
    
    return document

# ======================
# Authentication Routes
# ======================
@app.route('/')
def home():
    return redirect(url_for('auth'))

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        action = request.form.get('action')
        username = request.form.get('username')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password', '')
        
        if not all([action, username, password]):
            flash('Todos los campos son requeridos', 'danger')
            return redirect(url_for('auth'))
        
        if action == 'register':
            if password != confirm_password:
                flash('Las contraseñas no coinciden', 'danger')
                return redirect(url_for('auth'))
                
            if users_collection.find_one({'username': username}):
                flash('El usuario ya existe', 'danger')
            else:
                new_user = {
                    'username': username,
                    'password_hash': generate_password_hash(password),
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
                users_collection.insert_one(new_user)
                flash('Usuario registrado exitosamente. Por favor inicie sesión.', 'success')
                return redirect(url_for('auth'))
        
        elif action == 'login':
            user_data = users_collection.find_one({'username': username})
            if user_data and check_password_hash(user_data['password_hash'], password):
                user = User(user_data)
                login_user(user)
                flash(f'Bienvenido {username}', 'success')
                return redirect(url_for('dashboard'))
            else:
                flash('Usuario o contraseña incorrectos', 'danger')
    
    return render_template('auth.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Sesión cerrada correctamente', 'success')
    return redirect(url_for('auth'))

# ======================
# Dashboard Routes
# ======================
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/dashboard')
@login_required
def get_dashboard_data():
    # Get stats from MongoDB
    stats = {
        'total_vestidos': vestidos_collection.count_documents({}),
        'total_clientes': clientes_collection.count_documents({}),
        'total_pedidos': pedidos_collection.count_documents({}),
        'pedidos_pendientes': pedidos_collection.count_documents({'estado_pedido': 'pendiente'}),
        'materias_primas': materias_primas_collection.count_documents({}),
        'proveedores': proveedores_collection.count_documents({}),
        'ventas_mensuales': {
            'labels': ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            'valores': [100000, 150000, 200000, 180000, 220000, 250000]
        },
        'ventas_por_tipo': {
            'labels': ['Novia', 'Quinceañera', 'Gala', 'Cóctel'],
            'valores': [500000, 300000, 200000, 150000]
        },
        'tipos_vestido': ['Novia', 'Quinceañera', 'Gala', 'Cóctel'],
        'tallas': ['XS', 'S', 'M', 'L', 'XL']
    }
    return jsonify(stats)

# ======================
# MongoDB Data Explorer
# ======================
@app.route('/mongo_data')
@login_required
def mongo_data():
    # Get sample documents from each collection
    collections_data = {
        'users': list(users_collection.find().limit(5)),
        'vestidos': list(vestidos_collection.find().limit(5)),
        'clientes': list(clientes_collection.find().limit(5)),
        'pedidos': list(pedidos_collection.find().limit(5)),
        'proveedores': list(proveedores_collection.find().limit(5)),
        'materias_primas': list(materias_primas_collection.find().limit(5))
    }
    
    # Convert ObjectId and datetime to strings
    for collection in collections_data.values():
        for doc in collection:
            doc['_id'] = str(doc['_id'])
            for key, value in doc.items():
                if isinstance(value, datetime):
                    doc[key] = value.isoformat()
    
    return render_template('mongo_data.html', 
                         username=current_user.username,
                         collections=collections_data)

# ======================
# CRUD API Endpoints
# ======================

# Vestidos Endpoints
@app.route('/api/vestidos', methods=['GET', 'POST'])
@login_required
def vestidos():
    if request.method == 'GET':
        try:
            vestidos = list(vestidos_collection.find({}))
            return jsonify([to_dict(v) for v in vestidos])
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            required_fields = ['codigo_unico', 'color', 'talla', 'cantidad_inventario', 
                             'tipo_vestido', 'costo_produccion', 'costo_venta']
            
            if not all(field in data for field in required_fields):
                return jsonify({'error': 'Faltan campos requeridos'}), 400
            
            if vestidos_collection.find_one({'codigo_unico': data['codigo_unico']}):
                return jsonify({'error': 'El código de vestido ya existe'}), 400
            
            vestido = {
                'codigo_unico': data['codigo_unico'],
                'color': data['color'],
                'talla': data['talla'],
                'cantidad_inventario': data['cantidad_inventario'],
                'tipo_vestido': data['tipo_vestido'],
                'costo_produccion': data['costo_produccion'],
                'costo_venta': data['costo_venta'],
                'materia_prima_id': data.get('materia_prima_id'),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            result = vestidos_collection.insert_one(vestido)
            vestido['_id'] = result.inserted_id
            return jsonify(to_dict(vestido)), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 400

# ... (similar CRUD endpoints for clientes, pedidos, proveedores, materias_primas)

# ======================
# CRUD Views
# ======================
@app.route('/crud/vestidos')
@login_required
def crud_vestidos():
    return render_template('crud/list_vestidos.html')

@app.route('/crud/clientes')
@login_required
def crud_clientes():
    return render_template('crud/list_clientes.html')

@app.route('/crud/pedidos')
@login_required
def crud_pedidos():
    return render_template('crud/list_pedidos.html')

@app.route('/crud/proveedores')
@login_required
def crud_proveedores():
    return render_template('crud/list_proveedores.html')

@app.route('/crud/materia_prima')
@login_required
def crud_materia_prima():
    return render_template('crud/list_materia_prima.html')

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)