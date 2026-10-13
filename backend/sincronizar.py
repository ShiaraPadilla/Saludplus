"""
Una sola petición con todos los datos del usuario.

    GET /api/sincronizar

La usa el frontend al abrir cada pantalla: en lugar de 9 peticiones,
hace 1 (importante en el plan gratis de Render y Aiven).
"""

from flask import Blueprint, g

from .auth import login_requerido, usuario_publico
from .bienestar import leer_preferencias, listar_actividad, listar_agua, listar_emociones, listar_sueno
from .citas import listar_citas
from .medicamentos import COLUMNAS_MEDICAMENTO, SQL_TOMAS
from .db import consultar
from .utilidades import ok, serializar

bp = Blueprint("sincronizar", __name__, url_prefix="/api")


@bp.get("/sincronizar")
@login_requerido
def sincronizar():

    usuario_id = g.usuario["id"]

    medicamentos = consultar(
        "SELECT " + COLUMNAS_MEDICAMENTO + " FROM medicamentos "
        "WHERE usuario_id = %s AND activo = 1 ORDER BY hora, nombre",
        (usuario_id,),
    )

    tomas = consultar(
        SQL_TOMAS + " AND t.fecha >= UTC_DATE() - INTERVAL 365 DAY ORDER BY t.fecha, t.registrado_en",
        (usuario_id,),
    )

    return ok({
        "usuario": usuario_publico(g.usuario),
        "medicamentos": [serializar(f) for f in medicamentos],
        "tomas": [serializar(f) for f in tomas],
        "citas": listar_citas(usuario_id),
        "emociones": listar_emociones(usuario_id),
        "actividad": listar_actividad(usuario_id),
        "agua": listar_agua(usuario_id),
        "sueno": listar_sueno(usuario_id),
        "preferencias": leer_preferencias(usuario_id),
    })
