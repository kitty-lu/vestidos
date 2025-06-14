from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, send_from_directory
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime

# Configuración mejorada de PostgreSQL
def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname="vestidos",
            user="postgres",
            password="12345",
            host="localhost",
            port="5432",
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        print(f"Error de conexión a PostgreSQL: {e}")
        return None

# O usando SQLAlchemy (recomendado)
DATABASE_URL = "postgresql://postgres:12345@localhost:5432/vestidos"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev_key_fallback")

# Configuración para manejar correctamente los templates
app.template_folder = 'templates'
app.static_folder = 'static'
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

# Flask-Login configuration
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth'

class User:
    def __init__(self, user_data):
        self.id = user_data['id']
        self.username = user_data['username']
        self.password_hash = user_data['password']
    
    def is_authenticated(self):
        return True
    
    def is_active(self):
        return True
    
    def is_anonymous(self):
        return False
    
    def get_id(self):
        return str(self.id)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM usuarios WHERE id = :id"), {'id': user_id})
            user_data = result.mappings().first()
            if user_data:
                return User(user_data)
        return None
    except Exception as e:
        print(f"Error loading user: {e}")
        return None

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
        
        try:
            if action == 'register':
                if password != confirm_password:
                    flash('Las contraseñas no coinciden', 'danger')
                    return redirect(url_for('auth'))
                    
                with engine.connect() as conn:
                    # Verificar si el usuario ya existe
                    result = conn.execute(
                        text("SELECT id FROM usuarios WHERE username = :username"),
                        {'username': username}
                    )
                    if result.fetchone():
                        flash('El usuario ya existe', 'danger')
                        return redirect(url_for('auth'))
                    
                    # Crear nuevo usuario
                    conn.execute(
                        text("""
                            INSERT INTO usuarios (username, password, created_at)
                            VALUES (:username, :password, NOW())
                        """),
                        {
                            'username': username,
                            'password': generate_password_hash(password)
                        }
                    )
                    conn.commit()
                
                flash('Usuario registrado exitosamente. Por favor inicie sesión.', 'success')
                return redirect(url_for('auth'))
            
            elif action == 'login':
                with engine.connect() as conn:
                    result = conn.execute(
                        text("SELECT * FROM usuarios WHERE username = :username"),
                        {'username': username}
                    )
                    user_data = result.mappings().first()
                
                if user_data and check_password_hash(user_data['password'], password):
                    user = User(user_data)
                    login_user(user)
                    flash(f'Bienvenido {username}', 'success')
                    return redirect(url_for('dashboard'))
                else:
                    flash('Usuario o contraseña incorrectos', 'danger')
        
        except Exception as e:
            print(f"Error en autenticación: {e}")
            flash('Ocurrió un error al procesar la solicitud', 'danger')
    
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

@app.route('/api/pedido')
@login_required
def api_pedido():
    try:
        with engine.connect() as conn:
            # Consulta principal adaptada a tu estructura exacta
            query = text("""
                SELECT 
                    p.id_pedido, 
                    p.fecha_pedido, 
                    p.estado_pedido, 
                    c.nombre as cliente_nombre, 
                    c.tipo as cliente_tipo,
                    v.codigo_unico, 
                    v.tipo_vestido, 
                    v.talla, 
                    v.cantidad_inventario, 
                    p.monto
                FROM pedido p
                JOIN cliente c ON p.id_cliente = c.id_cliente
                JOIN vestidos v ON p.id_vestido = v.id_vestido
            """)
            
            result = conn.execute(query)
            pedidos = [dict(row) for row in result.mappings()]
            
            if not pedidos:
                return jsonify({
                    'message': 'No hay pedidos registrados',
                    'data': [],
                    'status': 'success'
                })
            
            return jsonify({
                'data': pedidos,
                'status': 'success'
            })
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'message': 'Error al consultar la base de datos',
            'status': 'error'
        }), 500


