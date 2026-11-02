"""
Sirve el frontend (carpeta /frontend).

Las pantallas privadas solo se entregan si hay sesión iniciada.
Así nadie puede abrir dashboard.html sin haber entrado.
"""

from pathlib import Path

from flask import Blueprint, abort, redirect, send_from_directory, session

from .db import consultar

bp = Blueprint("paginas", __name__)

CARPETA_FRONTEND = Path(__file__).resolve().parent.parent / "frontend"

PAGINAS_PUBLICAS = {"index.html", "login.html", "registro.html"}

# Pantallas del adulto mayor (el cuidador usa panel-cuidador.html)
PAGINAS_ADULTO = {
    "dashboard.html", "medicamentos.html", "citas.html", "bienestar.html",
    "emocional.html", "historial.html", "informes.html",
}


def rol_actual():

    usuario = consultar("SELECT rol FROM usuarios WHERE id = %s", (session["usuario_id"],), uno=True)

    return usuario["rol"] if usuario else None


def entregar(archivo):

    respuesta = send_from_directory(CARPETA_FRONTEND, archivo)

    # HTML, JS y CSS siempre frescos mientras se desarrolla
    if archivo.endswith((".html", ".js", ".css")):
        respuesta.headers["Cache-Control"] = "no-cache"

    return respuesta


@bp.get("/")
def inicio():

    return entregar("index.html")


@bp.get("/<path:archivo>")
def archivo_frontend(archivo):

    if archivo.startswith("api/"):
        abort(404)

    if archivo.endswith(".html"):

        con_sesion = bool(session.get("usuario_id"))

        if archivo not in PAGINAS_PUBLICAS and not con_sesion:
            return redirect("/login.html")

        if archivo in ("login.html", "registro.html") and con_sesion:
            return redirect("/dashboard.html")

        if con_sesion and archivo not in PAGINAS_PUBLICAS:

            rol = rol_actual()

            if rol is None:
                session.clear()
                return redirect("/login.html")

            # El panel de administración solo para el rol admin
            if archivo == "admin.html" and rol != "admin":
                return redirect("/dashboard.html")

            # El cuidador tiene su propio panel (solo lectura)
            if rol == "cuidador" and archivo in PAGINAS_ADULTO:
                return redirect("/panel-cuidador.html")

            if archivo == "panel-cuidador.html" and rol != "cuidador":
                return redirect("/dashboard.html")

    return entregar(archivo)


@bp.get("/llamada/<int:llamada_id>")
def pantalla_llamada(llamada_id):
    """Pantalla de la videollamada (la abre la notificación push)."""

    if not session.get("usuario_id"):
        return redirect("/login.html")

    return entregar("llamada.html")
