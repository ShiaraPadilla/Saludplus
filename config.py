"""
Configuración de Salud+.

Los valores se leen de variables de entorno:
  · En tu computador: del archivo .env (copia .env.example).
  · En Render: de la pestaña "Environment" del servicio.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def activado(nombre, por_defecto="0"):
    return os.getenv(nombre, por_defecto).strip().lower() in ("1", "true", "si", "sí", "yes")


CLAVE_POR_DEFECTO = "cambia-esta-clave-en-el-archivo-env"


class Config:

    DEBUG = activado("FLASK_DEBUG", "1")

    # Clave para firmar la cookie de sesión. ¡Cámbiala!
    SECRET_KEY = os.getenv("SECRET_KEY", CLAVE_POR_DEFECTO)

    # ---------- MySQL ----------
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "saludplus")

    # Conexión cifrada (obligatoria en Aiven y otros MySQL en la nube)
    DB_SSL = activado("DB_SSL")
    # Certificado CA: ruta a un archivo .pem o el texto completo del certificado
    DB_SSL_CA = os.getenv("DB_SSL_CA", "").strip()

    # Crea las tablas que falten al arrancar (útil en Render, que no tiene consola gratis)
    CREAR_TABLAS_AL_INICIAR = activado("CREAR_TABLAS_AL_INICIAR")

    # Crea los usuarios de prueba (admin y usuario) con datos de ejemplo
    # si todavía no existen. Ver backend/datos_ejemplo.py
    CARGAR_DATOS_EJEMPLO = activado("CARGAR_DATOS_EJEMPLO")

    # ---------- Sesión ----------
    PERMANENT_SESSION_LIFETIME = timedelta(days=30)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = activado("SESSION_COOKIE_SECURE")   # 1 con HTTPS (Render)

    # La app está detrás de un proxy (Render): confiar en sus cabeceras
    DETRAS_DE_PROXY = activado("DETRAS_DE_PROXY")

    MAX_CONTENT_LENGTH = 16 * 1024


def revisar_configuracion(config):
    """Evita publicar la app con una configuración insegura."""

    if not config["DEBUG"] and config["SECRET_KEY"] in ("", CLAVE_POR_DEFECTO):
        raise RuntimeError(
            "Falta SECRET_KEY. En producción define la variable de entorno SECRET_KEY "
            "con un texto largo y secreto."
        )