@app.route('/api/dashboard')
@login_required
def get_dashboard_data():
    try:
        with engine.connect() as conn:
            # Obtener estadísticas básicas
            stats = {
                'total_vestidos': conn.execute(text("SELECT COUNT(*) FROM vestidos")).scalar(),
                'total_clientes': conn.execute(text("SELECT COUNT(*) FROM cliente")).scalar(),
                'total_pedidos': conn.execute(text("SELECT COUNT(*) FROM pedido")).scalar(),
                'pedidos_pendientes': conn.execute(
                    text("SELECT COUNT(*) FROM pedido WHERE estado_pedido = 'Pendiente'")
                ).scalar(),
                'materias_primas': conn.execute(text("SELECT COUNT(*) FROM materia_prima")).scalar(),
                'proveedores': conn.execute(text("SELECT COUNT(*) FROM proveedores")).scalar()
            }
            
            # Obtener datos para gráficos
            # Ventas mensuales (últimos 6 meses)
            ventas_mensuales = conn.execute(text("""
                SELECT 
                    TO_CHAR(fecha_pedido, 'YYYY-MM') as mes,
                    SUM(v.costo_venta) as total
                FROM pedido p
                JOIN vestidos v ON p.vestido_id = v.codigo_unico
                WHERE fecha_pedido >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY mes
                ORDER BY mes
            """)).fetchall()
            
            stats['ventas_mensuales'] = {
                'labels': [row[0] for row in ventas_mensuales],
                'valores': [float(row[1]) for row in ventas_mensuales]
            }
            
            # Ventas por tipo de vestido
            ventas_por_tipo = conn.execute(text("""
                SELECT 
                    tipo_vestido,
                    SUM(costo_venta) as total
                FROM vestidos
                GROUP BY tipo_vestido
            """)).fetchall()
            
            stats['ventas_por_tipo'] = {
                'labels': [row[0] for row in ventas_por_tipo],
                'valores': [float(row[1]) for row in ventas_por_tipo]
            }
            
            # Tipos de vestido y tallas disponibles
            stats['tipos_vestido'] = [
                row[0] for row in conn.execute(
                    text("SELECT DISTINCT tipo_vestido FROM vestidos")
                ).fetchall()
            ]
            
            stats['tallas'] = [
                row[0] for row in conn.execute(
                    text("SELECT DISTINCT talla FROM vestidos ORDER BY talla")
                ).fetchall()
            ]
        
        return jsonify(stats)
    except Exception as e:
        print(f"Error al obtener datos del dashboard: {e}")
        return jsonify({'error': str(e)}), 500




# ======================
# CRUD API Endpoints
# ======================

# Vestidos Endpoints
@app.route('/api/vestidos', methods=['GET', 'POST'])
@login_required
def vestidos():
    if request.method == 'GET':
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT * FROM vestidos"))
                vestidos = [dict(row) for row in result.mappings()]
            return jsonify(vestidos)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.json
            required_fields = ['codigo_unico', 'color', 'talla', 'cantidad_inventario', 
                              'tipo_vestido', 'costo_produccion', 'costo_venta']
            
            if not all(field in data for field in required_fields):
                return jsonify({'error': 'Faltan campos requeridos'}), 400
            
            with engine.connect() as conn:
                # Verificar si el código ya existe
                exists = conn.execute(
                    text("SELECT 1 FROM vestidos WHERE codigo_unico = :codigo"),
                    {'codigo': data['codigo_unico']}
                ).fetchone()
                
                if exists:
                    return jsonify({'error': 'El código de vestido ya existe'}), 400
                
                # Insertar nuevo vestido
                conn.execute(
                    text("""
                        INSERT INTO vestidos (
                            codigo_unico, color, talla, cantidad_inventario,
                            tipo_vestido, costo_produccion, costo_venta, materia_prima_id
                        ) VALUES (
                            :codigo, :color, :talla, :cantidad, :tipo, 
                            :costo_prod, :costo_venta, :materia_prima
                        )
                    """),
                    {
                        'codigo': data['codigo_unico'],
                        'color': data['color'],
                        'talla': data['talla'],
                        'cantidad': data['cantidad_inventario'],
                        'tipo': data['tipo_vestido'],
                        'costo_prod': data['costo_produccion'],
                        'costo_venta': data['costo_venta'],
                        'materia_prima': data.get('materia_prima_id')
                    }
                )
                conn.commit()
                
                # Obtener el vestido recién creado
                result = conn.execute(
                    text("SELECT * FROM vestidos WHERE codigo_unico = :codigo"),
                    {'codigo': data['codigo_unico']}
                )
                vestido = dict(result.mappings().first())
            
            return jsonify(vestido), 201
        except Exception as e:
            return jsonify({'error': str(e)}), 400










@app.route('/api/debug/db-check')
def debug_db_check():
    try:
        with engine.connect() as conn:
            # Verificar tablas
            tables = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)).fetchall()
            
            # Verificar relaciones
            relations = conn.execute(text("""
                SELECT
                    tc.table_name, 
                    kcu.column_name, 
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
            """)).fetchall()
            
            return jsonify({
                'tables': [t[0] for t in tables],
                'relations': [dict(r) for r in relations],
                'status': 'success'
            })
            
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500
    



















# ======================
# CRUD Views
# ======================
@app.route('/crud/vestidos')
@login_required
def crud_vestidos():
    return render_template('crud/list_vestidos.html')

@app.route('/crud/cliente')
@login_required
def crud_clientes():
    return render_template('crud/list_clientes.html')

@app.route('/crud/pedido')
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

# Manejo de errores
@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('errors/500.html'), 500

@app.route('/favicon.ico')
def favicon():
    try:
        return send_from_directory(
            os.path.join(app.root_path, 'static', 'images'),
            'favicon.ico', 
            mimetype='image/vnd.microsoft.icon'
        )
    except:
        # Si no existe el favicon, devolver un 404 limpio
        return "", 404
    
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)