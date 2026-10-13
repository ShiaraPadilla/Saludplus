# Etapa 2 — Parte 1: Flask + MySQL (usuarios y medicamentos)

## Backend nuevo
- `database/schema.sql` crea las **9 tablas** de toda la app, con llaves foráneas, restricciones y `utf8mb4` (acepta tildes y emojis).
- **Flask** con *blueprints*: `auth`, `medicamentos` y `paginas`.
- `iniciar_bd.py` crea la base de datos sin necesidad de phpMyAdmin.

## Cambios en el frontend
- **Nuevo en `comun.js`:**
  - `api()` habla con el servidor y muestra mensajes de error en español.
  - `sincronizarConServidor()` trae del servidor el usuario, los medicamentos y las tomas cada vez que se abre una pantalla privada.
  - `conBotonOcupado()` evita que un botón se toque dos veces mientras se guarda.
  - `mostrarErrorApi()` pone el error del servidor debajo del campo correcto.
- **Login y registro** ahora usan la API, y la cuenta queda en MySQL. Se eliminó la cuenta guardada en el navegador y `hashClave()`.
- **Medicamentos:** crear, editar y eliminar van al servidor.
- **Tomas:** "Lo tomé", "No lo tomé" y "Deshacer" se ven al instante y se guardan en el servidor. Si el guardado falla, se avisa y se recargan los datos.
- **Perfil** (Ajustes → Mi información) se lee y se guarda en el servidor.
- **Protección de pantallas:** ahora la hace el servidor. Si no hay sesión, entrega `login.html`.
- **Cerrar sesión** cierra la sesión en el servidor y borra la copia local de los datos del servidor.
- Los usuarios nuevos empiezan **sin** los 3 medicamentos de ejemplo.
- Si se abre el HTML sin Flask, aparece un aviso que explica cómo arrancarlo.

## Cómo funcionan los datos
```
Pantalla ──lee al instante──► copia local (localStorage)
    │                                ▲
    └──guarda──► API Flask ──► MySQL ┘ (se sincroniza al abrir cada pantalla)
```
La copia local hace que las pantallas carguen rápido. La fuente de verdad es MySQL.

## Pruebas realizadas
- **29 pruebas de API:** validaciones, duplicados, aislamiento entre usuarios, bloqueo de intentos, 404 en JSON y protección contra rutas `../`.
- **27 pruebas en navegador** contra Flask + MySQL reales: registro, login, medicamentos, tomas, borrar la caché y recuperar los datos del servidor, Historial, Bienestar, Informes, perfil, segundo usuario aislado, navegación y cierre de sesión.

## Siguiente paso
Citas médicas → estados emocionales → agua, actividad y sueño → preferencias. Cada uno sigue el mismo patrón que medicamentos: un blueprint en `backend/` y las llamadas `api()` en su archivo JS.


---

# Etapa 2 — Parte 2: preparado para publicar (Render + Aiven)

## Archivos nuevos
- `render.yaml`: Render crea el servicio con todas sus variables (Blueprint).
- `Procfile` y `.python-version`: arranque con gunicorn en otras plataformas.
- `backend/esquema.py`: crea las tablas que falten. Lo usan `iniciar_bd.py` y el arranque de la app.
- `DESPLIEGUE.md`: guía paso a paso para GitHub, Aiven y Render.

## Cambios
- **MySQL con SSL** (`DB_SSL`, `DB_SSL_CA`). El certificado se puede pegar como texto en Render. Se probó contra un servidor que exige SSL, y un certificado equivocado se rechaza.
- **Fechas en UTC:** la conexión fija `time_zone = '+00:00'` y el JSON envía las horas con `Z`. Así el celular las muestra en hora de Colombia aunque el servidor esté en otro país.
- `CREAR_TABLAS_AL_INICIAR=1` crea la base y las tablas en el primer arranque. Hacía falta porque Render gratis no tiene consola.
- `iniciar_bd.py` ahora funciona con bases de nombre distinto (Aiven usa `defaultdb`).
- `/api/salud` permite a Render saber si la app y la base de datos responden.
- `ProxyFix`: la app reconoce HTTPS detrás del proxy de Render, necesario para la cookie segura.
- En producción la app no arranca sin `SECRET_KEY`.
- `gunicorn` agregado a `requirements.txt`.

## Pruebas
Se simuló el entorno de Render + Aiven: gunicorn con 2 procesos, modo producción, MySQL con SSL obligatorio y una base de datos inexistente que la app creó sola. Las 28 pruebas del navegador pasaron, incluida la de hora UTC → hora de Colombia.
