"""
Medicamentos y tomas ("Lo tomé" / "No lo tomé").

Rutas (todas requieren sesión):
    GET    /api/medicamentos             lista de medicamentos activos
    POST   /api/medicamentos             crear
    PUT    /api/medicamentos/<id>        editar
    DELETE /api/medicamentos/<id>        eliminar (se conserva el historial)

    GET    /api/tomas?dias=90            historial de tomas
    PUT    /api/tomas                    registrar / cambiar la toma de un día
    DELETE /api/tomas?medicamento_id=&fecha=   deshacer
"""

from flask import Blueprint, g, request

from .auth import login_requerido
from .db import consultar, ejecutar
from .utilidades import datos_json, error, ok, serializar, texto
from .validaciones import ErrorValidacion, validar_fecha_toma, validar_medicamento

bp = Blueprint("medicamentos", __name__, url_prefix="/api")


COLUMNAS_MEDICAMENTO = "id, nombre, dosis, cantidad, hora, creado_en, actualizado_en"


def buscar_medicamento(medicamento_id, usuario_id, solo_activos=True):

    sql = "SELECT " + COLUMNAS_MEDICAMENTO + " FROM medicamentos WHERE id = %s AND usuario_id = %s"

    if solo_activos:
        sql += " AND activo = 1"

    return consultar(sql, (medicamento_id, usuario_id), uno=True)


def leer_medicamento_del_cuerpo():

    datos = datos_json()

    valores = {
        "nombre": texto(datos, "nombre"),
        "dosis": texto(datos, "dosis"),
        "cantidad": texto(datos, "cantidad"),
        "hora": texto(datos, "hora"),
    }

    validar_medicamento(**valores)

    return valores


def hay_duplicado(usuario_id, nombre, hora, excluir_id=None):

    sql = """
        SELECT id FROM medicamentos
        WHERE usuario_id = %s AND activo = 1
          AND LOWER(nombre) = LOWER(%s) AND hora = %s
    """

    parametros = [usuario_id, nombre, hora]

    if excluir_id:
        sql += " AND id <> %s"
        parametros.append(excluir_id)

    return consultar(sql, parametros, uno=True) is not None


# =========================================================
#   MEDICAMENTOS
# =========================================================

@bp.get("/medicamentos")
@login_requerido
def listar_medicamentos():

    filas = consultar(
        "SELECT " + COLUMNAS_MEDICAMENTO + " FROM medicamentos "
        "WHERE usuario_id = %s AND activo = 1 ORDER BY hora, nombre",
        (g.usuario["id"],),
    )

    return ok({"medicamentos": [serializar(f) for f in filas]})


@bp.post("/medicamentos")
@login_requerido
def crear_medicamento():

    try:
        m = leer_medicamento_del_cuerpo()
    except ErrorValidacion as e:
        return error(e.mensaje, 400, campo=e.campo)

    if hay_duplicado(g.usuario["id"], m["nombre"], m["hora"]):
        return error("Ya tienes " + m["nombre"] + " registrado a esa hora.", 409, campo="hora")

    nuevo_id, _ = ejecutar(
        "INSERT INTO medicamentos (usuario_id, nombre, dosis, cantidad, hora) "
        "VALUES (%s, %s, %s, %s, %s)",
        (g.usuario["id"], m["nombre"], m["dosis"], m["cantidad"], m["hora"]),
    )

    return ok({"medicamento": serializar(buscar_medicamento(nuevo_id, g.usuario["id"]))}, 201)


@bp.put("/medicamentos/<int:medicamento_id>")
@login_requerido
def editar_medicamento(medicamento_id):

    if not buscar_medicamento(medicamento_id, g.usuario["id"]):
        return error("El medicamento no existe.", 404)

    try:
        m = leer_medicamento_del_cuerpo()
    except ErrorValidacion as e:
        return error(e.mensaje, 400, campo=e.campo)

    if hay_duplicado(g.usuario["id"], m["nombre"], m["hora"], excluir_id=medicamento_id):
        return error("Ya tienes " + m["nombre"] + " registrado a esa hora.", 409, campo="hora")

    ejecutar(
        "UPDATE medicamentos SET nombre = %s, dosis = %s, cantidad = %s, hora = %s "
        "WHERE id = %s AND usuario_id = %s",
        (m["nombre"], m["dosis"], m["cantidad"], m["hora"], medicamento_id, g.usuario["id"]),
    )

    return ok({"medicamento": serializar(buscar_medicamento(medicamento_id, g.usuario["id"]))})


