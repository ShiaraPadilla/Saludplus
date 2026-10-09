# Salud+ 💚

Aplicación web móvil de bienestar para adultos mayores: medicamentos, citas médicas, estado emocional, agua, actividad física y sueño.

**Tecnologías:** HTML · CSS · JavaScript → **Flask** (Python) → **MySQL**

---

## 📁 Estructura

```
SaludPlus/
├── app.py               ← arranca el servidor:  python app.py
├── render.yaml          ← despliegue automático en Render
├── Procfile             ← arranque con gunicorn (Railway, Koyeb, etc.)
├── DESPLIEGUE.md        ← guía para publicarla en internet
├── config.py            ← lee la configuración del archivo .env
├── iniciar_bd.py        ← crea la base de datos y las tablas
├── requirements.txt     ← librerías de Python
├── .env.example         ← plantilla de configuración
├── database/
│   └── saludplus.sql    ← script SQL con todas las tablas
├── backend/             ← servidor Flask
│   ├── __init__.py      ← crea la app y registra las rutas
│   ├── db.py            ← conexión a MySQL (con SSL para la nube)
│   ├── esquema.py       ← crea las tablas que falten
│   ├── auth.py          ← registro, login, logout, perfil
│   ├── medicamentos.py  ← medicamentos y tomas
│   ├── paginas.py       ← entrega el frontend y protege las páginas privadas
│   ├── validaciones.py  ← reglas para no guardar datos incorrectos
│   └── utilidades.py    ← respuestas JSON y formatos de fecha
└── frontend/            ← la app (HTML, CSS, JS, imágenes)
```

---

## 🚀 Cómo ejecutarlo (Windows + XAMPP)

### 1. Requisitos
- **Python 3.10 o superior** — al instalarlo marca la casilla *"Add Python to PATH"*.
- **XAMPP** (o MySQL 8 / MariaDB).

### 2. Encender MySQL
Abre el *XAMPP Control Panel* y pulsa **Start** en **MySQL**.

### 3. Instalar las librerías
Abre una terminal (CMD o PowerShell) **dentro de la carpeta SaludPlus**:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> En Mac/Linux: `source venv/bin/activate` en lugar de `venv\Scripts\activate`.

### 4. Configurar
Copia `.env.example` y renombra la copia a **`.env`**. En XAMPP normalmente no hay que cambiar nada, porque el usuario es `root` y no tiene contraseña. Solo cambia `SECRET_KEY` por un texto largo inventado.

### 5. Crear la base de datos
Elige **una** de estas opciones:

- **Opción A (más fácil):**
  ```bash
  python iniciar_bd.py
  ```
- **Opción B (phpMyAdmin):** entra a `http://localhost/phpmyadmin` → pestaña **Importar** → elige `database/saludplus.sql` → **Continuar**.

### 6. Arrancar
```bash
python app.py
```
Abre **http://localhost:5000** en el navegador.

### 📱 Probar en el celular
El celular y el computador deben estar en la misma red Wi-Fi.
1. En CMD escribe `ipconfig` y busca la **Dirección IPv4** (por ejemplo, `192.168.1.20`).
2. En el celular abre `http://192.168.1.20:5000`.
3. Si no abre, permite Python en el Firewall de Windows.

---

## 🌐 Publicarla en internet

La app está lista para **Render** (servidor) + **Aiven** (MySQL), ambos gratis.
👉 Sigue la guía paso a paso en **[DESPLIEGUE.md](DESPLIEGUE.md)**.

---

## 🔌 API

Todas las respuestas son JSON con la forma `{ "ok": true, ... }` o `{ "ok": false, "error": "mensaje", "campo": "nombre" }`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Crear cuenta `{nombre, correo, contrasena, confirmar}` |
| POST | `/api/auth/login` | Iniciar sesión `{correo, contrasena}` |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/salud` | Estado del servidor y de la base de datos |
| GET | `/api/auth/yo` | Usuario de la sesión actual |
| PUT | `/api/auth/perfil` | Cambiar nombre `{nombre}` |
| GET | `/api/medicamentos` | Medicamentos activos |
| POST | `/api/medicamentos` | Crear `{nombre, dosis, cantidad, hora:"HH:MM"}` |
| PUT | `/api/medicamentos/<id>` | Editar |
| DELETE | `/api/medicamentos/<id>` | Eliminar (se conserva el historial) |
| GET | `/api/tomas?dias=90` | Historial de tomas |
| PUT | `/api/tomas` | Registrar toma `{medicamento_id, fecha:"AAAA-MM-DD", estado:"tomado"\|"no_tomado"}` |
| DELETE | `/api/tomas?medicamento_id=&fecha=` | Deshacer la toma |

---

## 🔒 Seguridad incluida
- Contraseñas guardadas con hash `scrypt` (Werkzeug), nunca en texto plano.
- Sesión en cookie firmada, `HttpOnly` y `SameSite=Lax`.
- Las páginas privadas y la API exigen sesión, y cada usuario solo ve y modifica sus propios datos.
- Consultas SQL con parámetros, que evitan la inyección SQL.
- Todo se valida también en el servidor, aunque se salte el JavaScript.
- Después de 5 intentos fallidos de login se bloquea ese correo por 5 minutos.
- En producción la conexión a MySQL va cifrada (SSL) y verifica el certificado del servidor.
- La app no arranca en producción si falta `SECRET_KEY`.

---

## 🗺️ Avance de la etapa 2

| Módulo | Estado |
|---|---|
| Base de datos (9 tablas) | ✅ Creada |
| Registro, login, logout, perfil | ✅ En MySQL |
| Medicamentos y tomas | ✅ En MySQL |
| Citas médicas | ⏳ Siguiente paso (sigue en el navegador) |
| Estado emocional | ⏳ Pendiente |
| Agua, actividad física, sueño | ⏳ Pendiente |
| Preferencias de recordatorios | ⏳ Pendiente |

> Mientras un módulo esté pendiente, sus datos se guardan solo en el navegador de ese equipo.

## ❓ Problemas comunes

| Mensaje | Solución |
|---|---|
| `No se pudo conectar a MySQL` | Enciende MySQL en XAMPP y revisa el archivo `.env` |
| `Unknown database 'saludplus'` | Ejecuta `python iniciar_bd.py` |
| `ModuleNotFoundError: flask` | Activa el entorno (`venv\Scripts\activate`) y ejecuta `pip install -r requirements.txt` |
| Aviso amarillo "abierta sin el servidor" | Abriste el HTML con doble clic: entra por `http://localhost:5000` |
| `Address already in use` | Ya hay otra copia de `app.py` abierta: ciérrala |
