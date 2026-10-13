"""
Usuarios de prueba y datos de ejemplo para la evaluación.

    Administrador:   admin@saludplus.com  /  Admin2026*
    Usuario regular: maria@saludplus.com  /  Maria2026*
    Usuario regular: jorge@saludplus.com  /  Jorge2026*

Las fechas se calculan a partir de HOY (hora de Colombia), así la app
siempre muestra información reciente.

Se ejecuta:
  · Al arrancar, si CARGAR_DATOS_EJEMPLO=1 (solo si aún no existen).
  · A mano:  python cargar_datos_ejemplo.py  [--reiniciar]
"""

import random
from datetime import datetime, time, timedelta, timezone

import pymysql
from werkzeug.security import generate_password_hash

from .db import conectar

COLOMBIA = timezone(timedelta(hours=-5))      # Colombia no tiene horario de verano

USUARIOS_PRUEBA = [
    {"nombre": "Administrador Salud+", "correo": "admin@saludplus.com", "clave": "Admin2026*", "rol": "admin"},
    {"nombre": "María Rodríguez", "correo": "maria@saludplus.com", "clave": "Maria2026*", "rol": "usuario"},
    {"nombre": "Jorge Pérez", "correo": "jorge@saludplus.com", "clave": "Jorge2026*", "rol": "usuario"},
]

COMENTARIOS = [
    "Dormí bien y salí a caminar con mi nieta.",
    "Me dolió un poco la rodilla, pero tomé mis medicamentos.",
    "Hoy vino mi familia a visitarme.",
    "Me sentí algo cansada en la tarde.",
    "Fui a la cita y todo salió bien.",
    "",
    "Un día tranquilo en casa.",
    "Extraño a mis amigas del grupo de baile.",
]


def a_utc(fecha_local, hora_local):
    """Fecha y hora de Colombia → datetime UTC sin zona (como se guarda en MySQL)."""

    return (
        datetime.combine(fecha_local, hora_local, COLOMBIA)
        .astimezone(timezone.utc)
        .replace(tzinfo=None)
    )


def _crear_usuario(cursor, datos, creado_en):

    cursor.execute(
        "INSERT INTO usuarios (nombre, correo, clave_hash, rol, creado_en) VALUES (%s, %s, %s, %s, %s)",
        (datos["nombre"], datos["correo"], generate_password_hash(datos["clave"]), datos["rol"], creado_en),
    )

    usuario_id = cursor.lastrowid

    cursor.execute("INSERT INTO preferencias (usuario_id) VALUES (%s)", (usuario_id,))

    return usuario_id


def _datos_maria(cursor, usuario_id, hoy, azar):

    # ---- Medicamentos ----
    medicamentos = [
        ("Losartán", "50 mg", "1 tableta", time(8, 0)),
        ("Metformina", "850 mg", "1 tableta", time(13, 0)),
        ("Atorvastatina", "20 mg", "1 tableta", time(20, 0)),
    ]

    ids = []

    for nombre, dosis, cantidad, hora in medicamentos:
        cursor.execute(
            "INSERT INTO medicamentos (usuario_id, nombre, dosis, cantidad, hora, creado_en) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (usuario_id, nombre, dosis, cantidad, hora, a_utc(hoy - timedelta(days=20), time(9, 0))),
        )
        ids.append((cursor.lastrowid, hora))

    # ---- Tomas de los últimos 14 días (~85 % de cumplimiento) ----
    for dias in range(14, 0, -1):

        fecha = hoy - timedelta(days=dias)

        for medicamento_id, hora in ids:

            estado = "tomado" if azar.random() < 0.85 else "no_tomado"

            registrado = (datetime.combine(fecha, hora) + timedelta(minutes=azar.randint(0, 45))).time()

            cursor.execute(
                "INSERT INTO tomas_medicamento (medicamento_id, fecha, hora_programada, estado, registrado_en) "
                "VALUES (%s, %s, %s, %s, %s)",
                (medicamento_id, fecha, hora, estado, a_utc(fecha, registrado)),
            )

    # ---- Citas ----
    citas = [
        (-12, time(9, 30), "Dr. Andrés Martínez", "Medicina general", "Clínica Santa María", "cumplida"),
        (-6, time(15, 0), "Dra. Laura Gómez", "Cardiología", "Clínica Santa María", "cumplida"),
        (-3, time(10, 0), "Dr. Felipe Castro", "Odontología", "Consultorio Dental Sonrisas", "cancelada"),
        (2, time(10, 30), "Dra. Laura Gómez", "Cardiología", "Clínica Santa María", "pendiente"),
        (9, time(8, 0), "Dr. Carlos Ruiz", "Oftalmología", "Centro de Visión del Caribe", "pendiente"),
    ]

    for dias, hora, medico, especialidad, lugar, estado in citas:
        cursor.execute(
            "INSERT INTO citas (usuario_id, medico, especialidad, fecha, hora, lugar, estado) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (usuario_id, medico, especialidad, hoy + timedelta(days=dias), hora, lugar, estado),
        )

    # ---- Estados emocionales ----
    emociones = ["Bien", "Muy bien", "Regular", "Bien", "Mal", "Bien", "Muy bien", "Regular", "Bien", "Muy bien"]

    for posicion, emocion in enumerate(emociones):

        fecha = hoy - timedelta(days=13 - posicion)

        cursor.execute(
            "INSERT INTO estados_emocionales (usuario_id, emocion, comentario, registrado_en) "
            "VALUES (%s, %s, %s, %s)",
            (usuario_id, emocion, azar.choice(COMENTARIOS) or None,
             a_utc(fecha, time(azar.randint(7, 19), azar.randint(0, 59)))),
        )

    # ---- Actividad física: 5 de los últimos 7 días ----
    for dias, tipo, minutos in [(6, "Caminar", 30), (5, "Ejercicios suaves", 20), (3, "Caminar", 45),
                                (2, "Bicicleta", 25), (1, "Caminar", 35)]:
        cursor.execute(
            "INSERT INTO actividad_fisica (usuario_id, fecha, tipo, minutos) VALUES (%s, %s, %s, %s)",
            (usuario_id, hoy - timedelta(days=dias), tipo, minutos),
        )

    # ---- Agua: 14 días anteriores + hoy ----
    for dias in range(14, 0, -1):
        cursor.execute(
            "INSERT INTO agua (usuario_id, fecha, vasos) VALUES (%s, %s, %s)",
            (usuario_id, hoy - timedelta(days=dias), azar.randint(4, 8)),
        )

    cursor.execute("INSERT INTO agua (usuario_id, fecha, vasos) VALUES (%s, %s, %s)", (usuario_id, hoy, 3))

    # ---- Sueño: últimos 7 días ----
    for dias in range(6, -1, -1):
        cursor.execute(
            "INSERT INTO sueno (usuario_id, fecha, horas) VALUES (%s, %s, %s)",
            (usuario_id, hoy - timedelta(days=dias), azar.choice([6, 6.5, 7, 7.5, 8, 8.5])),
        )


