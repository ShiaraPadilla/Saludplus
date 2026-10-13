# 🗄️ Base de datos de Salud+

**Motor:** MySQL 8 (compatible con MariaDB 10.6+). En la nube se aloja en **Aiven for MySQL**.

| Archivo | Contenido |
|---|---|
| `schema.sql` | **Esquema**: las 9 tablas con tipos de datos, llaves primarias, llaves foráneas, llaves únicas y restricciones `CHECK`. |
| `saludplus_respaldo.sql` | **Base de datos con datos de ejemplo** (estructura + datos), lista para restaurar. |
| `diagrama_er.png` | **Diagrama entidad-relación** en alta resolución (4500 px), notación pata de gallo. |
| `diagrama_er_fuente.html` | Fuente editable del diagrama (ábrelo en el navegador). |

---

## Restaurar la base de datos con datos de ejemplo

**phpMyAdmin (XAMPP):** pestaña **Importar** → elige `saludplus_respaldo.sql` → **Continuar**.

**Consola:**
```bash
mysql -u root -p < database/saludplus_respaldo.sql
```

Se crea la base `saludplus` con estos usuarios de prueba:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@saludplus.com` | `Admin2026*` |
| Usuario regular | `maria@saludplus.com` | `Maria2026*` |
| Usuario regular | `jorge@saludplus.com` | `Jorge2026*` |

> Para regenerar los datos con fechas del día de hoy: `python cargar_datos_ejemplo.py --reiniciar`
> Para volver a generar este respaldo: `python exportar_respaldo.py`

---

## Tablas

| Tabla | Guarda | Relación |
|---|---|---|
| `usuarios` | Cuentas: nombre, correo, contraseña cifrada y rol | Entidad principal |
| `medicamentos` | Medicamentos de cada usuario y su hora | usuarios 1 : N |
| `tomas_medicamento` | "Lo tomé / No lo tomé" de cada día | medicamentos 1 : N |
| `citas` | Citas médicas y su estado | usuarios 1 : N |
| `estados_emocionales` | Cómo se siente el usuario y su comentario | usuarios 1 : N |
| `actividad_fisica` | Actividad del día (tipo y minutos) | usuarios 1 : N |
| `agua` | Vasos de agua por día | usuarios 1 : N |
| `sueno` | Horas de sueño por noche | usuarios 1 : N |
| `preferencias` | Configuración de recordatorios | usuarios 1 : 0..1 |

## Reglas de integridad
- **Llaves foráneas con `ON DELETE CASCADE`:** si se elimina un usuario, se borran todos sus registros, sin dejar datos huérfanos.
- **Un registro por día** con llaves únicas compuestas:
  - `tomas_medicamento (medicamento_id, fecha)`
  - `actividad_fisica (usuario_id, fecha)`
  - `agua (usuario_id, fecha)`
  - `sueno (usuario_id, fecha)`
- **Correo único** en `usuarios`.
- **Rangos válidos** con `CHECK`:
  - minutos de actividad entre 5 y 300
  - vasos de agua entre 0 y 8
  - horas de sueño entre 1 y 16
- **Valores cerrados** con `ENUM`: rol, estado de la toma, estado de la cita y emoción.
- **Borrado lógico** de medicamentos (`activo = 0`), para conservar el historial de tomas.
- Contraseñas guardadas con hash **scrypt**, nunca en texto plano.
- Fechas y horas guardadas en **UTC**.

## Normalización (3FN)
- **1FN:** todos los atributos son atómicos. No hay listas ni grupos repetidos: cada toma, cita o vaso de agua es una fila.
- **2FN:** cada tabla tiene llave primaria simple (`id`), y los atributos dependen de la llave completa. En `preferencias`, la llave es `usuario_id`.
- **3FN:** no hay dependencias transitivas.
  - Los datos del usuario están solo en `usuarios`. Las demás tablas guardan únicamente `usuario_id`.
  - Los datos del medicamento están solo en `medicamentos`, y las tomas los referencian por `medicamento_id`.
  - `tomas_medicamento.hora_programada` no rompe la 3FN: es un dato histórico de la toma, la hora que tenía el medicamento **ese día**, que no cambia aunque luego se edite el medicamento.
