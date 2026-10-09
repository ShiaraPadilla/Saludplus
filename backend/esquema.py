"""
Crea la base de datos (si se puede) y las tablas que falten,
ejecutando database/saludplus.sql.

Lo usan:
  · iniciar_bd.py   (a mano, en tu computador)
  · crear_app()     (al arrancar, si CREAR_TABLAS_AL_INICIAR=1)

Es seguro ejecutarlo varias veces: usa CREATE TABLE IF NOT EXISTS.
"""

import re
from pathlib import Path

import pymysql

from .db import conectar

ARCHIVO_SQL = Path(__file__).resolve().parent.parent / "database" / "saludplus.sql"


def sentencias_de_tablas():
    """
    Lee el script, quita comentarios y las líneas CREATE DATABASE / USE
    (la base se toma de DB_NAME, porque en la nube suele tener otro nombre).
    """

    lineas = [
        linea for linea in ARCHIVO_SQL.read_text(encoding="utf-8").splitlines()
        if not linea.strip().startswith("--")
    ]

    sentencias = [s.strip() for s in "\n".join(lineas).split(";") if s.strip()]

    return [
        s for s in sentencias
        if not re.match(r"^(CREATE\s+DATABASE|USE)\b", s, re.IGNORECASE)
    ]


def crear_esquema(config):
    """Devuelve la lista de tablas que existen al terminar."""

    nombre_bd = config["DB_NAME"]

    try:
        conexion = conectar(config)

    except pymysql.err.OperationalError as error:

        # 1049 = la base de datos no existe → intentamos crearla
        if error.args and error.args[0] == 1049:

            sin_bd = conectar(config, con_base_de_datos=False)

            with sin_bd:
                with sin_bd.cursor() as cursor:
                    cursor.execute(
                        "CREATE DATABASE IF NOT EXISTS `" + nombre_bd.replace("`", "") + "` "
                        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )

            conexion = conectar(config)

        else:
            raise

    with conexion:

        with conexion.cursor() as cursor:

            for sentencia in sentencias_de_tablas():
                cursor.execute(sentencia)

            conexion.commit()

            cursor.execute("SHOW TABLES")

            return sorted(list(fila.values())[0] for fila in cursor.fetchall())
