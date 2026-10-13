"""
Crea la base de datos y las tablas de Salud+ usando los datos de
conexión del archivo .env (sirve para XAMPP y para Aiven).

Uso:
    python iniciar_bd.py
"""

import pymysql

from backend.esquema import crear_esquema
from config import Config


def main():

    config = {k: getattr(Config, k) for k in dir(Config) if k.isupper()}

    print(f"Conectando a MySQL en {config['DB_HOST']}:{config['DB_PORT']} como {config['DB_USER']}...")

    try:
        tablas = crear_esquema(config)

    except pymysql.err.OperationalError as error:
        print("\n❌ No se pudo conectar a MySQL.")
        print("   · En XAMPP: pulsa Start en MySQL.")
        print("   · En Aiven: revisa host, puerto, usuario, contraseña y DB_SSL=1.")
        print("   Detalle:", error)
        return

    print(f"✅ Base de datos '{config['DB_NAME']}' lista con {len(tablas)} tablas:")
    print("   " + ", ".join(tablas))


if __name__ == "__main__":
    main()
