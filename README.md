# Salud+ 💚

> **Tu bienestar, nuestra prioridad.** Aplicación web móvil para que los adultos mayores organicen sus medicamentos, citas médicas y bienestar diario.

| | |
|---|---|
| 🌐 **Aplicación desplegada** | **https://saludplus-hdr5.onrender.com/** |
| 📂 **Repositorio** | **https://github.com/ShiaraPadilla/Saludplus** |
| 🎯 **ODS abordado** | **ODS 3 — Salud y bienestar** |
| 🗄️ **Base de datos** | MySQL 8 (Aiven for MySQL) |
| 🎓 **Curso** | Desarrollo Sostenible — Universidad Cooperativa de Colombia |
| 👨‍🏫 **Docente** | Mauricio Ricardo |

> ⏱️ La aplicación usa el plan gratuito de Render: si nadie la ha abierto en 15 minutos, la primera carga tarda cerca de **1 minuto**.

---

## 👥 Integrantes

- **Shiara Padilla**
- **Valentina Hernandez**

---

## 🎯 ODS y problemática

**ODS 3 — Garantizar una vida sana y promover el bienestar para todos en todas las edades.**
Meta relacionada: **3.4**, reducir la mortalidad prematura por enfermedades no transmisibles y promover la salud mental y el bienestar.

Muchos adultos mayores conviven con enfermedades crónicas (hipertensión, diabetes, colesterol alto) que exigen tomar medicamentos a horas fijas y asistir a controles médicos. Olvidar una toma o una cita afecta su salud, y su estado de ánimo y hábitos diarios suelen pasar desapercibidos para la familia.

**Salud+** responde con una app sencilla, de letra grande y botones amplios, que:
- recuerda los medicamentos y registra si se tomaron, midiendo el **cumplimiento del tratamiento**;
- organiza las **citas médicas** y avisa antes de cada una;
- registra el **estado emocional**, la **actividad física**, el **agua** y el **sueño**;
- genera **informes** para compartir con el médico o la familia;
- ofrece un **panel de administración** con indicadores generales del sistema.

---

## ✨ Funcionalidades y vistas

| Vista (Figma) | Pantalla | Funcionalidad |
|---|---|---|
| Pantalla de inicio | `index.html` | Bienvenida a la app |
| Registro / inicio de sesión | `registro.html`, `login.html` | Crear cuenta y entrar, con validaciones |
| Panel principal | `dashboard.html` | Resumen del día, recordatorios 🔔 y accesos rápidos |
| Vista de gestión principal | `medicamentos.html`, `citas.html` | Crear, editar y eliminar medicamentos y citas, y marcar tomas |
| Formulario de ingreso de datos | `emocional.html` y formularios | Estado emocional, medicamentos, citas, actividad, agua y sueño |
| Resultados y reportes | `bienestar.html`, `historial.html`, `informes.html` | Indicadores de 7 días, historial completo, informe exportable (CSV, Excel, impresión) |
| Administración | `admin.html` | Usuarios registrados y estadísticas del sistema (solo rol admin) |

---

## 📹 Requerimiento avanzado: videollamada familiar y rol cuidador

Salud+ conecta al adulto mayor con su familia. Hay **videollamadas privadas** con un toque, un rol **cuidador** que recibe alertas cuando no se registra una toma, y **recordatorios leídos en voz alta**.

| ID | Requerimiento | Cómo se cumple | Dónde |
|---|---|---|---|
| RF-01 | Vincular cuidador | El adulto genera un código de 6 dígitos con `secrets.randbelow` que vence en 24 h. El cuidador lo ingresa y queda vinculado, y el adulto puede revocarlo. Tras 5 códigos incorrectos se bloquea 10 min (contra fuerza bruta). | Ajustes → Mi cuidador · `backend/vinculos.py` |
| RF-02 | Panel del cuidador | Resumen del día e informe de 7 días de cada persona, en **solo lectura**. Todo está protegido con `puede_ver(cuidador, adulto)`. | `panel-cuidador.html` · `/api/cuidador/...` |
| RF-03 | Sala de video privada | Desde una cita o el botón «Llamar a mi familiar», Flask crea una sala **privada** en Daily que expira en 60 min. Cada participante pide su propio token, y quien no participa recibe **403**. | `backend/llamadas.py`, `backend/video.py` |
| RF-04 | Llamada entrante | Notificación **push** (Web Push con claves VAPID) que abre `/llamada/<id>` con un toque, con botones *Contestar / Ahora no*. **Compatible con Android:** urgencia alta (`Urgency: high`, para que llegue aunque el teléfono ahorre batería), íconos PNG, ícono monocromático para la barra de estado y renovación automática de la suscripción. Con la app abierta aparece la pantalla de llamada entrante. | `backend/push.py`, `frontend/sw.js` |
| RF-05 | Interfaz accesible | Botones de contestar y colgar de **84 px**, alto contraste y sin pantallas intermedias (`enable_prejoin_ui: false`). | `llamada.html` |
| RF-06 | Alerta de toma omitida | `POST /tareas/revisar-tomas`, protegida con el encabezado secreto `X-Tarea-Secreta`, se ejecuta cada 5 min desde cron-job.org. **Una sola alerta** por toma, gracias a la llave primaria de `alertas_enviadas`. | `backend/tareas.py` |
| RF-07 | Recordatorio por voz | Web Speech API (`speechSynthesis`) en español, más lento para adultos mayores. Se activa en Ajustes → Recordatorios. | `frontend/js/comun.js` |
| RF-08 | Registro de llamadas | Cada llamada guarda participantes, cita, estado, inicio, fin y duración. | Tabla `llamadas` · Ajustes → Historial de llamadas |

