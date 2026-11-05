"""
Videollamadas privadas (RF-03, RF-04, RF-05, RF-08).

Flujo:
  1. POST /api/llamadas              crea la sala privada en Daily y avisa al otro (push)
  2. GET  /api/llamadas/<id>/token   token SOLO para los dos participantes (403 a cualquier otro)
  3. POST /api/llamadas/<id>/fin     al colgar: guarda el fin y calcula la duración

Otras rutas:
    GET  /api/llamadas                  historial (participantes, inicio, fin, duración)
    GET  /api/llamadas/entrante         llamada que está sonando para mí (si la app está abierta)
    GET  /api/llamadas/<id>             estado de una llamada
    POST /api/llamadas/<id>/rechazar    el receptor no contesta
"""

from datetime import datetime, timezone

import logging

from flask import Blueprint, g

from . import video
from .auth import login_requerido
from .db import consultar, ejecutar
from .push import enviar_push
from .utilidades import datos_json, error, ok, serializar, texto
from .vinculos import adultos_vinculados, cuidadores_activos, puede_ver

log = logging.getLogger(__name__)

bp = Blueprint("llamadas", __name__, url_prefix="/api/llamadas")

SEGUNDOS_TIMBRE = 60       # tiempo que suena antes de darse por perdida

SQL_LLAMADA = """
    SELECT l.id, l.sala, l.sala_url, l.sala_vence, l.iniciador_id, l.receptor_id, l.cita_id,
           l.estado, l.creada_en, l.iniciada_en, l.finalizada_en,
           TIMESTAMPDIFF(SECOND, l.iniciada_en, l.finalizada_en) AS duracion_segundos,
           ui.nombre AS iniciador, ur.nombre AS receptor,
           c.medico AS cita_medico, c.especialidad AS cita_especialidad
    FROM llamadas l
    JOIN usuarios ui ON ui.id = l.iniciador_id
    JOIN usuarios ur ON ur.id = l.receptor_id
    LEFT JOIN citas c ON c.id = l.cita_id
"""


def buscar(llamada_id):
    return consultar(SQL_LLAMADA + " WHERE l.id = %s", (llamada_id,), uno=True)


def es_participante(llamada, usuario_id):
    return usuario_id in (llamada["iniciador_id"], llamada["receptor_id"])


def publica(llamada, usuario_id):
    """Datos de la llamada para el usuario (sin la URL de la sala)."""

    soy_iniciador = llamada["iniciador_id"] == usuario_id

    datos = serializar({
        "id": llamada["id"],
        "estado": llamada["estado"],
        "direccion": "saliente" if soy_iniciador else "entrante",
        "con": llamada["receptor"] if soy_iniciador else llamada["iniciador"],
        "creada_en": llamada["creada_en"],
        "iniciada_en": llamada["iniciada_en"],
        "finalizada_en": llamada["finalizada_en"],
        "duracion_segundos": llamada["duracion_segundos"],
    })

    if llamada.get("cita_id"):
        datos["cita"] = {"medico": llamada["cita_medico"], "especialidad": llamada["cita_especialidad"]}

    return datos


def puede_llamar(usuario, otro_id):
    """Solo se llama entre personas con vínculo activo."""

    if usuario["rol"] == "cuidador":
        return puede_ver(usuario["id"], otro_id)

    return puede_ver(otro_id, usuario["id"])


# =========================================================
#   CREAR LLAMADA
# =========================================================

