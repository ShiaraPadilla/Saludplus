"""
Tareas programadas (RF-06).

    POST /tareas/revisar-tomas
    Encabezado obligatorio:  X-Tarea-Secreta: <TAREAS_SECRETO>

La llama cron-job.org cada 5 minutos (el plan gratis de Render duerme
la app, así que un programador interno no es confiable). En cada
ejecución:

  1. Recordatorio al adulto mayor: a la hora del medicamento (hasta
     30 min después), si aún no registró la toma.
  2. Alerta al cuidador: 30 min después de la hora, si no hay "Lo tomé".
  3. Cierra las llamadas que quedaron sonando o abiertas.

alertas_enviadas tiene llave primaria (medicamento_id, fecha, tipo) y se
usa INSERT IGNORE: aunque la tarea corra varias veces (o dos a la vez),
cada alerta se envía UNA sola vez.
"""

import hmac
import logging
from datetime import datetime, timedelta

from flask import Blueprint, current_app, request

from .db import consultar, ejecutar
from .push import enviar_push
from .utilidades import ahora_local, error, hora_12, ok, utc_a_local
from .vinculos import cuidadores_activos

log = logging.getLogger(__name__)

bp = Blueprint("tareas", __name__, url_prefix="/tareas")

MINUTOS_ALERTA = 30


def registrar_alerta(medicamento_id, fecha, tipo):
    """True solo la primera vez (la llave primaria evita duplicados)."""

    _, filas = ejecutar(
        "INSERT IGNORE INTO alertas_enviadas (medicamento_id, fecha, tipo) VALUES (%s, %s, %s)",
        (medicamento_id, fecha, tipo),
    )

    return filas == 1


def revisar_tomas(ahora=None):

    ahora = ahora or ahora_local()

    hoy = ahora.date()

    medicamentos = consultar(
        """
        SELECT m.id, m.usuario_id, m.nombre, m.dosis, m.hora, m.creado_en,
               u.nombre AS adulto, t.estado
        FROM medicamentos m
        JOIN usuarios u ON u.id = m.usuario_id
        LEFT JOIN tomas_medicamento t ON t.medicamento_id = m.id AND t.fecha = %s
        WHERE m.activo = 1
        """,
        (hoy,),
    )

    resultado = {"recordatorios": 0, "alertas": 0, "notificaciones": 0}

    for m in medicamentos:

        programada = datetime.combine(hoy, (datetime.min + m["hora"]).time())

        # Si el medicamento se creó después de su hora de hoy, hoy no cuenta
        if utc_a_local(m["creado_en"]) > programada:
            continue

        limite = programada + timedelta(minutes=MINUTOS_ALERTA)

        texto_toma = m["nombre"] + " " + m["dosis"] + " — " + hora_12(m["hora"])

        # 1. Recordatorio al adulto mayor
        if programada <= ahora < limite and m["estado"] is None:

            if registrar_alerta(m["id"], hoy, "recordatorio"):

                resultado["recordatorios"] += 1

                resultado["notificaciones"] += enviar_push(
                    m["usuario_id"],
                    "💊 Es hora de tu medicamento",
                    texto_toma,
                    "/dashboard.html?recordatorio=1",
                    etiqueta="toma-" + str(m["id"]),
                    urgente=True,      # Android: llega aunque el celular ahorre batería
                    ttl=1800,          # vale 30 min (luego ya es alerta al cuidador)
                )

        # 2. Alerta al cuidador: +30 min sin "Lo tomé"
        if ahora >= limite and m["estado"] != "tomado":

            if registrar_alerta(m["id"], hoy, "toma_omitida"):

                resultado["alertas"] += 1

                for cuidador in cuidadores_activos(m["usuario_id"]):

                    resultado["notificaciones"] += enviar_push(
                        cuidador["id"],
                        "⚠️ " + m["adulto"] + " no registró una toma",
                        texto_toma + (" (marcó «No lo tomé»)" if m["estado"] == "no_tomado" else ""),
                        "/panel-cuidador.html",
                        etiqueta="omitida-" + str(m["id"]),
                        urgente=True,
                        ttl=6 * 3600,
                    )

    # 3. Llamadas que nadie contestó o que quedaron abiertas
    _, perdidas = ejecutar(
        "UPDATE llamadas SET estado = 'perdida', finalizada_en = UTC_TIMESTAMP() "
        "WHERE estado = 'sonando' AND creada_en < UTC_TIMESTAMP() - INTERVAL 2 MINUTE"
    )

    _, cerradas = ejecutar(
        "UPDATE llamadas SET estado = 'finalizada', finalizada_en = sala_vence "
        "WHERE estado = 'en_curso' AND sala_vence < UTC_TIMESTAMP()"
    )

    resultado["llamadas_cerradas"] = perdidas + cerradas

    return resultado


@bp.post("/revisar-tomas")
def revisar_tomas_ruta():

    secreto = current_app.config.get("TAREAS_SECRETO")

    if not secreto:
        return error("La tarea no está configurada (falta TAREAS_SECRETO).", 503)

    enviado = request.headers.get("X-Tarea-Secreta", "")

    if not hmac.compare_digest(enviado.encode(), secreto.encode()):
        return error("No autorizado.", 401)

    resultado = revisar_tomas()

    log.info("Tarea revisar-tomas: %s", resultado)

    return ok({"resultado": resultado})
