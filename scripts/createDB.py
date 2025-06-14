from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

# Conexión al servidor de PostgreSQL (base por defecto: postgres)
engine = create_engine('postgresql+psycopg2://postgres:123456@localhost:5432/postgres')

conn = engine.connect()
dbname = "vestidos"

try:
    conn.execution_options(isolation_level="AUTOCOMMIT").execute(text(f"CREATE DATABASE {dbname}"))
    print(f"Base de datos '{dbname}' creada con éxito.")
except ProgrammingError:
    print(f"La base de datos '{dbname}' ya existe o hay un error.")
finally:
    conn.close()

from models.base import engine, Base
from models.model import Usuario

def create_tables():
    Base.metadata.create_all(engine)
    print("Tablas creadas exitosamente!")

if __name__ == '__main__':
    create_tables()