**Diagramas:**
- [Diagrama E-R actualizado (13 tablas)](database/diagrama_er.png)
- [Diagrama de secuencia de la llamada](docs/diagrama_secuencia_llamada.png)

**Decisiones técnicas (diferencias con el documento técnico):**
- **Llaves `INT UNSIGNED` en lugar de `BIGINT`:** MySQL exige que una llave foránea tenga el mismo tipo que la columna referenciada (`usuarios.id`).
- **`alertas_enviadas` usa la llave `(medicamento_id, fecha, tipo)`:** el modelo no tiene una tabla de "tomas programadas", y esta llave garantiza la regla de una sola alerta por toma.
- **Tokens bajo demanda:** cada token se crea cuando su participante lo pide, no los dos al crear la sala. Así nunca existe un token que nadie autorizado haya solicitado.
- **Modo simulado:** sin `DAILY_API_KEY`, la app sigue funcionando y muestra un aviso en la pantalla de llamada. Esto permite probarla sin la cuenta de Daily.
- **Privacidad:** el cuidador solo ve la información del informe de 7 días: tomas, citas, estado de ánimo con sus comentarios, agua, actividad y sueño. No puede modificar nada. Antes de vincularse, el adulto mayor ve en "Mi cuidador" exactamente qué podrá ver su cuidador, y puede revocar el vínculo cuando quiera.

---

## 🔑 Credenciales de prueba

| Rol | Correo | Contraseña | Qué puede revisar |
|---|---|---|---|
| **Administrador** | `admin@saludplus.com` | `Admin2026*` | Panel de administración (Ajustes → Panel de administración) |
| **Usuario regular** | `maria@saludplus.com` | `Maria2026*` | Todas las funciones, con 2 semanas de datos de ejemplo |
| Usuario regular | `jorge@saludplus.com` | `Jorge2026*` | Usuario con pocos datos (sirve para probar el vínculo con un código nuevo) |
| **Cuidador** | `carlos@saludplus.com` | `Carlos2026*` | Panel del cuidador: cuida a María, ve su informe, recibe alertas y videollamadas |

Estos usuarios se crean automáticamente al desplegar (`CARGAR_DATOS_EJEMPLO=1`).

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | HTML5, CSS3, JavaScript (sin frameworks), diseño móvil, instalable como app (PWA) |
| Lógica de negocio | Python 3.12, **Flask 3** (API REST en JSON) |
| Base de datos | **MySQL 8**, conexión con PyMySQL (consultas parametrizadas, SSL) |
| Seguridad | Werkzeug (hash scrypt), sesiones con cookie firmada `HttpOnly` |
| Servidor | Gunicorn |
| Videollamadas | **Daily.co** (API REST + `daily-js`), salas privadas con tokens |
| Notificaciones | **Web Push** con `pywebpush` y claves VAPID; service worker (`sw.js`) |
| Voz | **Web Speech API** (`speechSynthesis`, español `es-CO`) |
| Tareas programadas | Ruta protegida llamada cada 5 min por **cron-job.org** |
| Despliegue | **Render** (aplicación) + **Aiven for MySQL** (base de datos), vinculado a GitHub |
| Diseño | Figma |

