"""
Genera database/saludplus_respaldo.sql: copia de respaldo con la
estructura y los datos de ejemplo, lista para restaurar en
MySQL 8 / MariaDB / XAMPP.

Uso:
    python exportar_respaldo.py

Crea una base temporal, le carga los datos de ejemplo
(backend/datos_ejemplo.py), la exporta y la borra.
"""

from datetime import datetime
from pathlib import Path

from pymysql.converters import escape_item

from backend.datos_ejemplo import USUARIOS_PRUEBA, cargar_datos_ejemplo
from backend.db import conectar
from backend.esquema import crear_esquema, sentencias_de_tablas
from config import Config

ARCHIVO = Path(__file__).resolve().parent / "database" / "saludplus_respaldo.sql"

# Orden que respeta las llaves foráneas
TABLAS = [
    "usuarios", "preferencias", "medicamentos", "tomas_medicamento", "citas",
    "estados_emocionales", "actividad_fisica", "agua", "sueno",
]


def main():

    config = {k: getattr(Config, k) for k in dir(Config) if k.isupper()}

    config["DB_NAME"] = "saludplus_exportacion_temporal"

    crear_esquema(config)

    cargar_datos_ejemplo(config, reiniciar=True)

    conexion = conectar(config)

    credenciales = "\n".join(
        f"--     {u['rol']:<8} {u['correo']:<24} {u['clave']}" for u in USUARIOS_PRUEBA
    )

    lineas = [
        "-- =========================================================",
        "--  SALUD+  ·  COPIA DE RESPALDO (estructura + datos de ejemplo)",
        f"--  Generado: {datetime.now():%Y-%m-%d %H:%M}",
        "--  Motor: MySQL 8 / MariaDB 10.6+",
        "--",
        "--  Restaurar:",
        "--     · phpMyAdmin: Importar → este archivo",
        "--     · Consola:    mysql -u root -p < database/saludplus_respaldo.sql",
        "--",
        "--  Usuarios de prueba (rol, correo, contraseña):",
        credenciales,
        "--",
        "--  Nota: las fechas corresponden al día en que se generó el archivo.",
        "--  Para datos con fechas de hoy: python cargar_datos_ejemplo.py --reiniciar",
        "-- =========================================================",
        "",
        "CREATE DATABASE IF NOT EXISTS saludplus",
        "    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;",
        "",
        "USE saludplus;",
        "",
        "SET NAMES utf8mb4;",
        "SET time_zone = '+00:00';",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "",
    ]

    for tabla in reversed(TABLAS):
        lineas.append(f"DROP TABLE IF EXISTS `{tabla}`;")

    lineas.append("")

    for sentencia in sentencias_de_tablas():
        lineas.append(sentencia + ";\n")

    with conexion:

        with conexion.cursor() as cursor:

            for tabla in TABLAS:

                cursor.execute(f"SELECT * FROM `{tabla}` ORDER BY 1")

                filas = cursor.fetchall()

                lineas.append(f"-- ---------- {tabla}: {len(filas)} registros ----------")

                if not filas:
                    lineas.append("")
                    continue

                columnas = ", ".join(f"`{c}`" for c in filas[0].keys())

                valores = ",\n".join(
                    "    (" + ", ".join(escape_item(v, "utf8mb4") for v in fila.values()) + ")"
                    for fila in filas
                )

                lineas.append(f"INSERT INTO `{tabla}` ({columnas}) VALUES\n{valores};\n")

            cursor.execute("DROP DATABASE `saludplus_exportacion_temporal`")

    lineas.append("SET FOREIGN_KEY_CHECKS = 1;")

    ARCHIVO.write_text("\n".join(lineas) + "\n", encoding="utf-8")

    print("✅ Respaldo generado en", ARCHIVO)


if __name__ == "__main__":
    main()
