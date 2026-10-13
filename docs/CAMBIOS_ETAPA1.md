# Salud+ — Etapa 1 terminada (HTML/CSS/JS + localStorage)

## Archivo nuevo: `js/comun.js`
Lo cargan todas las pantallas antes de su propio script. Reúne en un solo lugar:
- **Sesión:** las pantallas privadas mandan al login si no hay sesión. Login y registro mandan al inicio si ya la hay.
- **Navegación:** el botón ← y la barra inferior funcionan igual en todas las pantallas.
- **Datos compartidos:** fechas, horas, tomas de hoy, citas, agua, actividad y sueño.
- **Recordatorios 🔔:** una sola fuente de datos (`obtenerRecordatoriosDeHoy`). La usan la tarjeta, la campana, el texto plano, los avisos automáticos y las notificaciones del celular.
- **Ventanas inferiores y avisos breves:** reemplazan la mayoría de los `alert()`.
- **Validación de formularios:** el error aparece debajo de cada campo.

## 1. Diseño móvil
- Los formularios de medicamento, cita, actividad y sueño ahora se abren como ventana inferior.
- La tarjeta de medicamento ya no se sale de la pantalla.
- El contenido ya no queda tapado por la barra inferior.
- La barra inferior es igual en todas las pantallas.
- Todos los botones y enlaces miden al menos 44 px.
- Los campos usan letra de 16 px para que el celular no haga zoom al escribir.
- En computador, la app se ve como un celular centrado.
- La app se puede instalar en el celular (`manifest.json` + `img/icono.svg`).
- Íconos corregidos en login y registro (antes había un peón de ajedrez ♙).
- El cuadro de texto de Estado emocional ahora muestra "Escribe aquí...".

## 2. Navegación
| Pantalla | ← Volver | Barra activa |
|---|---|---|
| Medicamentos, Citas, Bienestar, Emocional, Historial, Ajustes | Inicio | Inicio / Historial / Ajustes |
| Informes | Pantalla de la que viniste (Ajustes por defecto) | Ajustes |

Si hay una ventana abierta, ← primero la cierra (como en Android).

## 3. Notificaciones
- `mostrarRecordatorios()` (tarjeta) y `mostrarNotificaciones()` (campana) usan los mismos datos reales.
- Formato de los recordatorios:
  ```
  🔔 Recordatorios de hoy
  💊 Losartán 50 mg — 8:00 a. m.
  📅 Cita con Dra. Gómez — 10:30 a. m.
  ```
- Desde el panel se puede marcar "Lo tomé / No lo tomé" y deshacer.
- **Aviso automático:** a la hora de cada medicamento y antes de cada cita (30, 60, 120 o 180 min) aparece un aviso arriba. También llega como notificación del celular si se activa en Ajustes → Recordatorios.
- La campana de cada medicamento ya funciona (antes llamaba una función que no existía).

## 4. Datos
- Lo que se registra se refleja en Dashboard, Bienestar, Historial e Informes, incluso entre pestañas.
- **Agua:** se reinicia cada día y el día anterior queda en el historial.
- **Actividad física:** cuenta los últimos 7 días reales (antes contaba los últimos 7 registros).
- **Sueño:** guarda un registro por día y muestra el promedio real de 7 días.
- **Citas:** Bienestar muestra cumplidas/total, sin contar las canceladas. Las citas pasadas sin confirmar preguntan "¿Asististe?".
- **Medicamentos:** una toma por día (no se duplica), con opción de deshacer, editar y eliminar.
- **Historial:** reúne todo con filtros: Todo, Emocional, Medicamentos, Citas y Bienestar.
- Los textos escritos por el usuario se escapan para que no rompan la pantalla.

## 5. Formularios
| Formulario | Validaciones |
|---|---|
| Registro | Nombre solo con letras (mín. 3), correo válido, contraseña ≥ 6 sin espacios, confirmación igual |
| Login | Correo válido; verifica que la cuenta exista y que la contraseña coincida |
| Medicamento | Nombre ≥ 2 letras, la dosis debe tener un número, cantidad y hora obligatorias, sin duplicados |
| Cita | Médico solo con letras, fecha desde hoy (máx. 2 años), hora futura, sin dos citas a la misma hora |
| Emocional | Hay que elegir una carita; máximo 300 caracteres |
| Actividad | Tipo obligatorio, de 5 a 300 minutos enteros, una por día |
| Sueño | De 1 a 16 horas, en horas enteras o medias |
| Perfil | Nombre válido |

## 6. Cerrar sesión
Borra solo `sesionActiva` y los avisos del día. Los medicamentos, citas y registros se conservan. Después de salir, las pantallas privadas ya no se pueden abrir.

---

# Preparación para la Etapa 2: Flask + MySQL

Claves de `localStorage` y la tabla que les corresponde:

| localStorage | Tabla MySQL sugerida | Campos |
|---|---|---|
| `cuentaUsuario` | `usuarios` | id, nombre, correo (único), clave_hash, creado_en |
| `medicamentos` | `medicamentos` | id, usuario_id, nombre, dosis, cantidad, hora (TIME), activo |
| `seguimientoMedicamentos` | `tomas_medicamento` | id, medicamento_id, fecha (DATE), estado ENUM('tomado','no_tomado'), registrado_en |
| `citasMedicas` | `citas` | id, usuario_id, medico, especialidad, fecha, hora, lugar, estado ENUM('pendiente','cumplida','cancelada') |
| `registrosEmocionales` | `estados_emocionales` | id, usuario_id, emocion, comentario, registrado_en |
| `actividadFisica` | `actividad_fisica` | id, usuario_id, fecha, tipo, minutos |
| `aguaConsumida` + `historialAgua` | `agua` | id, usuario_id, fecha, vasos |
| `registrosSueno` | `sueno` | id, usuario_id, fecha, horas |
| `preferenciasRecordatorios` | `preferencias` | usuario_id, avisos_app, notificaciones, minutos_cita |

Puntos a cambiar en la Etapa 2:
- `leerLista()` y `guardarLista()` (en `comun.js`) pasan a usar `fetch()` contra la API de Flask.
- `hashClave()` es solo para el prototipo. En Flask se usa `werkzeug.security.generate_password_hash` y `check_password_hash`.
- `sesionActiva` se reemplaza por la sesión de Flask (`session` o Flask-Login).
- "Continuar con Google" y "¿Olvidaste tu contraseña?" ya muestran un mensaje; se activan con el servidor.