### Arquitectura
```
┌──────────── Celular / navegador ────────────┐
│  HTML + CSS + JS  (frontend/)                │
│  copia local en localStorage (caché)         │
└──────────────┬───────────────────────────────┘
               │  fetch()  JSON  ·  HTTPS
┌──────────────▼───────────────────────────────┐
│  Flask + Gunicorn  (backend/)   ── Render    │
│  auth · medicamentos · citas · bienestar     │
│  admin · validaciones · sesiones             │
└──────────────┬───────────────────────────────┘
               │  PyMySQL · SSL
┌──────────────▼───────────────────────────────┐
│  MySQL 8  (database/schema.sql)  ── Aiven    │
└──────────────────────────────────────────────┘
```

---

## 📁 Estructura del repositorio

```
SaludPlus/
├── README.md                ← este archivo
├── DESPLIEGUE.md            ← guía para publicar en Render + Aiven
├── .env.example             ← variables de entorno (sin valores reales)
├── .gitignore
├── app.py                   ← punto de entrada (python app.py)
├── config.py                ← configuración desde variables de entorno
├── requirements.txt
├── render.yaml              ← despliegue automático en Render
├── Procfile · .python-version
├── iniciar_bd.py            ← crea la base de datos y las tablas
├── cargar_datos_ejemplo.py  ← crea los usuarios de prueba
├── exportar_respaldo.py     ← genera database/saludplus_respaldo.sql
├── generar_claves_vapid.py  ← crea las claves de las notificaciones push
├── frontend/                ← interfaz de usuario (HTML, CSS, JS, imágenes)
├── backend/                 ← lógica de negocio, rutas y conexión a la BD
│   ├── auth.py              ← registro, login, logout, perfil, roles
│   ├── medicamentos.py      ← medicamentos y tomas
│   ├── citas.py             ← citas médicas
│   ├── bienestar.py         ← emociones, actividad, agua, sueño, preferencias
│   ├── sincronizar.py       ← todos los datos del usuario en una petición
│   ├── admin.py             ← panel de administración
│   ├── vinculos.py          ← código de vínculo y panel del cuidador
│   ├── llamadas.py · video.py ← salas privadas de Daily y registro de llamadas
│   ├── push.py              ← notificaciones Web Push
│   ├── tareas.py            ← alerta de toma omitida (cron-job.org)
│   ├── validaciones.py      ← reglas de validación del servidor
│   ├── db.py · esquema.py · datos_ejemplo.py · paginas.py · utilidades.py
├── database/                ← esquema, respaldo con datos y diagrama E-R
│   ├── schema.sql
│   ├── saludplus_respaldo.sql
│   ├── diagrama_er.png
│   └── README.md
└── docs/capturas/           ← capturas de pantalla del sistema
```

---

## 💻 Instalación y ejecución local

**Requisitos:** Python 3.10 o superior y MySQL 8 (o XAMPP).

```bash
# 1. Entorno virtual e instalación
python -m venv venv
venv\Scripts\activate            # En Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

# 2. Configuración: copia .env.example como .env y revisa los datos de MySQL

# 3. Base de datos y usuarios de prueba
python iniciar_bd.py
python cargar_datos_ejemplo.py

# 4. Ejecutar
python app.py
```
Abre **http://localhost:5000**.

> **Alternativa sin Python:** restaura `database/saludplus_respaldo.sql` en phpMyAdmin para ver la base con datos.
>
> **Desde el celular:** con el celular en la misma red Wi-Fi, entra a `http://IP-DEL-PC:5000` (la IP sale con `ipconfig`).

---

## ⚙️ Variables de entorno

| Variable | Descripción | Local (XAMPP) | Render |
|---|---|---|---|
| `SECRET_KEY` | Clave para firmar las sesiones | texto inventado | la genera Render |
| `DB_HOST` | Servidor MySQL | `localhost` | Host de Aiven |
| `DB_PORT` | Puerto | `3306` | Puerto de Aiven |
| `DB_USER` | Usuario | `root` | `avnadmin` |
| `DB_PASSWORD` | Contraseña | *(vacía)* | la de Aiven |
| `DB_NAME` | Nombre de la base | `saludplus` | `defaultdb` |
| `DB_SSL` | Conexión cifrada (`1`/`0`) | `0` | `1` |
| `DB_SSL_CA` | Certificado CA (ruta o texto) | — | contenido de `ca.pem` |
| `FLASK_DEBUG` | Modo desarrollo | `1` | `0` |
| `SESSION_COOKIE_SECURE` | Cookie solo por HTTPS | `0` | `1` |
| `DETRAS_DE_PROXY` | Reconocer el proxy HTTPS | `0` | `1` |
| `CREAR_TABLAS_AL_INICIAR` | Crear las tablas al arrancar | `0` | `1` |
| `CARGAR_DATOS_EJEMPLO` | Crear los usuarios de prueba | `0` | `1` |
| `ZONA_HORARIA_HORAS` | Zona horaria de los usuarios | `-5` | `-5` |
| `TAREAS_SECRETO` | Clave del encabezado `X-Tarea-Secreta` | texto inventado | la genera Render |
| `DAILY_API_KEY` | API key de Daily.co (vacía = modo simulado) | — | la de Daily |
| `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` | Claves de las notificaciones push | `python generar_claves_vapid.py` | las mismas |
| `VAPID_CORREO` | Contacto para los servicios push | `mailto:...` | `mailto:...` |

