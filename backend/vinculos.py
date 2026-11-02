"""
Vínculo adulto mayor ↔ cuidador (RF-01) y panel del cuidador (RF-02).

Rutas del adulto mayor (rol 'usuario'):
    POST   /api/vinculos/codigo         genera un código de 6 dígitos (vence en 24 h)
    DELETE /api/vinculos/codigo         cancela el código pendiente
Rutas del cuidador (rol 'cuidador'):
    POST   /api/vinculos/aceptar        ingresa el código {codigo}
Ambos:
    GET    /api/vinculos                personas vinculadas (y código pendiente)
    DELETE /api/vinculos/<id>           revocar el vínculo

Panel del cuidador (solo lectura, exige vínculo activo):
    GET    /api/cuidador/personas                     resumen del día de cada persona
    GET    /api/cuidador/personas/<id>/informe        informe de 7 días
    GET    /api/cuidador/alertas                      tomas omitidas recientes
"""

import secrets
import time
from datetime import datetime, timedelta
from functools import wraps

import pymysql
from flask import Blueprint, g

from .auth import login_requerido
from .db import consultar, ejecutar
from .utilidades import (
    ahora_local,
    ahora_utc,
    datos_json,
    error,
    hora_12,
    ok,
    serializar,
    texto,
    local_a_utc,
    utc_a_local,
)

bp = Blueprint("vinculos", __name__)

HORAS_VIGENCIA_CODIGO = 24

# Límite de intentos para adivinar códigos (en memoria)
INTENTOS_MAXIMOS = 5
BLOQUEO_SEGUNDOS = 10 * 60
_intentos = {}


# =========================================================
#   PERMISOS
# =========================================================

def rol_requerido(*roles):

    def decorador(funcion):

        @wraps(funcion)
        @login_requerido
        def envoltura(*args, **kwargs):

            if g.usuario.get("rol") not in roles:
                return error("Esta opción no está disponible para tu tipo de cuenta.", 403)

            return funcion(*args, **kwargs)

        return envoltura

    return decorador


def puede_ver(cuidador_id, adulto_id):
    """¿Existe un vínculo ACTIVO entre este cuidador y este adulto?"""

    return consultar(
        "SELECT id FROM vinculos_cuidado WHERE cuidador_id = %s AND adulto_id = %s AND estado = 'activo'",
        (cuidador_id, adulto_id),
        uno=True,
    ) is not None


def cuidadores_activos(adulto_id):

    return consultar(
        "SELECT u.id, u.nombre, u.correo FROM vinculos_cuidado v JOIN usuarios u ON u.id = v.cuidador_id "
        "WHERE v.adulto_id = %s AND v.estado = 'activo' ORDER BY u.nombre",
        (adulto_id,),
    )


def adultos_vinculados(cuidador_id):

    return consultar(
        "SELECT u.id, u.nombre, u.correo, v.id AS vinculo_id, v.vinculado_en "
        "FROM vinculos_cuidado v JOIN usuarios u ON u.id = v.adulto_id "
        "WHERE v.cuidador_id = %s AND v.estado = 'activo' ORDER BY u.nombre",
        (cuidador_id,),
    )


# =========================================================
#   CÓDIGO DE VINCULACIÓN (adulto mayor)
# =========================================================

@bp.post("/api/vinculos/codigo")
@rol_requerido("usuario")
def generar_codigo():

    adulto_id = g.usuario["id"]

    # Un solo código pendiente por adulto: el anterior se reemplaza
    ejecutar("DELETE FROM vinculos_cuidado WHERE adulto_id = %s AND estado = 'pendiente'", (adulto_id,))

    # Libera códigos vencidos de cualquier usuario
    ejecutar("DELETE FROM vinculos_cuidado WHERE estado = 'pendiente' AND codigo_vence < UTC_TIMESTAMP()")

    vence = ahora_utc() + timedelta(hours=HORAS_VIGENCIA_CODIGO)

    for _ in range(10):

        codigo = f"{secrets.randbelow(10 ** 6):06d}"

        try:
            ejecutar(
                "INSERT INTO vinculos_cuidado (adulto_id, codigo, codigo_vence) VALUES (%s, %s, %s)",
                (adulto_id, codigo, vence),
            )
            return ok({"codigo": codigo, "vence": vence.isoformat(timespec="seconds") + "Z"}, 201)

        except pymysql.err.IntegrityError:
            continue        # el código ya existe: se intenta con otro

    return error("No se pudo generar el código. Intenta de nuevo.", 500)


@bp.delete("/api/vinculos/codigo")
@rol_requerido("usuario")
def cancelar_codigo():

    ejecutar("DELETE FROM vinculos_cuidado WHERE adulto_id = %s AND estado = 'pendiente'", (g.usuario["id"],))

    return ok({"mensaje": "Código cancelado."})


