"""
Sirve el frontend (carpeta /frontend).

Las pantallas privadas solo se entregan si hay sesión iniciada.
Así nadie puede abrir dashboard.html sin haber entrado.
"""

from pathlib import Path

from flask import Blueprint, abort, redirect, send_from_directory, session

bp = Blueprint("paginas", __name__)

CARPETA_FRONTEND = Path(__file__).resolve().parent.parent / "frontend"

PAGINAS_PUBLICAS = {"index.html", "login.html", "registro.html"}


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

    return entregar(archivo)
