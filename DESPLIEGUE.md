# 🚀 Publicar Salud+ en internet (gratis)

Al terminar, la app quedará en una dirección como **`https://saludplus.onrender.com`** y se podrá abrir desde cualquier celular.

| Pieza | Servicio | Costo |
|---|---|---|
| Código | **GitHub** | Gratis |
| Base de datos MySQL | **Aiven** | Gratis, sin tarjeta, sin fecha de vencimiento |
| Servidor Flask | **Render** | Gratis |

⏱️ Tiempo aproximado: 30 minutos.

---

## Paso 1 · Subir el código a GitHub

1. Crea una cuenta en **https://github.com** si no tienes.
2. Arriba a la derecha toca **+ → New repository**.
   - Nombre: `saludplus`
   - Puede ser **Private** (privado).
   - Toca **Create repository**.
3. En la página del repositorio toca **"uploading an existing file"**.
4. Abre la carpeta `SaludPlus` en tu computador. Selecciona **todo su contenido** (no la carpeta en sí) y arrástralo a GitHub.
   > ⚠️ Los archivos `render.yaml`, `app.py` y `requirements.txt` deben quedar en la **raíz** del repositorio, no dentro de otra carpeta.
   >
   > ⚠️ **No subas** el archivo `.env`: tiene tus contraseñas.
5. Toca **Commit changes**.

---

## Paso 2 · Crear la base de datos MySQL en Aiven

1. Entra a **https://aiven.io** y crea una cuenta gratis. No pide tarjeta.
2. Toca **Create service** → elige **MySQL**.
3. En el plan elige **Free**.
4. Nombre del servicio: `mysql-saludplus` → **Create service**.
5. Espera unos minutos hasta que el estado diga **Running** (en verde).
6. En la pestaña **Overview**, busca la sección **Connection information** y copia estos datos en un bloc de notas:

   | Dato en Aiven | Variable en Render |
   |---|---|
   | **Host** | `DB_HOST` |
   | **Port** | `DB_PORT` |
   | **User** (normalmente `avnadmin`) | `DB_USER` |
   | **Password** (toca el ojito 👁 para verla) | `DB_PASSWORD` |
   | **Database name** (normalmente `defaultdb`) | `DB_NAME` |

7. En esa misma sección toca **CA certificate → Download**. Se descarga un archivo `ca.pem`. Ábrelo con el Bloc de notas: lo vas a copiar en el paso 3.

> No hace falta crear las tablas a mano: la app las crea sola la primera vez que arranca.

---

## Paso 3 · Publicar la app en Render

1. Entra a **https://render.com** y toca **Get Started**. Regístrate con tu cuenta de **GitHub**: así Render puede ver tu repositorio.
2. En el panel toca **New + → Blueprint**.
3. Conecta y elige tu repositorio **saludplus**. Render encuentra el archivo `render.yaml` y muestra el servicio **saludplus**.
4. Render pide los valores que faltan. Llénalos con lo que copiaste de Aiven:

   | Variable | Qué escribir |
   |---|---|
   | `DB_HOST` | El Host de Aiven |
   | `DB_PORT` | El Port de Aiven |
   | `DB_USER` | `avnadmin` |
   | `DB_PASSWORD` | La contraseña de Aiven |
   | `DB_NAME` | `defaultdb` |
   | `DB_SSL_CA` | **Todo** el contenido de `ca.pem`, desde `-----BEGIN CERTIFICATE-----` hasta `-----END CERTIFICATE-----` |

   El resto de variables (`SECRET_KEY`, `DB_SSL`, etc.) ya las configura el `render.yaml`.

5. Toca **Apply** / **Deploy Blueprint**.
6. Espera de 3 a 5 minutos. En **Logs** debe aparecer:
   ```
   Base de datos lista: 9 tablas.
   Your service is live 🎉
   ```
7. Arriba aparece la dirección de tu app, por ejemplo `https://saludplus.onrender.com`. Si el nombre ya estaba ocupado, Render le agrega letras al final.

### ✅ Comprobar que todo funciona
Abre `https://TU-APP.onrender.com/api/salud`. Debe decir:
```json
{"base_de_datos": "ok", "ok": true, "servicio": "Salud+"}
```
Luego abre `https://TU-APP.onrender.com`, crea una cuenta y agrega un medicamento.

### 📱 Instalarla en el celular
Abre la dirección en Chrome (Android) o Safari (iPhone) y elige **"Agregar a la pantalla de inicio"**. Queda con su ícono, como una app.

---

## Paso 4 · Actualizar la app

Cada vez que subas cambios a GitHub (**Add file → Upload files**), Render vuelve a publicar la app sola en 2 o 3 minutos.

---

## ⚠️ Lo que debes saber del plan gratis

| Situación | Qué pasa | Qué hacer |
|---|---|---|
| Nadie usa la app por **15 minutos** | Render la "duerme" | La primera visita tarda **~1 minuto** en despertarla. **Ábrela un par de minutos antes de presentar.** |
| La base de datos no se usa por mucho tiempo | Aiven puede apagarla y avisa por correo | Entra a Aiven y toca **Power on**: los datos se conservan |
| Uso | Render da 750 horas al mes | Alcanza para tener la app encendida todo el mes |

Para un proyecto real con usuarios, conviene pasar a planes de pago. En Render, el plan Starter quita la suspensión.

---

## 🛠️ Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `/api/salud` dice `"base_de_datos": "sin conexión"` | Un dato de Aiven quedó mal escrito, o Aiven está apagado | Render → tu servicio → **Environment**: revisa `DB_HOST`, `DB_PORT`, `DB_PASSWORD`. En Aiven verifica que diga **Running**. |
| En Logs: `CERTIFICATE_VERIFY_FAILED` | El certificado se pegó incompleto | Vuelve a copiar **todo** `ca.pem` en `DB_SSL_CA`, incluidas las líneas BEGIN y END |
| En Logs: `Falta SECRET_KEY` | Se borró la variable | En **Environment** agrega `SECRET_KEY` con un texto largo inventado |
| La compilación falla (`Build failed`) | `requirements.txt` o `render.yaml` no están en la raíz | Revisa que GitHub muestre esos archivos directamente, no dentro de una carpeta |
| Inicias sesión y te devuelve al login | Entraste por `http://` en vez de `https://` | Usa siempre la dirección con **https** |
| La página tarda mucho la primera vez | La app estaba dormida | Es normal en el plan gratis: espera ~1 minuto |

---

## 💻 Opcional: usar la base de Aiven desde tu computador

En tu archivo `.env` pon los datos de Aiven, con `DB_SSL=1` y `DB_SSL_CA=ca.pem` (guarda el archivo `ca.pem` en la carpeta del proyecto). Luego ejecuta:
```bash
python iniciar_bd.py
python app.py
```
Así pruebas en `http://localhost:5000` con los mismos datos que la app publicada.
