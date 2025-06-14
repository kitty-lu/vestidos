from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonfy
from flask_login import login_user, logout_user, login_required, current_user
from models.model import Usuario
from models.base import session_factory

auth_bp = Blueprint('auth', __name__)
dashboard_bp = Blueprint('dashboard', __name__)

@auth_bp.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'login':
            username = request.form.get('username')
            password = request.form.get('password')
            
            session = session_factory()
            user = session.query(Usuario).filter_by(username=username).first()
            session.close()
            
            if user and user.check_password(password):
                login_user(user)
                return redirect(url_for('dashboard.dashboard'))
            else:
                flash('Usuario o contraseña incorrectos', 'error')
        
        elif action == 'register':
            username = request.form.get('username')
            password = request.form.get('password')
            confirm_password = request.form.get('confirm_password')
            
            if password != confirm_password:
                flash('Las contraseñas no coinciden', 'error')
                return redirect(url_for('auth.auth'))
                
            session = session_factory()
            existing_user = session.query(Usuario).filter_by(username=username).first()
            
            if existing_user:
                flash('El nombre de usuario ya existe', 'error')
                session.close()
                return redirect(url_for('auth.auth'))
                
            new_user = Usuario(username=username)
            new_user.set_password(password)
            
            session.add(new_user)
            session.commit()
            session.close()
            
            flash('Cuenta creada exitosamente. Por favor inicia sesión.', 'success')
            return redirect(url_for('auth.auth'))
    
    return render_template('auth.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.auth'))

@dashboard_bp.route('/dashboard')
@login_required
def dashboard():
    # Aquí puedes cargar los datos para el dashboard
    session = session_factory()
    
    # Ejemplo de consulta para los gráficos
    pedidos = session.execute("""
        SELECT p.id_pedido, p.fecha_pedido, p.estado_pedido, c.nombre as cliente_nombre, 
               v.costo_venta as monto, v.tipo_vestido, v.talla, v.cantidad_inventario,
               c.tipo as cliente_tipo
        FROM pedidos p
        JOIN clientes c ON p.id_cliente = c.id_cliente
        JOIN vestidos v ON p.vestido_id = v.codigo_unico
    """).fetchall()
    
    session.close()
    
    # Convertir a formato adecuado para el dashboard.js
    datos_pedidos = [dict(pedido) for pedido in pedidos]
    
    return render_template('dashboard.html', datos_pedidos=datos_pedidos)

@dashboard_bp.route('/api/pedidos')
@login_required
def api_pedidos():
    session = session_factory()
    
    pedidos = session.execute("""
        SELECT p.id_pedido, p.fecha_pedido, p.estado_pedido, c.nombre as cliente_nombre, 
               v.costo_venta as monto, v.tipo_vestido, v.talla, v.cantidad_inventario,
               c.tipo as cliente_tipo
        FROM pedidos p
        JOIN clientes c ON p.id_cliente = c.id_cliente
        JOIN vestidos v ON p.vestido_id = v.codigo_unico
    """).fetchall()
    
    session.close()
    
    return jsonify([dict(pedido) for pedido in pedidos])