# =========================================================
#   ACEPTAR CÓDIGO (cuidador)
# =========================================================

@bp.post("/api/vinculos/aceptar")
@rol_requerido("cuidador")
def aceptar():

    cuidador_id = g.usuario["id"]

    registro = _intentos.get(cuidador_id)

    if registro and registro["bloqueado_hasta"] > time.time():
        minutos = int((registro["bloqueado_hasta"] - time.time()) // 60) + 1
        return error(f"Demasiados intentos. Espera {minutos} minuto(s).", 429, campo="codigo")

    codigo = texto(datos_json(), "codigo").replace(" ", "")

    if len(codigo) != 6 or not codigo.isdigit():
        return error("El código tiene 6 números.", 400, campo="codigo")

    pendiente = consultar(
        "SELECT v.id, v.adulto_id, u.nombre FROM vinculos_cuidado v JOIN usuarios u ON u.id = v.adulto_id "
        "WHERE v.codigo = %s AND v.estado = 'pendiente' AND v.codigo_vence > UTC_TIMESTAMP()",
        (codigo,),
        uno=True,
    )

    if not pendiente:

        registro = _intentos.setdefault(cuidador_id, {"fallos": 0, "bloqueado_hasta": 0})
        registro["fallos"] += 1

        if registro["fallos"] >= INTENTOS_MAXIMOS:
            registro["fallos"] = 0
            registro["bloqueado_hasta"] = time.time() + BLOQUEO_SEGUNDOS

        return error("El código no es válido o ya venció. Pide uno nuevo.", 400, campo="codigo")

    _intentos.pop(cuidador_id, None)

    if pendiente["adulto_id"] == cuidador_id:
        return error("No puedes vincularte contigo mismo.", 400, campo="codigo")

    existente = consultar(
        "SELECT id, estado FROM vinculos_cuidado WHERE adulto_id = %s AND cuidador_id = %s",
        (pendiente["adulto_id"], cuidador_id),
        uno=True,
    )

    if existente and existente["estado"] == "activo":
        ejecutar("DELETE FROM vinculos_cuidado WHERE id = %s", (pendiente["id"],))
        return error("Ya cuidas a " + pendiente["nombre"] + ".", 409, campo="codigo")

    if existente:
        # Se reactiva el vínculo revocado (llave única adulto + cuidador)
        ejecutar(
            "UPDATE vinculos_cuidado SET estado = 'activo', vinculado_en = UTC_TIMESTAMP() WHERE id = %s",
            (existente["id"],),
        )
        ejecutar("DELETE FROM vinculos_cuidado WHERE id = %s", (pendiente["id"],))

    else:
        ejecutar(
            "UPDATE vinculos_cuidado SET cuidador_id = %s, estado = 'activo', codigo = NULL, "
            "codigo_vence = NULL, vinculado_en = UTC_TIMESTAMP() WHERE id = %s",
            (cuidador_id, pendiente["id"]),
        )

    return ok({"mensaje": "Ahora cuidas a " + pendiente["nombre"] + ".", "adulto": {
        "id": pendiente["adulto_id"], "nombre": pendiente["nombre"]}})


# =========================================================
#   LISTAR Y REVOCAR
# =========================================================

@bp.get("/api/vinculos")
@login_requerido
def listar():

    usuario = g.usuario

    if usuario["rol"] == "cuidador":
        return ok({"adultos": [serializar(a) for a in adultos_vinculados(usuario["id"])]})

    cuidadores = consultar(
        "SELECT v.id AS vinculo_id, v.vinculado_en, u.id, u.nombre, u.correo "
        "FROM vinculos_cuidado v JOIN usuarios u ON u.id = v.cuidador_id "
        "WHERE v.adulto_id = %s AND v.estado = 'activo' ORDER BY u.nombre",
        (usuario["id"],),
    )

    codigo = consultar(
        "SELECT codigo, codigo_vence FROM vinculos_cuidado "
        "WHERE adulto_id = %s AND estado = 'pendiente' AND codigo_vence > UTC_TIMESTAMP()",
        (usuario["id"],),
        uno=True,
    )

    return ok({
        "cuidadores": [serializar(c) for c in cuidadores],
        "codigo_pendiente": {
            "codigo": codigo["codigo"],
            "vence": codigo["codigo_vence"].isoformat(timespec="seconds") + "Z",
        } if codigo else None,
    })


@bp.delete("/api/vinculos/<int:vinculo_id>")
@login_requerido
def revocar(vinculo_id):

    _, filas = ejecutar(
        "UPDATE vinculos_cuidado SET estado = 'revocado' "
        "WHERE id = %s AND estado = 'activo' AND (adulto_id = %s OR cuidador_id = %s)",
        (vinculo_id, g.usuario["id"], g.usuario["id"]),
    )

    if filas == 0:
        return error("El vínculo no existe.", 404)

    return ok({"mensaje": "Vínculo revocado."})


# =========================================================
#   PANEL DEL CUIDADOR (solo lectura)
# =========================================================

def _tomas_del_dia(adulto_id, fecha):
    """Medicamentos activos del adulto y el estado de la toma de ese día."""

    filas = consultar(
        """
        SELECT m.id, m.nombre, m.dosis, m.hora, m.creado_en, t.estado, t.registrado_en
        FROM medicamentos m
        LEFT JOIN tomas_medicamento t ON t.medicamento_id = m.id AND t.fecha = %s
        WHERE m.usuario_id = %s AND m.activo = 1
        ORDER BY m.hora
        """,
        (fecha, adulto_id),
    )

    ahora = ahora_local()

    tomas = []

    for f in filas:

        programada = datetime.combine(fecha, (datetime.min + f["hora"]).time())

        tomas.append({
            "medicamento": f["nombre"] + " " + f["dosis"],
            "hora": hora_12(f["hora"]),
            "estado": f["estado"] or ("atrasada" if programada + timedelta(minutes=30) <= ahora else "pendiente"),
            "registrada": utc_a_local(f["registrado_en"]).strftime("%H:%M") if f["registrado_en"] else None,
        })

    return tomas


def _resumen_del_dia(adulto):

    adulto_id = adulto["id"]

    hoy = ahora_local().date()

    tomas = _tomas_del_dia(adulto_id, hoy)

    proxima_cita = consultar(
        "SELECT medico, especialidad, fecha, hora, lugar FROM citas "
        "WHERE usuario_id = %s AND estado = 'pendiente' AND fecha >= %s ORDER BY fecha, hora LIMIT 1",
        (adulto_id, hoy),
        uno=True,
    )

    emocion = consultar(
        "SELECT emocion, registrado_en FROM estados_emocionales WHERE usuario_id = %s "
        "ORDER BY registrado_en DESC LIMIT 1",
        (adulto_id,),
        uno=True,
    )

    agua = consultar("SELECT vasos FROM agua WHERE usuario_id = %s AND fecha = %s", (adulto_id, hoy), uno=True)

    sueno = consultar("SELECT horas FROM sueno WHERE usuario_id = %s AND fecha = %s", (adulto_id, hoy), uno=True)

    actividad = consultar(
        "SELECT tipo, minutos FROM actividad_fisica WHERE usuario_id = %s AND fecha = %s", (adulto_id, hoy), uno=True
    )

    return {
        "id": adulto_id,
        "nombre": adulto["nombre"],
        "vinculo_id": adulto["vinculo_id"],
        "fecha": hoy.isoformat(),
        "tomas": tomas,
        "tomadas": sum(1 for t in tomas if t["estado"] == "tomado"),
        "omitidas": sum(1 for t in tomas if t["estado"] in ("no_tomado", "atrasada")),
        "proxima_cita": {
            "medico": proxima_cita["medico"],
            "especialidad": proxima_cita["especialidad"],
            "fecha": proxima_cita["fecha"].isoformat(),
            "hora": hora_12(proxima_cita["hora"]),
            "lugar": proxima_cita["lugar"],
        } if proxima_cita else None,
        "emocion": {
            "emocion": emocion["emocion"],
            "registrado_en": emocion["registrado_en"].isoformat(timespec="seconds") + "Z",
        } if emocion else None,
        "agua": agua["vasos"] if agua else 0,
        "sueno": float(sueno["horas"]) if sueno else None,
        "actividad": {"tipo": actividad["tipo"], "minutos": actividad["minutos"]} if actividad else None,
    }


@bp.get("/api/cuidador/personas")
@rol_requerido("cuidador")
def personas():

    return ok({"personas": [_resumen_del_dia(a) for a in adultos_vinculados(g.usuario["id"])]})


@bp.get("/api/cuidador/personas/<int:adulto_id>/informe")
@rol_requerido("cuidador")
def informe(adulto_id):

    if not puede_ver(g.usuario["id"], adulto_id):
        return error("No tienes permiso para ver la información de esta persona.", 403)

    adulto = consultar("SELECT id, nombre FROM usuarios WHERE id = %s", (adulto_id,), uno=True)

    hoy = ahora_local().date()

    desde = hoy - timedelta(days=6)

    medicamentos = consultar(
        "SELECT id, nombre, dosis, cantidad, hora, creado_en FROM medicamentos "
        "WHERE usuario_id = %s AND activo = 1 ORDER BY hora",
        (adulto_id,),
    )

    tomas = consultar(
        "SELECT t.medicamento_id, t.fecha, t.estado FROM tomas_medicamento t "
        "JOIN medicamentos m ON m.id = t.medicamento_id "
        "WHERE m.usuario_id = %s AND t.fecha BETWEEN %s AND %s",
        (adulto_id, desde, hoy),
    )

    por_fecha = {}

    for t in tomas:
        por_fecha.setdefault(t["fecha"], []).append(t)

    def valor_por_fecha(tabla, columna):
        filas = consultar(
            f"SELECT fecha, {columna} AS v FROM {tabla} WHERE usuario_id = %s AND fecha BETWEEN %s AND %s",
            (adulto_id, desde, hoy),
        )
        return {f["fecha"]: f["v"] for f in filas}

    agua = valor_por_fecha("agua", "vasos")
    sueno = valor_por_fecha("sueno", "horas")
    actividad = valor_por_fecha("actividad_fisica", "minutos")

    emociones = consultar(
        "SELECT emocion, comentario, registrado_en FROM estados_emocionales "
        "WHERE usuario_id = %s AND registrado_en >= %s ORDER BY registrado_en",
        (adulto_id, local_a_utc(datetime.combine(desde, datetime.min.time()))),
    )

    dias = []

    total_programadas = total_tomadas = 0

    for n in range(7):

        fecha = desde + timedelta(days=n)

        # Medicamentos que ya existían ese día
        programadas = sum(1 for m in medicamentos if utc_a_local(m["creado_en"]).date() <= fecha)

        registros = por_fecha.get(fecha, [])

        tomadas = sum(1 for r in registros if r["estado"] == "tomado")

        emociones_dia = [e["emocion"] for e in emociones if utc_a_local(e["registrado_en"]).date() == fecha]

        if fecha < hoy:
            total_programadas += programadas
            total_tomadas += tomadas

        dias.append({
            "fecha": fecha.isoformat(),
            "programadas": programadas,
            "tomadas": tomadas,
            "no_tomadas": sum(1 for r in registros if r["estado"] == "no_tomado"),
            "agua": agua.get(fecha),
            "sueno": float(sueno[fecha]) if fecha in sueno else None,
            "actividad": actividad.get(fecha),
            "emocion": emociones_dia[-1] if emociones_dia else None,
        })

    citas = consultar(
        "SELECT medico, especialidad, fecha, hora, lugar FROM citas "
        "WHERE usuario_id = %s AND estado = 'pendiente' AND fecha >= %s ORDER BY fecha, hora LIMIT 5",
        (adulto_id, hoy),
    )

    return ok({"informe": {
        "persona": {"id": adulto["id"], "nombre": adulto["nombre"]},
        "desde": desde.isoformat(),
        "hasta": hoy.isoformat(),
        "cumplimiento": round(total_tomadas * 100 / total_programadas) if total_programadas else None,
        "dias": dias,
        "medicamentos": [
            {"nombre": m["nombre"], "dosis": m["dosis"], "cantidad": m["cantidad"], "hora": hora_12(m["hora"])}
            for m in medicamentos
        ],
        "emociones": [
            {"emocion": e["emocion"], "comentario": e["comentario"],
             "registrado_en": e["registrado_en"].isoformat(timespec="seconds") + "Z"}
            for e in emociones
        ],
        "citas": [
            {"medico": c["medico"], "especialidad": c["especialidad"], "fecha": c["fecha"].isoformat(),
             "hora": hora_12(c["hora"]), "lugar": c["lugar"]}
            for c in citas
        ],
    }})


@bp.get("/api/cuidador/alertas")
@rol_requerido("cuidador")
def alertas():

    filas = consultar(
        """
        SELECT a.fecha, a.enviada_en, m.nombre AS medicamento, m.dosis, m.hora, u.id AS adulto_id, u.nombre AS adulto
        FROM alertas_enviadas a
        JOIN medicamentos m ON m.id = a.medicamento_id
        JOIN usuarios u ON u.id = m.usuario_id
        JOIN vinculos_cuidado v ON v.adulto_id = u.id AND v.cuidador_id = %s AND v.estado = 'activo'
        WHERE a.tipo = 'toma_omitida' AND a.enviada_en >= UTC_TIMESTAMP() - INTERVAL 7 DAY
        ORDER BY a.enviada_en DESC
        LIMIT 20
        """,
        (g.usuario["id"],),
    )

    return ok({"alertas": [{
        "adulto": f["adulto"],
        "adulto_id": f["adulto_id"],
        "medicamento": f["medicamento"] + " " + f["dosis"],
        "hora": hora_12(f["hora"]),
        "fecha": f["fecha"].isoformat(),
        "enviada_en": f["enviada_en"].isoformat(timespec="seconds") + "Z",
    } for f in filas]})