def _datos_jorge(cursor, usuario_id, hoy):

    cursor.execute(
        "INSERT INTO medicamentos (usuario_id, nombre, dosis, cantidad, hora) VALUES (%s, %s, %s, %s, %s)",
        (usuario_id, "Enalapril", "10 mg", "1 tableta", time(7, 30)),
    )

    medicamento_id = cursor.lastrowid

    for dias in range(5, 0, -1):
        fecha = hoy - timedelta(days=dias)
        cursor.execute(
            "INSERT INTO tomas_medicamento (medicamento_id, fecha, hora_programada, estado, registrado_en) "
            "VALUES (%s, %s, %s, %s, %s)",
            (medicamento_id, fecha, time(7, 30), "tomado" if dias != 3 else "no_tomado",
             a_utc(fecha, time(7, 40))),
        )

    cursor.execute(
        "INSERT INTO citas (usuario_id, medico, especialidad, fecha, hora, lugar) VALUES (%s, %s, %s, %s, %s, %s)",
        (usuario_id, "Dr. Andrés Martínez", "Medicina general", hoy + timedelta(days=4), time(14, 0),
         "Clínica Santa María"),
    )

    for dias, emocion in [(4, "Regular"), (2, "Bien"), (1, "Bien")]:
        cursor.execute(
            "INSERT INTO estados_emocionales (usuario_id, emocion, registrado_en) VALUES (%s, %s, %s)",
            (usuario_id, emocion, a_utc(hoy - timedelta(days=dias), time(18, 0))),
        )


def cargar_datos_ejemplo(config, reiniciar=False):
    """Crea los usuarios de prueba. Devuelve un texto con el resultado."""

    correos = [u["correo"] for u in USUARIOS_PRUEBA]

    conexion = conectar(config)

    try:
        with conexion.cursor() as cursor:

            if reiniciar:
                # ON DELETE CASCADE borra también todos sus registros
                cursor.execute(
                    "DELETE FROM usuarios WHERE correo IN (%s, %s, %s)", correos
                )

            cursor.execute("SELECT COUNT(*) AS n FROM usuarios WHERE correo IN (%s, %s, %s)", correos)

            if cursor.fetchone()["n"] > 0 and not reiniciar:
                conexion.rollback()
                return "Los usuarios de prueba ya existen (no se modificaron)."

            hoy = datetime.now(COLOMBIA).date()

            azar = random.Random(2026)

            hace_un_mes = a_utc(hoy - timedelta(days=30), time(9, 0))

            ids = {u["correo"]: _crear_usuario(cursor, u, hace_un_mes) for u in USUARIOS_PRUEBA}

            _datos_maria(cursor, ids["maria@saludplus.com"], hoy, azar)

            _datos_jorge(cursor, ids["jorge@saludplus.com"], hoy)

        conexion.commit()

        return "Usuarios de prueba creados: " + ", ".join(correos)

    except pymysql.err.IntegrityError:
        # Otro proceso (otro worker de gunicorn) los creó al mismo tiempo
        conexion.rollback()
        return "Los usuarios de prueba ya existen (creados por otro proceso)."

    except Exception:
        conexion.rollback()
        raise

    finally:
        conexion.close()
