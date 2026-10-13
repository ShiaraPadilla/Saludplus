"""
Funciones de apoyo: respuestas JSON y conversión de tipos de MySQL.
"""

from datetime import date, datetime, timedelta

from flask import jsonify, request


def ok(datos=None, codigo=200):

    cuerpo = {"ok": True}

    if datos:
        cuerpo.update(datos)

    return jsonify(cuerpo), codigo


def error(mensaje, codigo=400, campo=None, **extra):
    """
    Error en JSON. "campo" indica qué dato del formulario está mal,
    para que la pantalla muestre el mensaje debajo de ese campo.
    """

    cuerpo = {"ok": False, "error": mensaje}

    if campo:
        cuerpo["campo"] = campo

    cuerpo.update(extra)

    return jsonify(cuerpo), codigo


def datos_json():
    """Cuerpo JSON de la petición (o {} si no viene)."""

    datos = request.get_json(silent=True)

    return datos if isinstance(datos, dict) else {}


def texto(datos, clave):
    """Lee un texto, quita espacios de sobra y nunca devuelve None."""

    valor = datos.get(clave, "")

    if not isinstance(valor, str):
        valor = "" if valor is None else str(valor)

    return " ".join(valor.split())


def hora_a_texto(valor):
    """TIME de MySQL (llega como timedelta) → 'HH:MM'."""

    if isinstance(valor, timedelta):
        minutos = int(valor.total_seconds() // 60)
        return f"{minutos // 60:02d}:{minutos % 60:02d}"

    return str(valor)[:5] if valor is not None else None


def serializar(fila):
    """Convierte fechas y horas de una fila a texto para enviar en JSON."""

    if fila is None:
        return None

    resultado = {}

    for clave, valor in fila.items():

        if isinstance(valor, timedelta):
            resultado[clave] = hora_a_texto(valor)
        elif isinstance(valor, datetime):
            # Se guardan en UTC; la "Z" hace que el celular las muestre en su hora local
            resultado[clave] = valor.isoformat(timespec="seconds") + "Z"
        elif isinstance(valor, date):
            resultado[clave] = valor.isoformat()
        else:
            resultado[clave] = valor

    return resultado
