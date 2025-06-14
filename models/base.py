# models/base.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
import os

# Configuración de PostgreSQL
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:12345@localhost:5432/vestidos')

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
session_factory = scoped_session(SessionLocal)

Base = declarative_base()

def init_db():
    # Importa los modelos después de definir Base
    from models.model import Usuario, Proveedor, MateriaPrima, Vestido, Cliente, Pedido, Pago, Factura
    Base.metadata.create_all(bind=engine)
# Verificación de conexión
try:
    connection = engine.connect()
    print("✅ Conexión a PostgreSQL exitosa!")
    connection.close()
except Exception as e:
    print(f"❌ Error de conexión a PostgreSQL: {str(e)}")