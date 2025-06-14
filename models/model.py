from sqlalchemy import Column, Integer, String, ForeignKey, Date, Numeric, Text, DateTime, Float, Boolean
from sqlalchemy.orm import relationship, declarative_base
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime

Base = declarative_base()

class Usuario(Base, UserMixin):
    __tablename__ = 'usuarios'

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def get_id(self):
        return str(self.id)

# Resto de tus modelos (Proveedor, MateriaPrima, Vestido, etc.) permanecen igual
class proveedor(Base):
    __tablename__ = 'proveedores'
    
    id_proveedor = Column(Integer, primary_key=True)
    nombres = Column(String(100), nullable=False)
    direccion = Column(String(200))
    fecha_entrega = Column(Date)
    tipo_proveedor = Column(String(50))
    telefono = Column(String(20))
    
    materias_primas = relationship("MateriaPrima", back_populates="proveedor")

class materiaprima(Base):
    __tablename__ = 'materia_prima'
    
    id_materia_prima = Column(Integer, primary_key=True)
    id_proveedor = Column(Integer, ForeignKey('proveedores.id_proveedor'))
    cantidad = Column(Integer)
    tipo = Column(String(50))
    
    proveedor = relationship("Proveedor", back_populates="materias_primas")
    vestidos = relationship("Vestido", back_populates="materia_prima")

class vestido(Base):
    __tablename__ = 'vestidos'
    
    codigo_unico = Column(String(50), primary_key=True)
    color = Column(String(50))
    talla = Column(String(10))  # Asumo que 'taila' en el diagrama es un error y debería ser 'talla'
    cantidad_inventario = Column(Integer)
    tipo_vestido = Column(String(50))
    costo_produccion = Column(Numeric(10, 2))
    costo_venta = Column(Numeric(10, 2))
    materia_prima_id = Column(Integer, ForeignKey('materia_prima.id_materia_prima'))
    
    materia_prima = relationship("MateriaPrima", back_populates="vestidos")
    pedidos = relationship("Pedido", back_populates="vestido")

class cliente(Base):
    __tablename__ = 'cliente'
    
    id_cliente = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    nit = Column(String(20))  # A2 nit de la factura
    
    pedidos = relationship("Pedido", back_populates="cliente")
    facturas = relationship("Factura", back_populates="cliente")

class Pedido(Base):
    __tablename__ = 'pedido'  # Nombre exacto de la tabla
    
    id_pedido = Column(Integer, primary_key=True)
    fecha_pedido = Column(DateTime, nullable=False)
    id_vestido = Column(Integer, ForeignKey('vestidos.id_vestido'), nullable=False)
    id_cliente = Column(Integer, ForeignKey('cliente.id_cliente'), nullable=False)
    monto = Column(Numeric(10, 3), nullable=False)
    estado_pedido = Column(String(15), nullable=False)
    nro_total_articulos = Column(Integer, nullable=False)
    
    cliente = relationship("Cliente", back_populates="pedidos")
    vestido = relationship("Vestido", back_populates="pedidos")
    pagos = relationship("Pago", back_populates="pedido")

class pago(Base):
    __tablename__ = 'pago'
    
    id_pago = Column(Integer, primary_key=True)
    fecha_pago = Column(DateTime)
    estado_pago = Column(String(50))
    monto_total = Column(Numeric(10, 2))
    tipo_pago = Column(String(50))
    id_pedido = Column(Integer, ForeignKey('pedidos.id_pedido'))
    
    pedido = relationship("Pedido", back_populates="pagos")
    facturas = relationship("Factura", back_populates="pago")

class factura(Base):
    __tablename__ = 'factura'
    
    id_factura = Column(Integer, primary_key=True)
    id_pago = Column(Integer, ForeignKey('pagos.id_pago'))
    nit = Column(String(20))  # A2 nit
    fecha_factura = Column(DateTime)
    nro_factura = Column(String(50))
    id_cliente = Column(Integer, ForeignKey('clientes.id_cliente'))
    
    pago = relationship("Pago", back_populates="facturas")
    cliente = relationship("Cliente", back_populates="facturas")