"""
Autenticación: registro, inicio y cierre de sesión, perfil.

Rutas:
    POST /api/auth/registro
    POST /api/auth/login
    POST /api/auth/logout
    GET  /api/auth/yo
    PUT  /api/auth/perfil
"""

import time
from functools import wraps

import pymysql
from flask import Blueprint, g, session
from werkzeug.security import check_password_hash, generate_password_hash

from .db import consultar, ejecutar
from .utilidades import datos_json, error, ok, serializar, texto
from .validaciones import (
    ErrorValidacion,
    requerir,
    validar_contrasena,
    validar_correo,
    validar_nombre,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# Hash de relleno: si el correo no existe igual se verifica una
# contraseña, para que la respuesta tarde lo mismo.
HASH_FALSO = generate_password_hash("contrasena-de-relleno")

# Límite simple de intentos fallidos por correo (en memoria)
INTENTOS_MAXIMOS = 5
BLOQUEO_SEGUNDOS = 5 * 60
_intentos_fallidos = {}


# =========================================================
#   DECORADOR: exige sesión iniciada
# =========================================================

def login_requerido(funcion):

    @wraps(funcion)
    def envoltura(*args, **kwargs):

        usuario_id = session.get("usuario_id")

        if not usuario_id:
            return error("Tu sesión terminó. Inicia sesión de nuevo.", 401, sesion=False)

        usuario = consultar(
            "SELECT id, nombre, correo, rol, creado_en FROM usuarios WHERE id = %s",
            (usuario_id,),
            uno=True,
        )

        if usuario is None:
            session.clear()
            return error("Tu sesión terminó. Inicia sesión de nuevo.", 401, sesion=False)

        g.usuario = usuario

        return funcion(*args, **kwargs)

    return envoltura


def admin_requerido(funcion):
    """Solo para usuarios con rol 'admin'."""

    @wraps(funcion)
    @login_requerido
    def envoltura(*args, **kwargs):

        if g.usuario.get("rol") != "admin":
            return error("No tienes permiso para ver esta sección.", 403)

        return funcion(*args, **kwargs)

    return envoltura


def usuario_publico(usuario):
    return serializar({
        "id": usuario["id"],
        "nombre": usuario["nombre"],
        "correo": usuario["correo"],
        "rol": usuario.get("rol", "usuario"),
        "creado_en": usuario["creado_en"],
    })


def respuesta_validacion(e):
    return error(e.mensaje, 400, campo=e.campo)


# =========================================================
#   REGISTRO
# =========================================================

@bp.post("/registro")
def registro():

    datos = datos_json()

    nombre = texto(datos, "nombre")
    correo = texto(datos, "correo").lower()
    contrasena = datos.get("contrasena") or ""
    confirmar = datos.get("confirmar") or ""

    try:
        validar_nombre(nombre)
        validar_correo(correo)
        validar_contrasena(contrasena)
        requerir(confirmar == contrasena, "confirmar", "Las contraseñas no coinciden.")
    except ErrorValidacion as e:
        return respuesta_validacion(e)

    existe = consultar("SELECT id FROM usuarios WHERE correo = %s", (correo,), uno=True)

    if existe:
        return error("Ya existe una cuenta con este correo. Inicia sesión.", 409, campo="correo")

    try:
        usuario_id, _ = ejecutar(
            "INSERT INTO usuarios (nombre, correo, clave_hash) VALUES (%s, %s, %s)",
            (nombre, correo, generate_password_hash(contrasena)),
        )
    except pymysql.err.IntegrityError:
        # Dos registros al mismo tiempo con el mismo correo
        return error("Ya existe una cuenta con este correo. Inicia sesión.", 409, campo="correo")

    ejecutar("INSERT INTO preferencias (usuario_id) VALUES (%s)", (usuario_id,))

    return ok({"mensaje": "Cuenta creada correctamente."}, 201)


# =========================================================
#   INICIAR SESIÓN
# =========================================================

@bp.post("/login")
def login():

    datos = datos_json()

    correo = texto(datos, "correo").lower()
    contrasena = datos.get("contrasena") or ""

    try:
        validar_correo(correo)
        requerir(contrasena != "", "contrasena", "Escribe tu contraseña.")
    except ErrorValidacion as e:
        return respuesta_validacion(e)


    # ¿Demasiados intentos fallidos?
    registro_intentos = _intentos_fallidos.get(correo)

    if registro_intentos and registro_intentos["bloqueado_hasta"] > time.time():
        minutos = int((registro_intentos["bloqueado_hasta"] - time.time()) // 60) + 1
        return error(
            f"Demasiados intentos. Espera {minutos} minuto(s) e intenta de nuevo.",
            429,
            campo="contrasena",
        )

    usuario = consultar(
        "SELECT id, nombre, correo, clave_hash, rol, creado_en FROM usuarios WHERE correo = %s",
        (correo,),
        uno=True,
    )

    clave_ok = check_password_hash(
        usuario["clave_hash"] if usuario else HASH_FALSO,
        contrasena,
    )

    if not usuario or not clave_ok:

        registro_intentos = _intentos_fallidos.setdefault(
            correo, {"fallos": 0, "bloqueado_hasta": 0}
        )

        registro_intentos["fallos"] += 1

        if registro_intentos["fallos"] >= INTENTOS_MAXIMOS:
            registro_intentos["fallos"] = 0
            registro_intentos["bloqueado_hasta"] = time.time() + BLOQUEO_SEGUNDOS

        # Mismo mensaje en ambos casos: no revelamos qué correos existen
        return error("El correo o la contraseña no son correctos.", 401, campo="contrasena")

    _intentos_fallidos.pop(correo, None)

    session.clear()
    session.permanent = True
    session["usuario_id"] = usuario["id"]

    return ok({"usuario": usuario_publico(usuario)})


# =========================================================
#   CERRAR SESIÓN
# =========================================================

@bp.post("/logout")
def logout():

    session.clear()

    return ok({"mensaje": "Sesión cerrada."})


# =========================================================
#   USUARIO ACTUAL
# =========================================================

@bp.get("/yo")
@login_requerido
def yo():

    return ok({"usuario": usuario_publico(g.usuario)})


@bp.put("/perfil")
@login_requerido
def actualizar_perfil():

    nombre = texto(datos_json(), "nombre")

    try:
        validar_nombre(nombre)
    except ErrorValidacion as e:
        return respuesta_validacion(e)

    ejecutar("UPDATE usuarios SET nombre = %s WHERE id = %s", (nombre, g.usuario["id"]))

    g.usuario["nombre"] = nombre

    return ok({"usuario": usuario_publico(g.usuario)})