@bp.post("")
@login_requerido
def crear():

    usuario = g.usuario

    datos = datos_json()

    # ¿A quién se llama?
    if usuario["rol"] == "cuidador":
        contactos = adultos_vinculados(usuario["id"])
    elif usuario["rol"] == "usuario":
        contactos = cuidadores_activos(usuario["id"])
    else:
        return error("Esta cuenta no puede hacer videollamadas.", 403)

    if not contactos:
        return error(
            "Aún no tienes un familiar vinculado. Ve a Ajustes → Mi cuidador para vincularlo.",
            409, campo="receptor_id",
        )

    try:
        receptor_id = int(datos["receptor_id"]) if datos.get("receptor_id") else None
    except (TypeError, ValueError):
        return error("Persona no válida.", 400, campo="receptor_id")

    if receptor_id is None:

        if len(contactos) > 1:
            return error("Elige a quién quieres llamar.", 400, campo="receptor_id")

        receptor_id = contactos[0]["id"]

    if not puede_llamar(usuario, receptor_id):
        return error("Solo puedes llamar a las personas con las que tienes un vínculo activo.", 403)


    # ¿Desde una cita? Debe ser del adulto mayor de este vínculo
    cita_id = None

    if datos.get("cita_id"):

        try:
            cita_id = int(datos["cita_id"])
        except (TypeError, ValueError):
            return error("Cita no válida.", 400, campo="cita_id")

        adulto_id = receptor_id if usuario["rol"] == "cuidador" else usuario["id"]

        if not consultar("SELECT id FROM citas WHERE id = %s AND usuario_id = %s", (cita_id, adulto_id), uno=True):
            return error("La cita no existe.", 404, campo="cita_id")


    # Si ya hay una llamada sonando entre los dos, se reutiliza
    existente = consultar(
        "SELECT id FROM llamadas WHERE iniciador_id = %s AND receptor_id = %s AND estado = 'sonando' "
        "AND creada_en > UTC_TIMESTAMP() - INTERVAL %s SECOND ORDER BY id DESC LIMIT 1",
        (usuario["id"], receptor_id, SEGUNDOS_TIMBRE),
        uno=True,
    )

    if existente:
        return ok({"llamada": publica(buscar(existente["id"]), usuario["id"])})


    # Sala privada con expiración de 60 minutos
    try:
        sala, url, vence = video.crear_sala()
    except video.ErrorVideo as e:
        return error(str(e), 502)

    llamada_id, _ = ejecutar(
        "INSERT INTO llamadas (sala, sala_url, sala_vence, iniciador_id, receptor_id, cita_id) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (sala, url, datetime.fromtimestamp(vence, timezone.utc).replace(tzinfo=None),
         usuario["id"], receptor_id, cita_id),
    )

    # Notificación push al otro participante (RF-04)
    enviar_push(
        receptor_id,
        "📹 Videollamada de " + usuario["nombre"],
        "Toca para contestar",
        "/llamada/" + str(llamada_id),
        etiqueta="llamada-" + str(llamada_id),
        urgente=True,
    )

    return ok({"llamada": publica(buscar(llamada_id), usuario["id"])}, 201)


# =========================================================
#   TOKEN (solo participantes)
# =========================================================

@bp.get("/<int:llamada_id>/token")
@login_requerido
def token(llamada_id):

    llamada = buscar(llamada_id)

    if not llamada:
        return error("La llamada no existe.", 404)

    if not es_participante(llamada, g.usuario["id"]):
        return error("No participas en esta llamada.", 403)

    if llamada["estado"] in ("finalizada", "perdida"):
        return error("Esta llamada ya terminó.", 410, estado=llamada["estado"])

    if llamada["sala_vence"] <= datetime.now(timezone.utc).replace(tzinfo=None):
        return error("La sala de esta llamada ya venció.", 410, estado="finalizada")

    try:
        vence = int(llamada["sala_vence"].replace(tzinfo=timezone.utc).timestamp())
        token_reunion = video.token_para(llamada["sala"], g.usuario["nombre"], vence)
    except video.ErrorVideo as e:
        return error(str(e), 502)

    # Cuando el receptor entra, la llamada empieza
    if g.usuario["id"] == llamada["receptor_id"] and llamada["estado"] == "sonando":
        ejecutar(
            "UPDATE llamadas SET estado = 'en_curso', iniciada_en = UTC_TIMESTAMP() "
            "WHERE id = %s AND estado = 'sonando'",
            (llamada_id,),
        )
        llamada = buscar(llamada_id)

    return ok({
        "url": llamada["sala_url"],
        "token": token_reunion,
        "simulado": video.modo_simulado(),
        "llamada": publica(llamada, g.usuario["id"]),
    })


