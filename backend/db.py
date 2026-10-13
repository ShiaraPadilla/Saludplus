"""
Conexión a MySQL con PyMySQL.

Se abre una conexión por petición (flask.g) y se cierra al terminar.
Las consultas usan parámetros %s para evitar inyección SQL.
Todas las fechas y horas se manejan en UTC.
"""

import logging
import os
import tempfile

import pymysql
import pymysql.cursors
from flask import current_app, g

log = logging.getLogger(__name__)

_ruta_ca_temporal = None


def _ruta_certificado(valor):
    """
    DB_SSL_CA puede ser una ruta a un archivo .pem o el texto del
    certificado (lo más cómodo en Render: se pega en la variable).
    """

    global _ruta_ca_temporal

    if not valor:
        return None

    if "BEGIN CERTIFICATE" in valor:

        if _ruta_ca_temporal is None:

            texto = valor.replace("\\n", "\n")

            archivo = tempfile.NamedTemporaryFile(
                "w", suffix=".pem", delete=False, encoding="utf-8"
            )
            archivo.write(texto)
            archivo.close()

            _ruta_ca_temporal = archivo.name

        return _ruta_ca_temporal

    if os.path.exists(valor):
        return valor

    raise RuntimeError("DB_SSL_CA no es un archivo existente ni un certificado válido.")


def parametros_conexion(config, con_base_de_datos=True):
    """Parámetros para pymysql.connect a partir de la configuración."""

    parametros = {
        "host": config["DB_HOST"],
        "port": int(config["DB_PORT"]),
        "user": config["DB_USER"],
        "password": config["DB_PASSWORD"],
        "charset": "utf8mb4",
        "cursorclass": pymysql.cursors.DictCursor,
        "autocommit": False,
        "connect_timeout": 10,
        # Todo en UTC: el servidor en la nube no está en hora de Colombia
        "init_command": "SET time_zone = '+00:00'",
    }

    if con_base_de_datos:
        parametros["database"] = config["DB_NAME"]

    if config.get("DB_SSL"):

        ruta_ca = _ruta_certificado(config.get("DB_SSL_CA", ""))

        if ruta_ca:
            # Cifrado + verificación del servidor (certificado y nombre)
            parametros["ssl"] = {"ca": ruta_ca}
        else:
            # Cifrado sin verificar el certificado (mejor que sin cifrar)
            log.warning("DB_SSL activo sin DB_SSL_CA: la conexión se cifra sin verificar el servidor.")
            parametros["ssl"] = {"check_hostname": False}

    return parametros


def conectar(config, con_base_de_datos=True):

    return pymysql.connect(**parametros_conexion(config, con_base_de_datos))


def obtener_db():

    if "db" not in g:
        g.db = conectar(current_app.config)

    return g.db


def cerrar_db(_error=None):

    conexion = g.pop("db", None)

    if conexion is not None:
        conexion.close()


def init_app(app):

    app.teardown_appcontext(cerrar_db)


def consultar(sql, parametros=(), uno=False):
    """SELECT: devuelve una lista de diccionarios (o uno solo)."""

    with obtener_db().cursor() as cursor:
        cursor.execute(sql, parametros)
        return cursor.fetchone() if uno else cursor.fetchall()


def ejecutar(sql, parametros=()):
    """INSERT / UPDATE / DELETE con commit. Devuelve (id_insertado, filas_afectadas)."""

    conexion = obtener_db()

    try:
        with conexion.cursor() as cursor:
            cursor.execute(sql, parametros)
            conexion.commit()
            return cursor.lastrowid, cursor.rowcount

    except Exception:
        conexion.rollback()
        raise
