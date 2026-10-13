"""
Panel de administración (solo rol 'admin').

    GET /api/admin/resumen     estadísticas generales del sistema
    GET /api/admin/usuarios    usuarios registrados y su actividad

Por privacidad, el administrador ve totales y conteos, no el
contenido de los registros de salud de cada persona.
"""

from flask import Blueprint

from .auth import admin_requerido
from .db import consultar
from .utilidades import ok, serializar

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def valor(sql, parametros=()):

    fila = consultar(sql, parametros, uno=True)

    return list(fila.values())[0] if fila else 0


@bp.get("/resumen")
@admin_requerido
def resumen():

    tomas_7 = consultar(
        "SELECT estado, COUNT(*) AS n FROM tomas_medicamento "
        "WHERE fecha >= UTC_DATE() - INTERVAL 7 DAY GROUP BY estado"
    )

    tomadas = sum(f["n"] for f in tomas_7 if f["estado"] == "tomado")
    total_tomas = sum(f["n"] for f in tomas_7)

    citas = {f["estado"]: f["n"] for f in consultar(
        "SELECT estado, COUNT(*) AS n FROM citas GROUP BY estado"
    )}

    emociones = {f["emocion"]: f["n"] for f in consultar(
        "SELECT emocion, COUNT(*) AS n FROM estados_emocionales "
        "WHERE registrado_en >= UTC_TIMESTAMP() - INTERVAL 30 DAY GROUP BY emocion"
    )}

    return ok({
        "resumen": {
            "usuarios": valor("SELECT COUNT(*) FROM usuarios"),
            "administradores": valor("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'"),
            "nuevos_7_dias": valor(
                "SELECT COUNT(*) FROM usuarios WHERE creado_en >= UTC_TIMESTAMP() - INTERVAL 7 DAY"
            ),
            "medicamentos_activos": valor("SELECT COUNT(*) FROM medicamentos WHERE activo = 1"),
            "tomas_7_dias": total_tomas,
            "cumplimiento_7_dias": round(tomadas * 100 / total_tomas) if total_tomas else 0,
            "citas": {
                "pendiente": citas.get("pendiente", 0),
                "cumplida": citas.get("cumplida", 0),
                "cancelada": citas.get("cancelada", 0),
            },
            "emociones_30_dias": {
                e: emociones.get(e, 0) for e in ("Muy bien", "Bien", "Regular", "Mal", "Muy mal")
            },
            "registros_bienestar_7_dias": {
                "actividad": valor(
                    "SELECT COUNT(*) FROM actividad_fisica WHERE fecha >= UTC_DATE() - INTERVAL 7 DAY"
                ),
                "agua": valor("SELECT COUNT(*) FROM agua WHERE fecha >= UTC_DATE() - INTERVAL 7 DAY"),
                "sueno": valor("SELECT COUNT(*) FROM sueno WHERE fecha >= UTC_DATE() - INTERVAL 7 DAY"),
            },
        }
    })


@bp.get("/usuarios")
@admin_requerido
def usuarios():

    filas = consultar(
        """
        SELECT u.id, u.nombre, u.correo, u.rol, u.creado_en,
               (SELECT COUNT(*) FROM medicamentos m
                 WHERE m.usuario_id = u.id AND m.activo = 1)            AS medicamentos,
               (SELECT COUNT(*) FROM citas c WHERE c.usuario_id = u.id)  AS citas,
               (SELECT COUNT(*) FROM estados_emocionales e
                 WHERE e.usuario_id = u.id)                              AS registros_emocionales,
               (SELECT MAX(t.registrado_en) FROM tomas_medicamento t
                  JOIN medicamentos m2 ON m2.id = t.medicamento_id
                 WHERE m2.usuario_id = u.id)                             AS ultima_toma
        FROM usuarios u
        ORDER BY u.creado_en DESC
        """
    )

    return ok({"usuarios": [serializar(f) for f in filas]})