# =========================================================
#   COLGAR / RECHAZAR / ESTADO
# =========================================================

def registrar_diagnostico(llamada_id):
    """Si el celular reporta un error de video, queda en los logs de Render."""

    motivo = texto(datos_json(), "motivo")[:300]

    if motivo:
        log.warning("Llamada %s · usuario %s · error de video: %s", llamada_id, g.usuario["id"], motivo)


@bp.post("/<int:llamada_id>/diagnostico")
@login_requerido
def diagnostico(llamada_id):

    llamada = buscar(llamada_id)

    if not llamada:
        return error("La llamada no existe.", 404)

    if not es_participante(llamada, g.usuario["id"]):
        return error("No participas en esta llamada.", 403)

    registrar_diagnostico(llamada_id)

    return ok()


@bp.post("/<int:llamada_id>/fin")
@login_requerido
def fin(llamada_id):

    llamada = buscar(llamada_id)

    if not llamada:
        return error("La llamada no existe.", 404)

    if not es_participante(llamada, g.usuario["id"]):
        return error("No participas en esta llamada.", 403)

    registrar_diagnostico(llamada_id)

    if llamada["estado"] == "en_curso":
        ejecutar(
            "UPDATE llamadas SET estado = 'finalizada', finalizada_en = UTC_TIMESTAMP() "
            "WHERE id = %s AND estado = 'en_curso'",
            (llamada_id,),
        )
        video.borrar_sala(llamada["sala"])

    elif llamada["estado"] == "sonando":
        # Se colgó antes de que contestaran
        ejecutar(
            "UPDATE llamadas SET estado = 'perdida', finalizada_en = UTC_TIMESTAMP() "
            "WHERE id = %s AND estado = 'sonando'",
            (llamada_id,),
        )
        video.borrar_sala(llamada["sala"])

    return ok({"llamada": publica(buscar(llamada_id), g.usuario["id"])})


@bp.post("/<int:llamada_id>/rechazar")
@login_requerido
def rechazar(llamada_id):

    llamada = buscar(llamada_id)

    if not llamada or llamada["receptor_id"] != g.usuario["id"]:
        return error("La llamada no existe.", 404)

    ejecutar(
        "UPDATE llamadas SET estado = 'perdida', finalizada_en = UTC_TIMESTAMP() "
        "WHERE id = %s AND estado = 'sonando'",
        (llamada_id,),
    )

    video.borrar_sala(llamada["sala"])

    return ok({"llamada": publica(buscar(llamada_id), g.usuario["id"])})


@bp.get("/<int:llamada_id>")
@login_requerido
def estado(llamada_id):

    llamada = buscar(llamada_id)

    if not llamada or not es_participante(llamada, g.usuario["id"]):
        return error("La llamada no existe.", 404)

    return ok({"llamada": publica(llamada, g.usuario["id"])})


@bp.get("/entrante")
@login_requerido
def entrante():

    llamada = consultar(
        SQL_LLAMADA + " WHERE l.receptor_id = %s AND l.estado = 'sonando' "
        "AND l.creada_en > UTC_TIMESTAMP() - INTERVAL %s SECOND ORDER BY l.id DESC LIMIT 1",
        (g.usuario["id"], SEGUNDOS_TIMBRE),
        uno=True,
    )

    return ok({"llamada": publica(llamada, g.usuario["id"]) if llamada else None})


@bp.get("")
@login_requerido
def historial():

    filas = consultar(
        SQL_LLAMADA + " WHERE l.iniciador_id = %s OR l.receptor_id = %s ORDER BY l.creada_en DESC LIMIT 30",
        (g.usuario["id"], g.usuario["id"]),
    )

    return ok({"llamadas": [publica(f, g.usuario["id"]) for f in filas]})
