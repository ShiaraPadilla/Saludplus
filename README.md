# Salud+ 💚

> **Tu bienestar, nuestra prioridad.** Aplicación web móvil para que los adultos mayores organicen sus medicamentos, citas médicas y bienestar diario.

| | |
|---|---|
| 🌐 **Aplicación desplegada** | **[COMPLETAR: https://saludplus.onrender.com]** |
| 📂 **Repositorio** | **https://github.com/ShiaraPadilla/Saludplus** |
| 🎯 **ODS abordado** | **ODS 3 — Salud y bienestar** |
| 🗄️ **Base de datos** | MySQL 8 (Aiven for MySQL) |
| 🎓 **Curso** | Desarrollo Sostenible — Universidad Cooperativa de Colombia |

> ⏱️ La aplicación usa el plan gratuito de Render: si nadie la ha abierto en 15 minutos, la primera carga tarda cerca de **1 minuto**.

---

## 👥 Integrantes

| Nombre | 
|---|---|
| Shiara Padilla | 
| Valentina Hernandez | 

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

## 🔑 Credenciales de prueba

| Rol | Correo | Contraseña | Qué puede revisar |
|---|---|---|---|
| **Administrador** | `admin@saludplus.com` | `Admin2026*` | Panel de administración (Ajustes → Panel de administración) |
| **Usuario regular** | `maria@saludplus.com` | `Maria2026*` | Todas las funciones, con 2 semanas de datos de ejemplo |
| Usuario regular | `jorge@saludplus.com` | `Jorge2026*` | Usuario con pocos datos |

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
├── frontend/                ← interfaz de usuario (HTML, CSS, JS, imágenes)
├── backend/                 ← lógica de negocio, rutas y conexión a la BD
│   ├── auth.py              ← registro, login, logout, perfil, roles
│   ├── medicamentos.py      ← medicamentos y tomas
│   ├── citas.py             ← citas médicas
│   ├── bienestar.py         ← emociones, actividad, agua, sueño, preferencias
│   ├── sincronizar.py       ← todos los datos del usuario en una petición
│   ├── admin.py             ← panel de administración
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
