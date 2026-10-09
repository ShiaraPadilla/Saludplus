"""
Validaciones del lado del servidor.

Son las mismas reglas que tiene el frontend (js/comun.js), pero aquí
son obligatorias: aunque alguien salte el JavaScript, el servidor
no guarda datos vacíos ni incorrectos.
"""

import re
from datetime import datetime, timedelta, timezone

RE_CORREO = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
RE_NOMBRE = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$")
RE_LETRA = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]")
RE_HORA = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
RE_FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ErrorValidacion(Exception):

    def __init__(self, campo, mensaje):
        super().__init__(mensaje)
        self.campo = campo
        self.mensaje = mensaje


def contar_letras(valor):
    return len(RE_LETRA.findall(valor))


def requerir(condicion, campo, mensaje):
    if not condicion:
        raise ErrorValidacion(campo, mensaje)


# ---------- Usuarios ----------

def validar_nombre(nombre, campo="nombre"):
    requerir(nombre != "", campo, "Escribe tu nombre.")
    requerir(RE_NOMBRE.match(nombre), campo, "El nombre solo puede tener letras y espacios.")
    requerir(contar_letras(nombre) >= 3, campo, "El nombre debe tener al menos 3 letras.")
    requerir(len(nombre) <= 60, campo, "El nombre es demasiado largo.")


def validar_correo(correo, campo="correo"):
    requerir(correo != "", campo, "Escribe tu correo electrónico.")
    requerir(len(correo) <= 120, campo, "El correo es demasiado largo.")
    requerir(RE_CORREO.match(correo), campo, "El correo no es válido. Ej: maria@correo.com")


def validar_contrasena(contrasena, campo="contrasena"):
    requerir(contrasena != "", campo, "Crea una contraseña.")
    requerir(len(contrasena) >= 6, campo, "Debe tener al menos 6 caracteres.")
    requerir(len(contrasena) <= 128, campo, "La contraseña es demasiado larga.")
    requerir(not re.search(r"\s", contrasena), campo, "No puede tener espacios.")


# ---------- Medicamentos ----------

def validar_medicamento(nombre, dosis, cantidad, hora):
    requerir(nombre != "", "nombre", "Escribe el nombre del medicamento.")
    requerir(contar_letras(nombre) >= 2, "nombre", "El nombre debe tener al menos 2 letras.")
    requerir(len(nombre) <= 40, "nombre", "El nombre es demasiado largo.")

    requerir(dosis != "", "dosis", "Escribe la dosis.")
    requerir(re.search(r"\d", dosis), "dosis", "La dosis debe incluir un número. Ej: 50 mg")
    requerir(len(dosis) <= 20, "dosis", "La dosis es demasiado larga.")

    requerir(cantidad != "", "cantidad", "Escribe la cantidad. Ej: 1 tableta")
    requerir(len(cantidad) <= 30, "cantidad", "La cantidad es demasiado larga.")

    requerir(hora != "", "hora", "Elige la hora de la toma.")
    requerir(RE_HORA.match(hora), "hora", "La hora no es válida.")


def validar_fecha_toma(fecha_texto):
    """
    La fecha la envía el celular (su fecha local). Se acepta solo
    ayer, hoy o mañana respecto a la fecha UTC del servidor, por
    las diferencias de zona horaria (Colombia es UTC-5).
    """

    requerir(RE_FECHA.match(fecha_texto or ""), "fecha", "La fecha no es válida.")

    try:
        fecha = datetime.strptime(fecha_texto, "%Y-%m-%d").date()
    except ValueError:
        raise ErrorValidacion("fecha", "La fecha no es válida.")

    hoy = datetime.now(timezone.utc).date()

    requerir(
        hoy - timedelta(days=1) <= fecha <= hoy + timedelta(days=1),
        "fecha",
        "Solo puedes registrar tomas del día de hoy.",
    )

    return fecha
