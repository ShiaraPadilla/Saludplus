"""
Crea los usuarios de prueba con datos de ejemplo.

Uso:
    python cargar_datos_ejemplo.py               (solo si no existen)
    python cargar_datos_ejemplo.py --reiniciar   (los borra y los crea de nuevo
                                                 con fechas actualizadas a hoy)

Credenciales:
    Administrador:   admin@saludplus.com  /  Admin2026*
    Usuario regular: maria@saludplus.com  /  Maria2026*
    Usuario regular: jorge@saludplus.com  /  Jorge2026*
"""

import sys

from backend.datos_ejemplo import cargar_datos_ejemplo
from backend.esquema import crear_esquema
from config import Config


def main():

    config = {k: getattr(Config, k) for k in dir(Config) if k.isupper()}

    crear_esquema(config)

    print(cargar_datos_ejemplo(config, reiniciar="--reiniciar" in sys.argv))


if __name__ == "__main__":
    main()