@bp.delete("/medicamentos/<int:medicamento_id>")
@login_requerido
def eliminar_medicamento(medicamento_id):

    _, filas = ejecutar(
        "UPDATE medicamentos SET activo = 0 WHERE id = %s AND usuario_id = %s AND activo = 1",
        (medicamento_id, g.usuario["id"]),
    )

    if filas == 0:
        return error("El medicamento no existe.", 404)

    return ok({"mensaje": "Medicamento eliminado."})


# =========================================================
#   TOMAS
# =========================================================

SQL_TOMAS = """
    SELECT t.id, t.medicamento_id, t.fecha, t.hora_programada, t.estado,
           t.registrado_en, m.nombre, m.dosis, m.cantidad
    FROM tomas_medicamento t
    JOIN medicamentos m ON m.id = t.medicamento_id
    WHERE m.usuario_id = %s
"""


@bp.get("/tomas")
@login_requerido
def listar_tomas():

    try:
        dias = min(max(int(request.args.get("dias", 90)), 1), 730)
    except ValueError:
        dias = 90

    filas = consultar(
        SQL_TOMAS + " AND t.fecha >= CURDATE() - INTERVAL %s DAY ORDER BY t.fecha, t.registrado_en",
        (g.usuario["id"], dias),
    )

    return ok({"tomas": [serializar(f) for f in filas]})


@bp.put("/tomas")
@login_requerido
def registrar_toma():

    datos = datos_json()

    estado = texto(datos, "estado")

    if estado not in ("tomado", "no_tomado"):
        return error("El estado debe ser 'tomado' o 'no_tomado'.", 400, campo="estado")

    try:
        medicamento_id = int(datos.get("medicamento_id"))
        fecha = validar_fecha_toma(texto(datos, "fecha"))
    except (TypeError, ValueError):
        return error("Medicamento no válido.", 400, campo="medicamento_id")
    except ErrorValidacion as e:
        return error(e.mensaje, 400, campo=e.campo)

    medicamento = buscar_medicamento(medicamento_id, g.usuario["id"])

    if not medicamento:
        return error("El medicamento no existe.", 404)

    # Una toma por día: si ya existe, se actualiza
    ejecutar(
        """
        INSERT INTO tomas_medicamento (medicamento_id, fecha, hora_programada, estado)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            estado = VALUES(estado),
            hora_programada = VALUES(hora_programada),
            registrado_en = CURRENT_TIMESTAMP
        """,
        (medicamento_id, fecha, medicamento["hora"], estado),
    )

    toma = consultar(
        SQL_TOMAS + " AND t.medicamento_id = %s AND t.fecha = %s",
        (g.usuario["id"], medicamento_id, fecha),
        uno=True,
    )

    return ok({"toma": serializar(toma)})


@bp.delete("/tomas")
@login_requerido
def deshacer_toma():

    try:
        medicamento_id = int(request.args.get("medicamento_id", ""))
        fecha = validar_fecha_toma(request.args.get("fecha", ""))
    except (TypeError, ValueError):
        return error("Medicamento no válido.", 400)
    except ErrorValidacion as e:
        return error(e.mensaje, 400, campo=e.campo)

    if not buscar_medicamento(medicamento_id, g.usuario["id"], solo_activos=False):
        return error("El medicamento no existe.", 404)

    ejecutar(
        "DELETE FROM tomas_medicamento WHERE medicamento_id = %s AND fecha = %s",
        (medicamento_id, fecha),
    )

    return ok({"mensaje": "Registro deshecho."})
