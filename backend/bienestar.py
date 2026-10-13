"""
Bienestar: estado emocional, actividad física, agua, sueño
y preferencias de recordatorios.

Rutas (requieren sesión):
    GET    /api/emociones            POST /api/emociones       DELETE /api/emociones/<id>
    GET    /api/actividad            POST /api/actividad
    GET    /api/agua                 PUT  /api/agua            {fecha, vasos}
    GET    /api/sueno                PUT  /api/sueno           {fecha, horas}
    GET    /api/preferencias         PUT  /api/preferencias
"""

from flask import Blueprint, g, request

import pymysql

from .auth import login_requerido
from .db import consultar, ejecutar
from .utilidades import datos_json, error, ok, serializar, texto
from .validaciones import (
    ACTIVIDADES,
    EMOCIONES,
    ErrorValidacion,
    requerir,
    validar_entero,
    validar_fecha_de_hoy,
)

bp = Blueprint("bienestar", __name__, url_prefix="/api")


def dias_solicitados(por_defecto=90):

    try:
        return min(max(int(request.args.get("dias", por_defecto)), 1), 730)
    except ValueError:
        return por_defecto


def respuesta_error(e):
    return error(e.mensaje, 400, campo=e.campo)


# =========================================================
#   ESTADO EMOCIONAL
# =========================================================

def listar_emociones(usuario_id, dias=365):

    filas = consultar(
        "SELECT id, emocion, comentario, registrado_en FROM estados_emocionales "
        "WHERE usuario_id = %s AND registrado_en >= UTC_TIMESTAMP() - INTERVAL %s DAY "
        "ORDER BY registrado_en, id",
        (usuario_id, dias),
    )

    return [serializar(f) for f in filas]


@bp.get("/emociones")
@login_requerido
def emociones():

    return ok({"emociones": listar_emociones(g.usuario["id"], dias_solicitados(365))})


@bp.post("/emociones")
@login_requerido
def crear_emocion():

    datos = datos_json()

    emocion = texto(datos, "emocion")

    comentario = (datos.get("comentario") or "")

    comentario = comentario.strip() if isinstance(comentario, str) else ""

    try:
        requerir(emocion in EMOCIONES, "emocion", "Elige cómo te sientes.")
        requerir(len(comentario) <= 300, "comentario", "Máximo 300 caracteres.")
    except ErrorValidacion as e:
        return respuesta_error(e)

    nuevo_id, _ = ejecutar(
        "INSERT INTO estados_emocionales (usuario_id, emocion, comentario) VALUES (%s, %s, %s)",
        (g.usuario["id"], emocion, comentario or None),
    )

    fila = consultar(
        "SELECT id, emocion, comentario, registrado_en FROM estados_emocionales WHERE id = %s",
        (nuevo_id,),
        uno=True,
    )

    return ok({"emocion": serializar(fila)}, 201)


@bp.delete("/emociones/<int:registro_id>")
@login_requerido
def eliminar_emocion(registro_id):

    _, filas = ejecutar(
        "DELETE FROM estados_emocionales WHERE id = %s AND usuario_id = %s",
        (registro_id, g.usuario["id"]),
    )

    if filas == 0:
        return error("El registro no existe.", 404)

    return ok({"mensaje": "Registro eliminado."})


# =========================================================
#   ACTIVIDAD FÍSICA (una por día)
# =========================================================

def listar_actividad(usuario_id, dias=365):

    filas = consultar(
        "SELECT id, fecha, tipo, minutos FROM actividad_fisica "
        "WHERE usuario_id = %s AND fecha >= UTC_DATE() - INTERVAL %s DAY ORDER BY fecha",
        (usuario_id, dias),
    )

    return [serializar(f) for f in filas]


@bp.get("/actividad")
@login_requerido
def actividad():

    return ok({"actividad": listar_actividad(g.usuario["id"], dias_solicitados(365))})


@bp.post("/actividad")
@login_requerido
def crear_actividad():

    datos = datos_json()

    tipo = texto(datos, "tipo")

    try:
        requerir(tipo in ACTIVIDADES, "tipo", "Elige el tipo de actividad.")
        minutos = validar_entero(
            datos.get("minutos"), "minutos", 5, 300,
            "Escribe entre 5 y 300 minutos (número entero).",
        )
        fecha = validar_fecha_de_hoy(texto(datos, "fecha"))
    except ErrorValidacion as e:
        return respuesta_error(e)

    try:
        nuevo_id, _ = ejecutar(
            "INSERT INTO actividad_fisica (usuario_id, fecha, tipo, minutos) VALUES (%s, %s, %s, %s)",
            (g.usuario["id"], fecha, tipo, minutos),
        )
    except pymysql.err.IntegrityError:
        return error("Ya registraste actividad física hoy.", 409, campo="fecha")

    fila = consultar("SELECT id, fecha, tipo, minutos FROM actividad_fisica WHERE id = %s", (nuevo_id,), uno=True)

    return ok({"actividad": serializar(fila)}, 201)


