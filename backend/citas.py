"""
Citas médicas.

Rutas (requieren sesión):
    GET    /api/citas                lista de citas del usuario
    POST   /api/citas                crear
    PATCH  /api/citas/<id>           cambiar estado {estado}
    DELETE /api/citas/<id>           eliminar
"""

from flask import Blueprint, g

from .auth import login_requerido
from .db import consultar, ejecutar
from .utilidades import datos_json, error, ok, serializar, texto
from .validaciones import ErrorValidacion, validar_cita

bp = Blueprint("citas", __name__, url_prefix="/api/citas")

COLUMNAS = "id, medico, especialidad, fecha, hora, lugar, estado, creado_en"

ESTADOS = ("pendiente", "cumplida", "cancelada")


def listar_citas(usuario_id):

    filas = consultar(
        "SELECT " + COLUMNAS + " FROM citas WHERE usuario_id = %s ORDER BY fecha, hora",
        (usuario_id,),
    )

    return [serializar(f) for f in filas]


def buscar_cita(cita_id, usuario_id):

    return consultar(
        "SELECT " + COLUMNAS + " FROM citas WHERE id = %s AND usuario_id = %s",
        (cita_id, usuario_id),
        uno=True,
    )


@bp.get("")
@login_requerido
def listar():

    return ok({"citas": listar_citas(g.usuario["id"])})


@bp.post("")
@login_requerido
def crear():

    datos = datos_json()

    valores = {
        "medico": texto(datos, "medico"),
        "especialidad": texto(datos, "especialidad"),
        "fecha": texto(datos, "fecha"),
        "hora": texto(datos, "hora"),
        "lugar": texto(datos, "lugar"),
    }

    try:
        fecha = validar_cita(
            valores["medico"], valores["especialidad"], valores["fecha"],
            valores["hora"], valores["lugar"],
        )
    except ErrorValidacion as e:
        return error(e.mensaje, 400, campo=e.campo)

    choque = consultar(
        "SELECT id FROM citas WHERE usuario_id = %s AND estado = 'pendiente' "
        "AND fecha = %s AND hora = %s",
        (g.usuario["id"], fecha, valores["hora"]),
        uno=True,
    )

    if choque:
        return error("Ya tienes otra cita a esa misma hora.", 409, campo="hora")

    nuevo_id, _ = ejecutar(
        "INSERT INTO citas (usuario_id, medico, especialidad, fecha, hora, lugar) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (g.usuario["id"], valores["medico"], valores["especialidad"], fecha,
         valores["hora"], valores["lugar"]),
    )

    return ok({"cita": serializar(buscar_cita(nuevo_id, g.usuario["id"]))}, 201)


@bp.patch("/<int:cita_id>")
@login_requerido
def cambiar_estado(cita_id):

    estado = texto(datos_json(), "estado")

    if estado not in ESTADOS:
        return error("Estado no válido.", 400, campo="estado")

    if not buscar_cita(cita_id, g.usuario["id"]):
        return error("La cita no existe.", 404)

    ejecutar(
        "UPDATE citas SET estado = %s WHERE id = %s AND usuario_id = %s",
        (estado, cita_id, g.usuario["id"]),
    )

    return ok({"cita": serializar(buscar_cita(cita_id, g.usuario["id"]))})


@bp.delete("/<int:cita_id>")
@login_requerido
def eliminar(cita_id):

    _, filas = ejecutar(
        "DELETE FROM citas WHERE id = %s AND usuario_id = %s",
        (cita_id, g.usuario["id"]),
    )

    if filas == 0:
        return error("La cita no existe.", 404)

    return ok({"mensaje": "Cita eliminada."})
