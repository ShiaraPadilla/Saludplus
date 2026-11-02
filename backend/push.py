"""
Notificaciones Web Push con claves VAPID (RF-04 y RF-06).

Rutas:
    GET    /api/push/clave          clave pública VAPID (para suscribirse)
    POST   /api/push/suscribir      guarda la suscripción de este celular
    POST   /api/push/desuscribir    la elimina
    POST   /api/push/probar         envía una notificación de prueba
"""

import json
import logging

from flask import Blueprint, current_app, g
from pywebpush import WebPushException, webpush

from .auth import login_requerido
from .db import consultar, ejecutar
from .utilidades import datos_json, error, ok

log = logging.getLogger(__name__)

bp = Blueprint("push", __name__, url_prefix="/api/push")


def push_disponible():
    c = current_app.config
    return bool(c.get("VAPID_PUBLIC_KEY") and c.get("VAPID_PRIVATE_KEY"))


def enviar_push(usuario_id, titulo, cuerpo, url="/", etiqueta=None, urgente=False, ttl=None):
    """
    Envía la notificación a todos los celulares del usuario.
    Devuelve cuántas se enviaron. Borra las suscripciones vencidas.
    """

    if not push_disponible():
        return 0

    suscripciones = consultar(
        "SELECT id, endpoint, p256dh, auth FROM suscripciones_push WHERE usuario_id = %s",
        (usuario_id,),
    )

    datos = json.dumps({
        "titulo": titulo,
        "cuerpo": cuerpo,
        "url": url,
        "etiqueta": etiqueta,
        "urgente": urgente,
    })

    enviadas = 0

    for s in suscripciones:

        try:
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": {"p256dh": s["p256dh"], "auth": s["auth"]}},
                data=datos,
                vapid_private_key=current_app.config["VAPID_PRIVATE_KEY"],
                vapid_claims={"sub": current_app.config["VAPID_CORREO"]},
                # Vigencia: si el celular está sin conexión, cuánto tiempo espera la notificación
                ttl=ttl or (120 if urgente else 3600),
                timeout=10,
                # Android (FCM): "high" despierta el celular aunque esté en ahorro de
                # batería (Doze). Sin esto, una llamada puede llegar minutos tarde.
                headers={"Urgency": "high" if urgente else "normal"},
            )
            enviadas += 1

        except WebPushException as e:

            estado = e.response.status_code if e.response is not None else None

            if estado in (403, 404, 410):
                # 404/410: el celular canceló la suscripción.
                # 403: la suscripción se hizo con otras claves VAPID (ya no sirve).
                ejecutar("DELETE FROM suscripciones_push WHERE id = %s", (s["id"],))
            else:
                log.warning("Push no enviado a %s: %s", usuario_id, e)

        except Exception as e:
            log.warning("Push no enviado a %s: %s", usuario_id, e)

    return enviadas


@bp.get("/clave")
@login_requerido
def clave():

    return ok({"disponible": push_disponible(), "clave": current_app.config.get("VAPID_PUBLIC_KEY", "")})


@bp.post("/suscribir")
@login_requerido
def suscribir():

    datos = datos_json()

    endpoint = (datos.get("endpoint") or "").strip()

    llaves = datos.get("keys") or {}

    p256dh = (llaves.get("p256dh") or "").strip()

    auth = (llaves.get("auth") or "").strip()

    if not endpoint.startswith("https://") or len(endpoint) > 500 or not p256dh or not auth \
            or len(p256dh) > 200 or len(auth) > 100:
        return error("Suscripción no válida.", 400)

    ejecutar(
        "INSERT INTO suscripciones_push (usuario_id, endpoint, p256dh, auth) VALUES (%s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id), p256dh = VALUES(p256dh), auth = VALUES(auth)",
        (g.usuario["id"], endpoint, p256dh, auth),
    )

    return ok({"mensaje": "Notificaciones activadas en este celular."})


@bp.post("/desuscribir")
@login_requerido
def desuscribir():

    endpoint = (datos_json().get("endpoint") or "").strip()

    ejecutar(
        "DELETE FROM suscripciones_push WHERE endpoint = %s AND usuario_id = %s",
        (endpoint, g.usuario["id"]),
    )

    return ok({"mensaje": "Notificaciones desactivadas en este celular."})


@bp.post("/probar")
@login_requerido
def probar():

    if not push_disponible():
        return error("Las notificaciones push no están configuradas en el servidor.", 503)

    enviadas = enviar_push(
        g.usuario["id"], "Salud+ 🔔", "¡Las notificaciones funcionan en este celular!", "/ajustes.html"
    )

    if enviadas == 0:
        return error("Este usuario no tiene celulares suscritos.", 404)

    return ok({"enviadas": enviadas})