# =========================================================
#   AGUA (vasos por día)
# =========================================================

def listar_agua(usuario_id, dias=365):

    filas = consultar(
        "SELECT fecha, vasos FROM agua "
        "WHERE usuario_id = %s AND fecha >= UTC_DATE() - INTERVAL %s DAY ORDER BY fecha",
        (usuario_id, dias),
    )

    return [serializar(f) for f in filas]


@bp.get("/agua")
@login_requerido
def agua():

    return ok({"agua": listar_agua(g.usuario["id"], dias_solicitados(365))})


@bp.put("/agua")
@login_requerido
def guardar_agua():

    datos = datos_json()

    try:
        fecha = validar_fecha_de_hoy(texto(datos, "fecha"))
        vasos = validar_entero(datos.get("vasos"), "vasos", 0, 8, "Los vasos deben estar entre 0 y 8.")
    except ErrorValidacion as e:
        return respuesta_error(e)

    ejecutar(
        "INSERT INTO agua (usuario_id, fecha, vasos) VALUES (%s, %s, %s) "
        "ON DUPLICATE KEY UPDATE vasos = VALUES(vasos)",
        (g.usuario["id"], fecha, vasos),
    )

    return ok({"agua": {"fecha": fecha.isoformat(), "vasos": vasos}})


# =========================================================
#   SUEÑO (horas por noche)
# =========================================================

def listar_sueno(usuario_id, dias=365):

    filas = consultar(
        "SELECT fecha, horas FROM sueno "
        "WHERE usuario_id = %s AND fecha >= UTC_DATE() - INTERVAL %s DAY ORDER BY fecha",
        (usuario_id, dias),
    )

    return [{"fecha": f["fecha"].isoformat(), "horas": float(f["horas"])} for f in filas]


@bp.get("/sueno")
@login_requerido
def sueno():

    return ok({"sueno": listar_sueno(g.usuario["id"], dias_solicitados(365))})


@bp.put("/sueno")
@login_requerido
def guardar_sueno():

    datos = datos_json()

    try:
        fecha = validar_fecha_de_hoy(texto(datos, "fecha"))

        try:
            horas = float(datos.get("horas"))
        except (TypeError, ValueError):
            raise ErrorValidacion("horas", "Escribe un número. Ej: 7.5")

        requerir(1 <= horas <= 16, "horas", "Las horas deben estar entre 1 y 16.")
        requerir(round(horas * 2) == horas * 2, "horas", "Usa horas enteras o medias. Ej: 7 o 7.5")

    except ErrorValidacion as e:
        return respuesta_error(e)

    ejecutar(
        "INSERT INTO sueno (usuario_id, fecha, horas) VALUES (%s, %s, %s) "
        "ON DUPLICATE KEY UPDATE horas = VALUES(horas), registrado_en = CURRENT_TIMESTAMP",
        (g.usuario["id"], fecha, horas),
    )

    return ok({"sueno": {"fecha": fecha.isoformat(), "horas": horas}})


# =========================================================
#   PREFERENCIAS DE RECORDATORIOS
# =========================================================

def leer_preferencias(usuario_id):

    fila = consultar(
        "SELECT avisos_app, notificaciones, minutos_cita FROM preferencias WHERE usuario_id = %s",
        (usuario_id,),
        uno=True,
    )

    if not fila:
        return {"activos": True, "sistema": False, "minutosCita": 60}

    return {
        "activos": bool(fila["avisos_app"]),
        "sistema": bool(fila["notificaciones"]),
        "minutosCita": int(fila["minutos_cita"]),
    }


@bp.get("/preferencias")
@login_requerido
def preferencias():

    return ok({"preferencias": leer_preferencias(g.usuario["id"])})


@bp.put("/preferencias")
@login_requerido
def guardar_preferencias():

    datos = datos_json()

    try:
        minutos = int(datos.get("minutosCita", 60))
    except (TypeError, ValueError):
        minutos = 0

    if minutos not in (30, 60, 120, 180):
        return error("Anticipación no válida.", 400, campo="minutosCita")

    activos = bool(datos.get("activos", True))

    sistema = bool(datos.get("sistema", False))

    ejecutar(
        "INSERT INTO preferencias (usuario_id, avisos_app, notificaciones, minutos_cita) "
        "VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE "
        "avisos_app = VALUES(avisos_app), notificaciones = VALUES(notificaciones), "
        "minutos_cita = VALUES(minutos_cita)",
        (g.usuario["id"], activos, sistema, minutos),
    )

    return ok({"preferencias": leer_preferencias(g.usuario["id"])})
