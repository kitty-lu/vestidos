from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user, UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime

app = Flask(__name__)

# Configuration
app.secret_key = os.environ.get("SECRET_KEY", "minerva_dev_key_fallback")

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL", "sqlite:///vestidos.db")

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL", "sqlite:///minerva.db")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

# User Model
class Usuario(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    firstname = db.Column(db.String(80), nullable=False)
    lastname = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<Usuario {self.email}>'

# Product Model (for future use)
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    precio = db.Column(db.Float, nullable=False)
    categoria = db.Column(db.String(50), nullable=False)  # bodas, coctel, fiesta
    descripcion = db.Column(db.Text)
    imagen_url = db.Column(db.String(255))
    stock_xs = db.Column(db.Integer, default=0)
    stock_s = db.Column(db.Integer, default=0)
    stock_m = db.Column(db.Integer, default=0)
    stock_l = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Producto {self.nombre}>'

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        action = data.get('action')
        
        if action == 'login':
            email = data.get('email')
            password = data.get('password')
            
            user = Usuario.query.filter_by(email=email).first()
            
            if user and check_password_hash(user.password, password):
                login_user(user, remember=data.get('remember', False))
                flash('Sesión iniciada exitosamente', 'success')
                
                if request.is_json:
                    return jsonify({
                        'success': True, 
                        'message': 'Sesión iniciada exitosamente',
                        'redirect': url_for('dashboard')
                    })
                return redirect(url_for('dashboard'))
            else:
                flash('Email o contraseña incorrectos', 'danger')
                if request.is_json:
                    return jsonify({
                        'success': False, 
                        'message': 'Email o contraseña incorrectos'
                    }), 401
                return redirect(url_for('auth'))
                
        elif action == 'register':
            email = data.get('email')
            password = data.get('password')
            firstname = data.get('firstname')
            lastname = data.get('lastname')
            
            # Check if user already exists
            if Usuario.query.filter_by(email=email).first():
                flash('El email ya está registrado', 'danger')
                if request.is_json:
                    return jsonify({
                        'success': False, 
                        'message': 'El email ya está registrado'
                    }), 400
                return redirect(url_for('auth'))
            
            # Create new user
            new_user = Usuario(
                email=email,
                password=generate_password_hash(password),
                firstname=firstname,
                lastname=lastname
            )
            
            try:
                db.session.add(new_user)
                db.session.commit()
                flash('Cuenta creada exitosamente. Puedes iniciar sesión ahora.', 'success')
                
                if request.is_json:
                    return jsonify({
                        'success': True, 
                        'message': 'Cuenta creada exitosamente'
                    })
                return redirect(url_for('auth'))
            except Exception as e:
                db.session.rollback()
                flash('Error al crear la cuenta. Intenta nuevamente.', 'danger')
                if request.is_json:
                    return jsonify({
                        'success': False, 
                        'message': 'Error al crear la cuenta'
                    }), 500
                return redirect(url_for('auth'))
    
    return render_template('auth.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', 
                         firstname=current_user.firstname,
                         lastname=current_user.lastname,
                         email=current_user.email)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Sesión cerrada exitosamente', 'info')
    return redirect(url_for('home'))

# Collection routes
@app.route('/coleccion')
def coleccion():
    return render_template('coleccion.html')

@app.route('/novedades')
def novedades():
    return render_template('novedades.html')

@app.route('/inspiracion')
def inspiracion():
    return render_template('inspiracion.html')

@app.route('/contacto')
def contacto():
    return render_template('contacto.html')

# Product detail routes
@app.route('/producto/<nombre>')
def producto_detalle(nombre):
    template_map = {
        'victoria': 'producto-detalle-victoria.html',
        'rosalia': 'producto-detalle-rosalia.html',
        'aurora': 'producto-detalle-aurora.html',
        'elena': 'producto-detalle-elena.html',
        'clara': 'producto-detalle-clara.html',
        'sofia': 'producto-detalle-sofia.html'
    }
    
    template = template_map.get(nombre.lower())
    if template:
        return render_template(template)
    else:
        flash('Producto no encontrado', 'danger')
        return redirect(url_for('coleccion'))

# API Routes for future product management
@app.route('/api/productos')
def api_productos():
    productos = Producto.query.all()
    productos_list = []
    
    for producto in productos:
        productos_list.append({
            'id': producto.id,
            'nombre': producto.nombre,
            'precio': producto.precio,
            'categoria': producto.categoria,
            'descripcion': producto.descripcion,
            'imagen_url': producto.imagen_url,
            'stock': {
                'xs': producto.stock_xs,
                's': producto.stock_s,
                'm': producto.stock_m,
                'l': producto.stock_l
            }
        })
    
    return jsonify(productos_list)

@app.route('/api/productos/categoria/<categoria>')
def api_productos_categoria(categoria):
    productos = Producto.query.filter_by(categoria=categoria).all()
    productos_list = []
    
    for producto in productos:
        productos_list.append({
            'id': producto.id,
            'nombre': producto.nombre,
            'precio': producto.precio,
            'categoria': producto.categoria,
            'descripcion': producto.descripcion,
            'imagen_url': producto.imagen_url,
            'stock': {
                'xs': producto.stock_xs,
                's': producto.stock_s,
                'm': producto.stock_m,
                'l': producto.stock_l
            }
        })
    
    return jsonify(productos_list)

# Admin routes (for future use)
@app.route('/admin/productos', methods=['POST'])
@login_required
def crear_producto():
    if not current_user.email.endswith('@minerva.com'):  # Simple admin check
        return jsonify({'error': 'No autorizado'}), 403
    
    data = request.get_json()
    
    nuevo_producto = Producto(
        nombre=data.get('nombre'),
        precio=float(data.get('precio')),
        categoria=data.get('categoria'),
        descripcion=data.get('descripcion'),
        imagen_url=data.get('imagen_url'),
        stock_xs=int(data.get('stock_xs', 0)),
        stock_s=int(data.get('stock_s', 0)),
        stock_m=int(data.get('stock_m', 0)),
        stock_l=int(data.get('stock_l', 0))
    )
    
    try:
        db.session.add(nuevo_producto)
        db.session.commit()
        return jsonify({'message': 'Producto creado exitosamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error al crear producto'}), 500

@app.route('/admin/productos/<int:id>', methods=['PUT'])
@login_required
def actualizar_producto(id):
    if not current_user.email.endswith('@minerva.com'):  # Simple admin check
        return jsonify({'error': 'No autorizado'}), 403
    
    producto = Producto.query.get_or_404(id)
    data = request.get_json()
    
    producto.nombre = data.get('nombre', producto.nombre)
    producto.precio = float(data.get('precio', producto.precio))
    producto.categoria = data.get('categoria', producto.categoria)
    producto.descripcion = data.get('descripcion', producto.descripcion)
    producto.imagen_url = data.get('imagen_url', producto.imagen_url)
    producto.stock_xs = int(data.get('stock_xs', producto.stock_xs))
    producto.stock_s = int(data.get('stock_s', producto.stock_s))
    producto.stock_m = int(data.get('stock_m', producto.stock_m))
    producto.stock_l = int(data.get('stock_l', producto.stock_l))
    
    try:
        db.session.commit()
        return jsonify({'message': 'Producto actualizado exitosamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error al actualizar producto'}), 500

@app.route('/admin/productos/<int:id>', methods=['DELETE'])
@login_required
def eliminar_producto(id):
    if not current_user.email.endswith('@minerva.com'):  # Simple admin check
        return jsonify({'error': 'No autorizado'}), 403
    
    producto = Producto.query.get_or_404(id)
    
    try:
        db.session.delete(producto)
        db.session.commit()
        return jsonify({'message': 'Producto eliminado exitosamente'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error al eliminar producto'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

# Variable para evitar que se creen tablas múltiples veces
tables_initialized = False

@app.before_request
def initialize_tables():
    global tables_initialized
    if not tables_initialized:
        db.create_all()
        # Crear productos de ejemplo si no existen
        if Producto.query.count() == 0:
            sample_products = [
                Producto(
                    nombre='Vestido Victoria',
                    precio=389.0,
                    categoria='bodas',
                    descripcion='Elegante vestido de novia con encaje y pedrería',
                    imagen_url='https://noviasselect.es/wp-content/uploads/vestido-novia-victoria-coleccion-mod-XILVINA-1.jpg',
                    stock_xs=3, stock_s=5, stock_m=1, stock_l=0
                ),
                Producto(
                    nombre='Vestido Rosalia',
                    precio=279.0,
                    categoria='coctel',
                    descripcion='Elegante vestido de cóctel con diseño moderno',
                    imagen_url='https://i0.wp.com/laraliz.com/wp-content/uploads/2024/11/EB01782DG-R.webp?fit=500%2C667&ssl=1',
                    stock_xs=2, stock_s=4, stock_m=3, stock_l=1
                ),
                Producto(
                    nombre='Vestido Aurora',
                    precio=459.0,
                    categoria='fiesta',
                    descripcion='Deslumbrante vestido de fiesta con detalles brillantes',
                    imagen_url='https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
                    stock_xs=0, stock_s=6, stock_m=4, stock_l=1
                )
            ]
            for product in sample_products:
                db.session.add(product)
            try:
                db.session.commit()
                print("Sample products created successfully!")
            except Exception as e:
                db.session.rollback()
                print(f"Error creating sample products: {e}")
        
        tables_initialized = True