⚠️ El archivo `.env` con datos reales **nunca** se sube al repositorio (está en `.gitignore`).

---

## 🚀 Despliegue

Render (aplicación) + Aiven (MySQL), vinculado a este repositorio: cada cambio en GitHub se publica solo.
👉 Guía paso a paso: **[DESPLIEGUE.md](DESPLIEGUE.md)**

---

## 🔌 API REST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud` | Estado del servidor y de la base de datos |
| POST | `/api/auth/registro` · `/login` · `/logout` | Cuentas y sesión |
| GET · PUT | `/api/auth/yo` · `/api/auth/perfil` | Usuario actual y edición del nombre |
| GET | `/api/sincronizar` | Todos los datos del usuario en una sola petición |
| GET · POST · PUT · DELETE | `/api/medicamentos[/<id>]` | Medicamentos |
| GET · PUT · DELETE | `/api/tomas` | Tomas del día ("Lo tomé" / "No lo tomé") |
| GET · POST · PATCH · DELETE | `/api/citas[/<id>]` | Citas y su estado |
| GET · POST · DELETE | `/api/emociones[/<id>]` | Estado emocional |
| GET · POST | `/api/actividad` | Actividad física (una por día) |
| GET · PUT | `/api/agua` · `/api/sueno` | Agua y sueño por día |
| GET · PUT | `/api/preferencias` | Configuración de recordatorios |
| GET | `/api/admin/resumen` · `/api/admin/usuarios` | Panel de administración (solo admin) |
| POST · DELETE | `/api/vinculos/codigo` | El adulto genera o cancela su código de 6 dígitos |
| POST | `/api/vinculos/aceptar` | El cuidador ingresa el código |
| GET · DELETE | `/api/vinculos[/<id>]` | Ver y revocar vínculos |
| GET | `/api/cuidador/personas` · `/personas/<id>/informe` · `/alertas` | Panel del cuidador (solo lectura) |
| POST | `/api/llamadas` | Crear una sala privada y avisar por push |
| GET | `/api/llamadas/<id>/token` | Token de la sala (**solo participantes**, si no 403) |
| POST | `/api/llamadas/<id>/fin` · `/rechazar` | Colgar (calcula la duración) o rechazar |
| GET | `/api/llamadas` · `/api/llamadas/entrante` | Historial y llamada entrante |
| GET · POST | `/api/push/clave` · `/suscribir` · `/desuscribir` · `/probar` | Notificaciones push |
| POST | `/tareas/revisar-tomas` | Tarea programada (encabezado `X-Tarea-Secreta`) |

Las respuestas son JSON: `{"ok": true, ...}` o `{"ok": false, "error": "mensaje", "campo": "nombre"}`.

---

## 🔒 Validación, errores y seguridad
- Validación doble: en el navegador (mensajes debajo de cada campo) y **obligatoria en el servidor**.
- Errores controlados con mensajes en español: datos inválidos (400), sesión vencida (401), sin permiso (403), no encontrado (404), duplicados (409), base de datos caída (503).
- Contraseñas con hash scrypt. Bloqueo de 5 minutos tras 5 intentos fallidos.
- Cada usuario solo ve y modifica **sus propios** datos. El administrador ve totales, no registros de salud.
- Consultas SQL parametrizadas, que evitan la inyección SQL.
- Conexión cifrada (SSL) a MySQL en producción.

---

## 🔄 Cambios respecto al Momento 1

| Momento 1 | Momento 2 | Justificación |
|---|---|---|
| Datos en el navegador (`localStorage`) | API Flask + **MySQL** | Persistencia real, acceso desde cualquier dispositivo y datos de cada usuario separados |
| Sin roles | Roles **usuario** y **administrador** | Permite evaluar el sistema y supervisar su uso sin exponer datos privados |
| Contraseña guardada en el navegador | Hash scrypt en el servidor | Seguridad de las cuentas |
| Sin despliegue | Render + Aiven, vinculado a GitHub | Requisito de publicación en la nube |
