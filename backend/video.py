"""
Salas de video privadas con Daily.co (RF-03).

  · crear_sala()  → sala privada que vence en 60 minutos
  · token_para()  → token de reunión para UN participante
  · borrar_sala() → cierra la sala al colgar

Sin DAILY_API_KEY la app funciona en MODO SIMULADO (para pruebas
locales): se registran las llamadas, pero no hay video real.
"""

import logging
import time
import uuid

import requests
from flask import current_app

log = logging.getLogger(__name__)

DAILY = "https://api.daily.co/v1"

MINUTOS_SALA = 60


class ErrorVideo(Exception):
    pass


def modo_simulado():
    return not current_app.config.get("DAILY_API_KEY")


def _cabeceras():
    return {"Authorization": "Bearer " + current_app.config["DAILY_API_KEY"]}


def crear_sala():
    """Devuelve (nombre, url, vence_epoch)."""

    nombre = "saludplus-" + uuid.uuid4().hex[:12]

    vence = int(time.time()) + MINUTOS_SALA * 60

    if modo_simulado():
        return nombre, "https://simulado.daily.co/" + nombre, vence

    try:
        r = requests.post(DAILY + "/rooms", headers=_cabeceras(), timeout=10, json={
            "name": nombre,
            "privacy": "private",                 # solo se entra con token
            "properties": {
                "exp": vence,
                "eject_at_room_exp": True,
                "enable_prejoin_ui": False,       # sin pantallas intermedias (RF-05)
                "max_participants": 3,
                "lang": "es",
            },
        })
        r.raise_for_status()

    except requests.RequestException as e:
        log.error("Daily no creó la sala: %s", e)
        raise ErrorVideo("No se pudo crear la videollamada. Intenta de nuevo.")

    return nombre, r.json().get("url", ""), vence


def token_para(sala, nombre_usuario, vence):
    """Token de reunión para un participante autorizado."""

    if modo_simulado():
        return "simulado-" + uuid.uuid4().hex

    try:
        r = requests.post(DAILY + "/meeting-tokens", headers=_cabeceras(), timeout=10, json={
            "properties": {
                "room_name": sala,
                "user_name": nombre_usuario,
                "exp": vence,
                "lang": "es",
            },
        })
        r.raise_for_status()

    except requests.RequestException as e:
        log.error("Daily no generó el token: %s", e)
        raise ErrorVideo("No se pudo conectar a la videollamada. Intenta de nuevo.")

    return r.json()["token"]


def borrar_sala(sala):
    """Cierra la sala al terminar (si falla, la sala vence sola)."""

    if modo_simulado():
        return

    try:
        requests.delete(DAILY + "/rooms/" + sala, headers=_cabeceras(), timeout=10)
    except requests.RequestException as e:
        log.warning("No se pudo borrar la sala %s: %s", sala, e)
