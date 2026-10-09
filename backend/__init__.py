"""
Fábrica de la aplicación Flask de Salud+.
"""

import logging

import pymysql
from flask import Flask, request
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config, revisar_configuracion

from . import db
from .utilidades import error, ok


def crear_app():

    app = Flask(__name__, static_folder=None)

    app.config.from_object(Config)

    revisar_configuracion(app.config)

    logging.basicConfig(level=logging.INFO)

    # En Render la app está detrás de un proxy HTTPS
    if app.config["DETRAS_DE_PROXY"]:
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    db.init_app(app)


    # ---------- Crear tablas al arrancar (opcional) ----------

    if app.config["CREAR_TABLAS_AL_INICIAR"]:

        from .esquema import crear_esquema

        try:
            tablas = crear_esquema(app.config)
            app.logger.info("Base de datos lista: %d tablas.", len(tablas))
        except Exception as e:
            # La app arranca igual; /api/salud mostrará el problema
            app.logger.error("No se pudieron crear las tablas: %s", e)


    # ---------- Rutas ----------

    from .auth import bp as auth_bp
    from .medicamentos import bp as medicamentos_bp
    from .paginas import bp as paginas_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(medicamentos_bp)
    app.register_blueprint(paginas_bp)      # siempre de último (atrapa todo lo demás)


    # ---------- Estado del servicio (Render lo consulta) ----------

    @app.get("/api/salud")
    def salud():

        try:
            db.consultar("SELECT 1 AS uno", uno=True)
            estado_bd = "ok"
        except Exception as e:
            app.logger.error("Base de datos no disponible: %s", e)
            estado_bd = "sin conexión"

        # Siempre 200: si la base falla, la web sigue respondiendo
        return ok({"servicio": "Salud+", "base_de_datos": estado_bd})


    # ---------- Errores en formato JSON para la API ----------

    def es_api():
        return request.path.startswith("/api/")

    @app.errorhandler(pymysql.err.OperationalError)
    def error_bd(e):
        app.logger.error("Error de base de datos: %s", e)
        return error(
            "No se pudo conectar con la base de datos. Intenta de nuevo en un momento.",
            503,
        )

    @app.errorhandler(404)
    def no_encontrado(e):
        if es_api():
            return error("Recurso no encontrado.", 404)
        return e

    @app.errorhandler(405)
    def metodo_no_permitido(e):
        if es_api():
            return error("Método no permitido.", 405)
        return e

    @app.errorhandler(413)
    def muy_grande(e):
        return error("La información enviada es demasiado grande.", 413)

    @app.errorhandler(500)
    def error_interno(e):
        if es_api():
            return error("Ocurrió un error en el servidor. Intenta de nuevo.", 500)
        return e


    # ---------- Seguridad básica en todas las respuestas ----------

    @app.after_request
    def cabeceras(respuesta):
        respuesta.headers["X-Content-Type-Options"] = "nosniff"
        respuesta.headers["X-Frame-Options"] = "SAMEORIGIN"
        respuesta.headers["Referrer-Policy"] = "same-origin"
        if es_api():
            respuesta.headers["Cache-Control"] = "no-store"
        return respuesta

    return app
