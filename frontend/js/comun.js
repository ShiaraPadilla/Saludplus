/* =========================================
   SALUD+ - FUNCIONES COMUNES
   Se carga en TODAS las pantallas, antes
   del script propio de cada pantalla.

   Contiene:
   1. Sesión (proteger pantallas privadas)
   2. Navegación (← Volver y barra inferior)
   3. Datos compartidos (fechas, listas, tomas)
   4. Recordatorios y notificaciones 🔔
   5. Hojas (ventanas inferiores) y avisos
   6. Validación de formularios
========================================= */


/* =========================================
   0. PÁGINA ACTUAL
========================================= */

const SP_PAGINA = (function() {

    const ultimo = window.location.pathname.split("/").pop() || "";

    const nombre = ultimo.replace(".html", "");

    return nombre === "" ? "index" : nombre;

})();

const SP_PAGINAS_PUBLICAS = ["index", "login", "registro"];


/* =========================================
   1. SESIÓN
========================================= */

function haySesionActiva() {

    return localStorage.getItem("sesionActiva") === "true";
}


/*
   Las pantallas privadas las protege el SERVIDOR (Flask):
   si no hay sesión, redirige a login.html antes de entregar
   la página. Aquí solo avisamos si se abrió el archivo
   directamente sin Flask.
*/

const SP_SIN_SERVIDOR = window.location.protocol === "file:";


/* Cerrar sesión: borra la sesión, NO los registros de salud */

async function cerrarSesionUsuario() {

    try {
        await api("POST", "/auth/logout");
    } catch (error) {
        // Aunque falle la conexión, cerramos la sesión en este equipo
    }

    limpiarDatosDeSesionLocal();

    window.location.replace("login.html");
}


/* Copia local (caché) de los datos que viven en MySQL */

const SP_CLAVES_DEL_SERVIDOR = [
    "medicamentos",
    "seguimientoMedicamentos",
    "citasMedicas",
    "registrosEmocionales",
    "actividadFisica",
    "aguaConsumida",
    "aguaFecha",
    "historialAgua",
    "registrosSueno",
    "horasSueno",
    "preferenciasRecordatorios"
];


/* Borra la sesión y la copia local de los datos del servidor
   (los datos siguen guardados en MySQL). */

function limpiarDatosDeSesionLocal() {

    SP_CLAVES_DEL_SERVIDOR.concat([
        "sesionActiva",
        "recordatoriosEnviados",
        "cuentaUsuario",
        "nombreUsuario",
        "correoUsuario",
        "rolUsuario"
    ]).forEach(function(clave) {
        localStorage.removeItem(clave);
    });

    try {
        sessionStorage.clear();
    } catch (error) {}
}


/* =========================================
   1b. CONEXIÓN CON EL SERVIDOR (API Flask)
========================================= */

const SP_API = "/api";


class ErrorApi extends Error {

    constructor(mensaje, estado, campo) {
        super(mensaje);
        this.estado = estado;
        this.campo = campo || null;
    }
}


/*
   api("GET", "/medicamentos")
   api("POST", "/medicamentos", { nombre: "..." })

   Devuelve el JSON de la respuesta o lanza ErrorApi
   con un mensaje listo para mostrar.
*/

async function api(metodo, ruta, datos) {

    if (SP_SIN_SERVIDOR) {
        throw new ErrorApi(
            "Abre la app desde Flask (python app.py → http://localhost:5000).",
            0
        );
    }

    let respuesta;

    try {

        respuesta = await fetch(SP_API + ruta, {
            method: metodo,
            credentials: "same-origin",
            headers: datos ? { "Content-Type": "application/json" } : {},
            body: datos ? JSON.stringify(datos) : undefined
        });

    } catch (error) {

        throw new ErrorApi("No hay conexión con el servidor. Revisa tu internet.", 0);
    }

    let cuerpo = {};

    try {
        cuerpo = await respuesta.json();
    } catch (error) {}

    // La sesión terminó en el servidor → volver al login
    if (
        respuesta.status === 401 &&
        cuerpo.sesion === false &&
        SP_PAGINAS_PUBLICAS.indexOf(SP_PAGINA) === -1
    ) {

        limpiarDatosDeSesionLocal();

        avisoEnSiguientePantalla("🔒 Tu sesión terminó. Inicia sesión de nuevo.");

        window.location.replace("login.html");

        throw new ErrorApi(cuerpo.error || "Sesión terminada.", 401);
    }

    if (!respuesta.ok || cuerpo.ok === false) {

        throw new ErrorApi(
            cuerpo.error || "Ocurrió un error. Intenta de nuevo.",
            respuesta.status,
            cuerpo.campo
        );
    }

    return cuerpo;
}


/* Desactiva el botón mientras se espera al servidor */

async function conBotonOcupado(boton, textoEspera, tarea) {

    if (!boton) return tarea();

    if (boton.disabled) return;

    const textoOriginal = boton.textContent;

    boton.disabled = true;

    boton.classList.add("ocupado");

    boton.textContent = textoEspera;

    try {
        return await tarea();
    } finally {
        boton.disabled = false;
        boton.classList.remove("ocupado");
        boton.textContent = textoOriginal;
    }
}


/* Muestra el error del servidor debajo del campo correcto */

function mostrarErrorApi(error, mapaCampos) {

    const id = error.campo && mapaCampos ? mapaCampos[error.campo] : null;

    if (id && document.getElementById(id)) {
        mostrarErrorCampo(id, error.message);
    } else {
        mostrarAviso("⚠️ " + error.message);
    }
}


/* ---------- Conversión: formato del servidor → formato de las pantallas ---------- */

function isoAFechaLocal(iso) {

    const fecha = textoAFecha(iso);

    return fecha ? fecha.toLocaleDateString("es-CO") : iso;
}


function medicamentoDesdeApi(m) {

    return {
        id: m.id,
        nombre: m.nombre,
        dosis: m.dosis,
        cantidad: m.cantidad,
        hora: formatoHora12(m.hora),
        hora24: m.hora
    };
}


function tomaDesdeApi(t) {

    const registrada = t.registrado_en ? new Date(t.registrado_en) : null;

    return {
        id: t.id,
        medicamentoId: t.medicamento_id,
        medicamento: t.nombre,
        dosis: t.dosis,
        cantidad: t.cantidad,
        horaProgramada: formatoHora12(t.hora_programada),
        fecha: isoAFechaLocal(t.fecha),
        horaRegistro: registrada
            ? registrada.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
            : "",
        estado: t.estado
    };
}


function horaLocalDe(fechaUtc) {

    return fechaUtc
        ? new Date(fechaUtc).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
        : "";
}


function citaDesdeApi(c) {

    return {
        id: c.id,
        medico: c.medico,
        especialidad: c.especialidad,
        fecha: c.fecha,
        hora: c.hora,
        lugar: c.lugar,
        estado: c.estado
    };
}


function emocionDesdeApi(e) {

    const momento = new Date(e.registrado_en);

    return {
        id: e.id,
        emocion: e.emocion,
        comentario: e.comentario || "",
        fecha: momento.toLocaleDateString("es-CO"),
        hora: horaLocalDe(e.registrado_en)
    };
}


function actividadDesdeApi(a) {

    return {
        id: a.id,
        fecha: isoAFechaLocal(a.fecha),
        actividad: a.tipo,
        minutos: a.minutos
    };
}


/* Guarda en la copia local todo lo que envía /api/sincronizar */

function guardarDatosDelServidor(datos) {

    const usuario = datos.usuario;

    localStorage.setItem("sesionActiva", "true");
    localStorage.setItem("nombreUsuario", usuario.nombre);
    localStorage.setItem("correoUsuario", usuario.correo);
    localStorage.setItem("rolUsuario", usuario.rol || "usuario");

    localStorage.setItem("medicamentos", JSON.stringify(datos.medicamentos.map(medicamentoDesdeApi)));
    localStorage.setItem("seguimientoMedicamentos", JSON.stringify(datos.tomas.map(tomaDesdeApi)));
    localStorage.setItem("citasMedicas", JSON.stringify(datos.citas.map(citaDesdeApi)));
    localStorage.setItem("registrosEmocionales", JSON.stringify(datos.emociones.map(emocionDesdeApi)));
    localStorage.setItem("actividadFisica", JSON.stringify(datos.actividad.map(actividadDesdeApi)));


    /* Agua: el día de hoy va aparte, los anteriores al historial */

    const hoyISO = fechaISO(new Date());

    const aguaHoy = datos.agua.find(function(a) { return a.fecha === hoyISO; });

    localStorage.setItem("aguaConsumida", String(aguaHoy ? aguaHoy.vasos : 0));
    localStorage.setItem("aguaFecha", fechaHoyLocal());
    localStorage.setItem("historialAgua", JSON.stringify(
        datos.agua
            .filter(function(a) { return a.fecha !== hoyISO; })
            .map(function(a) { return { fecha: isoAFechaLocal(a.fecha), vasos: a.vasos }; })
    ));


    /* Sueño */

    localStorage.setItem("registrosSueno", JSON.stringify(
        datos.sueno.map(function(r) { return { fecha: isoAFechaLocal(r.fecha), horas: r.horas }; })
    ));

    const promedio = promedioSueno();

    if (promedio === null) {
        localStorage.removeItem("horasSueno");
    } else {
        localStorage.setItem("horasSueno", promedio);
    }


    localStorage.setItem("preferenciasRecordatorios", JSON.stringify(datos.preferencias));
}


/* ---------- Sincronización al abrir cada pantalla privada ---------- */

let SP_sincronizando = false;

async function sincronizarConServidor() {

    if (SP_SIN_SERVIDOR) return;

    SP_sincronizando = true;

    document.body.classList.add("sincronizando");

    try {

        guardarDatosDelServidor(await api("GET", "/sincronizar"));

    } catch (error) {

        if (error.estado !== 401) {
            mostrarAviso("⚠️ " + error.message + " Se muestran los últimos datos guardados.");
        }

    } finally {

        SP_sincronizando = false;

        document.body.classList.remove("sincronizando");

        avisarCambioDeDatos();
    }
}


function esAdministrador() {

    return localStorage.getItem("rolUsuario") === "admin";
}


function mostrarAvisoSinServidor() {

    if (!SP_SIN_SERVIDOR) return;

    const aviso = document.createElement("div");

    aviso.className = "aviso-sin-servidor";

    aviso.innerHTML =
        "<strong>⚠️ La app está abierta sin el servidor.</strong>" +
        "<span>Ejecuta <code>python app.py</code> y entra a " +
        "<code>http://localhost:5000</code></span>";

    document.body.prepend(aviso);
}





/* =========================================
   2. NAVEGACIÓN
========================================= */

/* Recordar de qué pantalla venimos */

(function registrarNavegacion() {

    try {

        const actual = sessionStorage.getItem("sp_actual");

        if (actual && actual !== SP_PAGINA) {
            sessionStorage.setItem("sp_anterior", actual);
        }

        sessionStorage.setItem("sp_actual", SP_PAGINA);

    } catch (error) {}

})();


function irAPagina(nombre) {

    if (nombre === SP_PAGINA) {

        window.scrollTo({ top: 0, behavior: "smooth" });

        return;
    }

    window.location.href = nombre + ".html";
}


/* Pantalla "padre" de cada pantalla para el botón ← */

function pantallaAnteriorLogica() {

    let anterior = "";

    try {
        anterior = sessionStorage.getItem("sp_anterior") || "";
    } catch (error) {}

    switch (SP_PAGINA) {

        case "informes":
            return ["ajustes", "dashboard", "historial"].indexOf(anterior) !== -1
                ? anterior
                : "ajustes";

        case "admin":
            return "ajustes";

        case "registro":
            return "login";

        case "login":
            return "index";

        default:
            return "dashboard";
    }
}


/* ← Volver: primero cierra ventanas abiertas, luego regresa */

function volverAtras() {

    if (cerrarLoQueEsteAbierto()) {
        return;
    }

    window.location.href = pantallaAnteriorLogica() + ".html";
}


/* Qué sección se marca en la barra inferior */

const SP_SECCION = {
    dashboard: "dashboard",
    medicamentos: "dashboard",
    citas: "dashboard",
    bienestar: "dashboard",
    emocional: "dashboard",
    historial: "historial",
    ajustes: "ajustes",
    informes: "ajustes",
    admin: "ajustes"
};


function prepararNavegacion() {

    /* Barra inferior: mismo comportamiento en todas las pantallas */

    const barra = document.querySelector(".barra-inferior");

    if (barra) {

        document.body.classList.add("con-barra");

        barra.querySelectorAll(".nav-item").forEach(function(boton) {

            const texto = boton.textContent;

            let destino = null;

            if (texto.indexOf("Inicio") !== -1) destino = "dashboard";
            if (texto.indexOf("Historial") !== -1) destino = "historial";
            if (texto.indexOf("Ajustes") !== -1) destino = "ajustes";

            if (!destino) return;

            boton.type = "button";

            boton.onclick = function() {
                irAPagina(destino);
            };

            const activo = SP_SECCION[SP_PAGINA] === destino;

            boton.classList.toggle("activo", activo);

            if (activo) {
                boton.setAttribute("aria-current", "page");
            } else {
                boton.removeAttribute("aria-current");
            }
        });
    }


    /* Botones ← de los encabezados */

    document.querySelectorAll("header button, .ajustes-pantalla > button").forEach(function(boton) {

        if (boton.textContent.trim() === "←") {

            boton.type = "button";

            boton.setAttribute("aria-label", "Volver");

            boton.onclick = volverAtras;
        }
    });
}


/* =========================================
   3. DATOS COMPARTIDOS
========================================= */

function leerLista(clave) {

    try {

        const datos = JSON.parse(localStorage.getItem(clave));

        return Array.isArray(datos) ? datos : [];

    } catch (error) {

        return [];
    }
}


function leerObjeto(clave, porDefecto) {

    try {

        const datos = JSON.parse(localStorage.getItem(clave));

        return datos && typeof datos === "object" && !Array.isArray(datos)
            ? Object.assign({}, porDefecto, datos)
            : Object.assign({}, porDefecto);

    } catch (error) {

        return Object.assign({}, porDefecto);
    }
}


/* Guardar y avisar a la pantalla para que se actualice sola */

function guardarLista(clave, lista) {

    localStorage.setItem(clave, JSON.stringify(lista));

    avisarCambioDeDatos();
}


function avisarCambioDeDatos() {

    document.dispatchEvent(new CustomEvent("saludplus:datos"));
}


/* Si se cambian datos en otra pestaña, actualizar esta */

window.addEventListener("storage", function() {

    avisarCambioDeDatos();
});


/* Al volver con "atrás" (caché del navegador) recargar datos */

window.addEventListener("pageshow", function(event) {

    if (event.persisted) {
        window.location.reload();
    }
});


function escaparHTML(texto) {

    return String(texto === undefined || texto === null ? "" : texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}


/* ---------- Fechas y horas ---------- */

/* Formato que usan los registros: "8/10/2026" */

function fechaHoyLocal() {

    return new Date().toLocaleDateString("es-CO");
}


/* Formato de las citas: "2026-10-08" */

function fechaISO(fecha) {

    return (
        fecha.getFullYear() + "-" +
        String(fecha.getMonth() + 1).padStart(2, "0") + "-" +
        String(fecha.getDate()).padStart(2, "0")
    );
}


/* Convierte "8/10/2026" o "2026-10-08" en Date */

function textoAFecha(texto) {

    if (!texto) return null;

    const valor = String(texto).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {

        const p = valor.split("-");

        return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    }

    const p = valor.split("/");

    if (p.length === 3) {

        return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    }

    return null;
}


/* "8:00 a. m.", "05:40 p. m." o "14:30" → minutos del día */

function horaAMinutos(hora) {

    const partes = String(hora || "")
        .toLowerCase()
        .match(/(\d{1,2}):(\d{2})\s*([ap])?/);

    if (!partes) return 0;

    let horas = parseInt(partes[1]);

    const minutos = parseInt(partes[2]);

    if (partes[3] === "p" && horas < 12) horas += 12;

    if (partes[3] === "a" && horas === 12) horas = 0;

    return horas * 60 + minutos;
}


function minutosAhora() {

    const ahora = new Date();

    return ahora.getHours() * 60 + ahora.getMinutes();
}


/* "14:30" → "2:30 p. m." */

function formatoHora12(hora) {

    const total = horaAMinutos(hora);

    let horas = Math.floor(total / 60);

    const minutos = String(total % 60).padStart(2, "0");

    const periodo = horas >= 12 ? "p. m." : "a. m.";

    if (horas === 0) horas = 12;

    if (horas > 12) horas -= 12;

    return horas + ":" + minutos + " " + periodo;
}


/* "Hoy", "Mañana", "Ayer" o "12 oct" */

function describirDia(fechaTexto) {

    const fecha = textoAFecha(fechaTexto);

    if (!fecha) return fechaTexto || "";

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const dias = Math.round((fecha - hoy) / 86400000);

    if (dias === 0) return "Hoy";

    if (dias === 1) return "Mañana";

    if (dias === -1) return "Ayer";

    return fecha.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "short",
        year: fecha.getFullYear() !== hoy.getFullYear() ? "numeric" : undefined
    });
}


/* "8 de octubre de 2026" */

function formatoFechaLarga(fechaTexto) {

    const fecha = textoAFecha(fechaTexto);

    if (!fecha) return fechaTexto || "";

    return fecha.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


/* ¿La fecha está dentro de los últimos N días (incluido hoy)? */

function estaEnUltimosDias(fechaTexto, dias) {

    const fecha = textoAFecha(fechaTexto);

    if (!fecha) return false;

    const hoy = new Date();

    hoy.setHours(0, 0, 0, 0);

    const diferencia = Math.round((hoy - fecha) / 86400000);

    return diferencia >= 0 && diferencia < dias;
}


/* ---------- Medicamentos ---------- */

function obtenerTomasDeHoy() {

    const lista = leerLista("medicamentos");

    const seguimiento = leerLista("seguimientoMedicamentos");

    const hoy = fechaHoyLocal();

    return lista
        .map(function(medicamento, indice) {

            const registrosHoy = seguimiento.filter(function(registro) {
                return registro.fecha === hoy && esTomaDe(registro, medicamento);
            });

            return {
                indice: indice,
                medicamento: medicamento,
                minutos: horaAMinutos(medicamento.hora),
                registro: registrosHoy.length > 0
                    ? registrosHoy[registrosHoy.length - 1]
                    : null
            };
        })
        .sort(function(a, b) {
            return a.minutos - b.minutos;
        });
}


/* ¿Este registro de toma pertenece a este medicamento? */

function esTomaDe(registro, medicamento) {

    if (registro.medicamentoId && medicamento.id) {
        return registro.medicamentoId === medicamento.id;
    }

    return (
        registro.medicamento === medicamento.nombre &&
        registro.horaProgramada === medicamento.hora
    );
}


/* Registra "tomado" / "no_tomado" una sola vez por día.
   Se muestra al instante y se guarda en el servidor;
   si el servidor falla, se vuelve a cargar lo que tiene. */

function registrarTomaMedicamento(indice, estado) {

    const lista = leerLista("medicamentos");

    const medicamento = lista[indice];

    if (!medicamento) return null;

    const ahora = new Date();

    const hoy = fechaHoyLocal();

    const seguimiento = leerLista("seguimientoMedicamentos").filter(function(registro) {
        return !(registro.fecha === hoy && esTomaDe(registro, medicamento));
    });

    const registro = {
        medicamentoId: medicamento.id,
        medicamento: medicamento.nombre,
        dosis: medicamento.dosis,
        cantidad: medicamento.cantidad,
        horaProgramada: medicamento.hora,
        fecha: hoy,
        horaRegistro: ahora.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit"
        }),
        estado: estado
    };

    seguimiento.push(registro);

    guardarLista("seguimientoMedicamentos", seguimiento);

    if (medicamento.id) {

        api("PUT", "/tomas", {
            medicamento_id: medicamento.id,
            fecha: fechaISO(ahora),
            estado: estado
        }).catch(function(error) {
            mostrarAviso("⚠️ No se guardó la toma: " + error.message);
            sincronizarConServidor();
        });
    }

    return registro;
}


/* Quitar el registro de hoy (botón "Deshacer") */

function deshacerTomaMedicamento(indice) {

    const medicamento = leerLista("medicamentos")[indice];

    if (!medicamento) return;

    const hoy = fechaHoyLocal();

    guardarLista(
        "seguimientoMedicamentos",
        leerLista("seguimientoMedicamentos").filter(function(registro) {
            return !(registro.fecha === hoy && esTomaDe(registro, medicamento));
        })
    );

    if (medicamento.id) {

        api(
            "DELETE",
            "/tomas?medicamento_id=" + medicamento.id + "&fecha=" + fechaISO(new Date())
        ).catch(function(error) {
            mostrarAviso("⚠️ No se pudo deshacer: " + error.message);
            sincronizarConServidor();
        });
    }
}


function calcularCumplimientoGeneral() {

    const seguimiento = leerLista("seguimientoMedicamentos");

    if (seguimiento.length === 0) return 0;

    const tomados = seguimiento.filter(function(registro) {
        return registro.estado === "tomado";
    }).length;

    return Math.round((tomados / seguimiento.length) * 100);
}


/* ---------- Citas ---------- */

function obtenerCitasConIndice() {

    return leerLista("citasMedicas").map(function(cita, indice) {
        return Object.assign({ indice: indice }, cita, {
            estado: cita.estado || "pendiente"
        });
    });
}


function obtenerCitasPendientesOrdenadas() {

    return obtenerCitasConIndice()
        .filter(function(cita) {
            return cita.estado === "pendiente";
        })
        .sort(function(a, b) {
            return (a.fecha + a.hora).localeCompare(b.fecha + b.hora);
        });
}


function obtenerCitasDeHoy() {

    const hoy = fechaISO(new Date());

    return obtenerCitasPendientesOrdenadas().filter(function(cita) {
        return cita.fecha === hoy;
    });
}


/* Cumplidas / citas válidas (no canceladas) */

function resumenCitas() {

    const citas = obtenerCitasConIndice();

    const validas = citas.filter(function(cita) {
        return cita.estado !== "cancelada";
    });

    return {
        total: citas.length,
        validas: validas.length,
        cumplidas: citas.filter(function(c) { return c.estado === "cumplida"; }).length,
        pendientes: citas.filter(function(c) { return c.estado === "pendiente"; }).length,
        canceladas: citas.filter(function(c) { return c.estado === "cancelada"; }).length
    };
}


/* ---------- Bienestar ---------- */

/* El agua se reinicia cada día; el día anterior se guarda en historial */

function prepararDatosDiarios() {

    const hoy = fechaHoyLocal();

    const fechaAgua = localStorage.getItem("aguaFecha");

    if (!fechaAgua) {

        localStorage.setItem("aguaFecha", hoy);

    } else if (fechaAgua !== hoy) {

        const vasos = parseInt(localStorage.getItem("aguaConsumida")) || 0;

        if (vasos > 0) {

            const historial = leerLista("historialAgua");

            historial.push({ fecha: fechaAgua, vasos: vasos });

            localStorage.setItem("historialAgua", JSON.stringify(historial.slice(-60)));
        }

        localStorage.setItem("aguaConsumida", "0");

        localStorage.setItem("aguaFecha", hoy);
    }
}


function obtenerAguaDeHoy() {

    prepararDatosDiarios();

    return parseInt(localStorage.getItem("aguaConsumida")) || 0;
}


function actividadUltimos7Dias() {

    return leerLista("actividadFisica").filter(function(registro) {

        const fecha = typeof registro === "string" ? registro : registro.fecha;

        return estaEnUltimosDias(fecha, 7);
    });
}


/* Promedio de sueño de los últimos 7 días */

function promedioSueno() {

    const registros = leerLista("registrosSueno").filter(function(registro) {
        return estaEnUltimosDias(registro.fecha, 7);
    });

    if (registros.length === 0) {

        const anterior = parseFloat(localStorage.getItem("horasSueno"));

        return isNaN(anterior) ? null : anterior;
    }

    const suma = registros.reduce(function(total, registro) {
        return total + Number(registro.horas);
    }, 0);

    return Math.round((suma / registros.length) * 10) / 10;
}


const SP_EMOJIS = {
    "Muy bien": "😄",
    "Bien": "🙂",
    "Regular": "😐",
    "Mal": "😞",
    "Muy mal": "😠"
};


/* =========================================
   4. RECORDATORIOS Y NOTIFICACIONES 🔔
========================================= */

/* Lista única de recordatorios de hoy (fuente de verdad) */

function obtenerRecordatoriosDeHoy() {

    const lista = [];

    obtenerTomasDeHoy().forEach(function(toma) {

        const m = toma.medicamento;

        lista.push({
            tipo: "medicamento",
            icono: "💊",
            indice: toma.indice,
            titulo: m.nombre + (m.dosis ? " " + m.dosis : ""),
            detalle: m.cantidad || "",
            hora: m.hora,
            minutos: toma.minutos,
            estado: toma.registro ? toma.registro.estado : "pendiente",
            registro: toma.registro
        });
    });

    obtenerCitasDeHoy().forEach(function(cita) {

        lista.push({
            tipo: "cita",
            icono: "📅",
            indice: cita.indice,
            titulo: "Cita con " + (cita.medico || "el médico"),
            detalle: [cita.especialidad, cita.lugar].filter(Boolean).join(" • "),
            hora: formatoHora12(cita.hora),
            minutos: horaAMinutos(cita.hora),
            estado: "pendiente",
            registro: null
        });
    });

    return lista.sort(function(a, b) {
        return a.minutos - b.minutos;
    });
}


function contarRecordatoriosDeHoy() {

    return obtenerRecordatoriosDeHoy().filter(function(item) {
        return item.estado === "pendiente";
    }).length;
}


/* Texto plano:
   🔔 Recordatorios de hoy
   💊 Losartán 50 mg — 8:00 a. m.
   📅 Cita con Dra. Gómez — 10:30 a. m. */

function textoRecordatoriosDeHoy() {

    const pendientes = obtenerRecordatoriosDeHoy().filter(function(item) {
        return item.estado === "pendiente";
    });

    if (pendientes.length === 0) {
        return "🔔 No tienes recordatorios pendientes para hoy.";
    }

    return "🔔 Recordatorios de hoy\n\n" + pendientes.map(function(item) {
        return item.icono + " " + item.titulo + " — " + item.hora;
    }).join("\n");
}


/* Tarjeta de recordatorios (dashboard) */

function mostrarRecordatorios() {

    abrirPanelRecordatorios(false);
}


/* Campana (dashboard): hoy + próximas citas */

function mostrarNotificaciones() {

    abrirPanelRecordatorios(true);
}


let SP_panelRecordatoriosProximas = null;

function abrirPanelRecordatorios(incluirProximas) {

    SP_panelRecordatoriosProximas = !!incluirProximas;

    abrirHoja({
        id: "recordatorios",
        titulo: incluirProximas ? "🔔 Notificaciones" : "🔔 Recordatorios de hoy",
        html: htmlPanelRecordatorios(incluirProximas),
        acciones: [
            { texto: "💊 Mis medicamentos", accion: function() { irAPagina("medicamentos"); } },
            { texto: "📅 Mis citas", accion: function() { irAPagina("citas"); } }
        ],
        alCerrar: function() {
            SP_panelRecordatoriosProximas = null;
        }
    });
}


function htmlPanelRecordatorios(incluirProximas) {

    const ahora = minutosAhora();

    const items = obtenerRecordatoriosDeHoy();

    let html = "";


    /* Resumen tipo lista */

    const pendientes = items.filter(function(i) { return i.estado === "pendiente"; });

    html += '<p class="panel-resumen">' + (
        pendientes.length === 0
            ? "✅ No tienes pendientes para hoy."
            : "Tienes <strong>" + pendientes.length + "</strong> pendiente" +
              (pendientes.length === 1 ? "" : "s") + " para hoy."
    ) + "</p>";


    if (items.length === 0) {

        html += '<p class="panel-vacio">No tienes medicamentos ni citas para hoy.</p>';
    }

    items.forEach(function(item) {

        let estado = "";

        if (item.tipo === "medicamento") {

            if (item.estado === "tomado") {

                estado =
                    '<div class="panel-estado-fila">' +
                        '<span class="chip-estado chip-tomado">✅ Tomado ' +
                            escaparHTML(item.registro.horaRegistro || "") +
                        "</span>" +
                        '<button type="button" class="boton-deshacer" ' +
                            'onclick="deshacerTomaDesdePanel(' + item.indice + ')">Deshacer</button>' +
                    "</div>";

            } else if (item.estado === "no_tomado") {

                estado =
                    '<div class="panel-estado-fila">' +
                        '<span class="chip-estado chip-no-tomado">❌ No tomado</span>' +
                        '<button type="button" class="boton-deshacer" ' +
                            'onclick="deshacerTomaDesdePanel(' + item.indice + ')">Deshacer</button>' +
                    "</div>";

            } else {

                estado =
                    (item.minutos < ahora
                        ? '<span class="chip-estado chip-atrasado">⚠️ Atrasado</span>'
                        : "") +
                    '<div class="panel-botones-toma">' +
                        '<button type="button" class="boton-tome" ' +
                            'onclick="marcarTomaDesdePanel(' + item.indice + ', \'tomado\')">✅ Lo tomé</button>' +
                        '<button type="button" class="boton-no-tome" ' +
                            'onclick="marcarTomaDesdePanel(' + item.indice + ', \'no_tomado\')">❌ No lo tomé</button>' +
                    "</div>";
            }
        }

        html +=
            '<article class="panel-item">' +
                '<div class="panel-item-fila">' +
                    '<span class="panel-item-icono">' + item.icono + "</span>" +
                    '<div class="panel-item-datos">' +
                        "<strong>" + escaparHTML(item.titulo) + "</strong>" +
                        (item.detalle ? "<span>" + escaparHTML(item.detalle) + "</span>" : "") +
                    "</div>" +
                    '<span class="panel-item-hora">' + escaparHTML(item.hora) + "</span>" +
                "</div>" +
                estado +
            "</article>";
    });


    if (incluirProximas) {

        const hoyISO = fechaISO(new Date());

        const proximas = obtenerCitasPendientesOrdenadas()
            .filter(function(cita) { return cita.fecha > hoyISO; })
            .slice(0, 3);

        html += '<h3 class="panel-subtitulo">🗓️ Próximas citas</h3>';

        if (proximas.length === 0) {

            html += '<p class="panel-vacio">No tienes citas próximas.</p>';

        } else {

            proximas.forEach(function(cita) {

                html +=
                    '<article class="panel-item">' +
                        '<div class="panel-item-fila">' +
                            '<span class="panel-item-icono">📅</span>' +
                            '<div class="panel-item-datos">' +
                                "<strong>Cita con " + escaparHTML(cita.medico) + "</strong>" +
                                "<span>" +
                                    escaparHTML(
                                        describirDia(cita.fecha) + ", " + formatoHora12(cita.hora) +
                                        (cita.lugar ? " • " + cita.lugar : "")
                                    ) +
                                "</span>" +
                            "</div>" +
                        "</div>" +
                    "</article>";
            });
        }
    }

    return html;
}


function marcarTomaDesdePanel(indice, estado) {

    const registro = registrarTomaMedicamento(indice, estado);

    if (!registro) return;

    mostrarAviso(
        estado === "tomado"
            ? "✅ " + registro.medicamento + " marcado como tomado"
            : "❌ " + registro.medicamento + " marcado como no tomado"
    );
}


function deshacerTomaDesdePanel(indice) {

    deshacerTomaMedicamento(indice);

    mostrarAviso("↩️ Registro deshecho");
}


/* Si cambian los datos, refrescar el panel abierto */

document.addEventListener("saludplus:datos", function() {

    if (SP_panelRecordatoriosProximas !== null) {

        actualizarContenidoHoja(
            "recordatorios",
            htmlPanelRecordatorios(SP_panelRecordatoriosProximas)
        );
    }
});


/* ---------- Avisos automáticos a la hora ---------- */

const SP_PREFERENCIAS_RECORDATORIOS = {
    activos: true,        // avisos dentro de la app
    sistema: false,       // notificaciones del celular
    minutosCita: 60       // avisar citas X minutos antes
};


function obtenerPreferenciasRecordatorios() {

    return leerObjeto("preferenciasRecordatorios", SP_PREFERENCIAS_RECORDATORIOS);
}


async function guardarPreferenciasRecordatorios(preferencias) {

    const respuesta = await api("PUT", "/preferencias", preferencias);

    localStorage.setItem("preferenciasRecordatorios", JSON.stringify(respuesta.preferencias));

    return respuesta.preferencias;
}


function revisarRecordatoriosProgramados() {

    if (!haySesionActiva()) return;

    const preferencias = obtenerPreferenciasRecordatorios();

    if (!preferencias.activos) return;

    const hoy = fechaHoyLocal();

    let enviados = leerObjeto("recordatoriosEnviados", { fecha: hoy, claves: [] });

    if (enviados.fecha !== hoy) {
        enviados = { fecha: hoy, claves: [] };
    }

    const ahora = minutosAhora();

    const nuevos = [];

    obtenerRecordatoriosDeHoy().forEach(function(item) {

        if (item.estado !== "pendiente") return;

        const clave = item.tipo + "|" + item.titulo + "|" + item.hora;

        if (enviados.claves.indexOf(clave) !== -1) return;

        let toca = false;

        if (item.tipo === "medicamento") {
            // Desde la hora programada hasta 30 minutos después
            toca = ahora >= item.minutos && ahora - item.minutos <= 30;
        } else {
            // Citas: X minutos antes
            toca = item.minutos - ahora >= 0 && item.minutos - ahora <= preferencias.minutosCita;
        }

        if (toca) {
            enviados.claves.push(clave);
            nuevos.push(item);
        }
    });

    localStorage.setItem("recordatoriosEnviados", JSON.stringify(enviados));

    nuevos.forEach(function(item) {

        const mensaje =
            item.tipo === "medicamento"
                ? "Es hora de tomar " + item.titulo + " (" + item.hora + ")"
                : item.titulo + " hoy a las " + item.hora;

        mostrarBannerRecordatorio(item.icono + " " + mensaje);

        if (
            preferencias.sistema &&
            "Notification" in window &&
            Notification.permission === "granted"
        ) {
            try {
                new Notification("Salud+ 🔔", {
                    body: mensaje,
                    icon: "img/icono.svg",
                    tag: item.tipo + item.indice
                });
            } catch (error) {}
        }
    });
}


function mostrarBannerRecordatorio(texto) {

    let banner = document.getElementById("bannerRecordatorio");

    if (!banner) {

        banner = document.createElement("div");

        banner.id = "bannerRecordatorio";

        banner.className = "banner-recordatorio";

        banner.setAttribute("role", "alert");

        document.body.appendChild(banner);
    }

    banner.innerHTML =
        '<span class="banner-texto"></span>' +
        '<button type="button" class="banner-ver">Ver</button>' +
        '<button type="button" class="banner-cerrar" aria-label="Cerrar">×</button>';

    banner.querySelector(".banner-texto").textContent = texto;

    banner.querySelector(".banner-ver").onclick = function() {
        banner.classList.remove("visible");
        abrirPanelRecordatorios(false);
    };

    banner.querySelector(".banner-cerrar").onclick = function() {
        banner.classList.remove("visible");
    };

    banner.classList.add("visible");

    clearTimeout(banner._temporizador);

    banner._temporizador = setTimeout(function() {
        banner.classList.remove("visible");
    }, 15000);
}


/* Pedir permiso para notificaciones del celular */

function solicitarPermisoNotificaciones(callback) {

    if (!("Notification" in window)) {

        callback(false, "Este navegador no permite notificaciones del sistema.");

        return;
    }

    if (Notification.permission === "granted") {

        callback(true);

        return;
    }

    if (Notification.permission === "denied") {

        callback(false, "Las notificaciones están bloqueadas. Actívalas desde la configuración del navegador.");

        return;
    }

    Notification.requestPermission().then(function(resultado) {

        callback(
            resultado === "granted",
            resultado === "granted" ? "" : "No se concedió el permiso."
        );
    });
}


/* =========================================
   5. HOJAS (ventanas inferiores) Y AVISOS
========================================= */

let SP_hojaActual = null;

/*
   abrirHoja({
       id, titulo, html,
       acciones: [{ texto, clase, accion }],
       alCerrar
   })
*/

function abrirHoja(opciones) {

    cerrarHoja(true);

    const fondo = document.createElement("div");

    fondo.className = "panel-fondo hoja-general";

    fondo.id = "hoja-" + (opciones.id || "general");

    fondo.innerHTML =
        '<section class="panel-recordatorios" role="dialog" aria-modal="true">' +
            '<div class="panel-agarre"></div>' +
            '<header class="panel-header">' +
                "<h2></h2>" +
                '<button type="button" class="panel-cerrar" aria-label="Cerrar">×</button>' +
            "</header>" +
            '<div class="panel-contenido"></div>' +
            '<div class="panel-acciones"></div>' +
        "</section>";

    fondo.querySelector("h2").textContent = opciones.titulo || "";

    fondo.querySelector(".panel-contenido").innerHTML = opciones.html || "";

    const acciones = fondo.querySelector(".panel-acciones");

    (opciones.acciones || []).forEach(function(accion) {

        const boton = document.createElement("button");

        boton.type = "button";

        boton.className = accion.clase || "panel-boton-secundario";

        boton.textContent = accion.texto;

        boton.onclick = accion.accion;

        acciones.appendChild(boton);
    });

    if (!opciones.acciones || opciones.acciones.length === 0) {
        acciones.remove();
    } else if (opciones.acciones.length === 1) {
        acciones.classList.add("una-accion");
    }

    fondo.addEventListener("click", function(event) {
        if (event.target === fondo) cerrarHoja();
    });

    fondo.querySelector(".panel-cerrar").onclick = function() {
        cerrarHoja();
    };

    document.body.appendChild(fondo);

    document.body.classList.add("sin-scroll");

    SP_hojaActual = { elemento: fondo, alCerrar: opciones.alCerrar };

    fondo.querySelector(".panel-cerrar").focus();

    return fondo;
}


function actualizarContenidoHoja(id, html) {

    const hoja = document.getElementById("hoja-" + id);

    if (hoja) {
        hoja.querySelector(".panel-contenido").innerHTML = html;
    }
}


function cerrarHoja(sinCallback) {

    if (!SP_hojaActual) return false;

    const hoja = SP_hojaActual;

    SP_hojaActual = null;

    hoja.elemento.remove();

    document.body.classList.remove("sin-scroll");

    if (!sinCallback && typeof hoja.alCerrar === "function") {
        hoja.alCerrar();
    }

    return true;
}


/* Mensaje breve en la parte inferior */

let SP_temporizadorAviso = null;

function mostrarAviso(mensaje) {

    let aviso =
        document.getElementById("avisoDashboard") ||
        document.getElementById("avisoGlobal");

    if (!aviso) {

        aviso = document.createElement("div");

        aviso.id = "avisoGlobal";

        aviso.className = "aviso-dashboard";

        aviso.setAttribute("role", "status");

        aviso.setAttribute("aria-live", "polite");

        document.body.appendChild(aviso);
    }

    aviso.textContent = mensaje;

    aviso.classList.add("visible");

    clearTimeout(SP_temporizadorAviso);

    SP_temporizadorAviso = setTimeout(function() {
        aviso.classList.remove("visible");
    }, 2600);
}


/* Aviso que se muestra al llegar a la siguiente pantalla */

function avisoEnSiguientePantalla(mensaje) {

    try {
        sessionStorage.setItem("sp_aviso", mensaje);
    } catch (error) {}
}


function mostrarAvisoPendiente() {

    try {

        const mensaje = sessionStorage.getItem("sp_aviso");

        if (mensaje) {

            sessionStorage.removeItem("sp_aviso");

            setTimeout(function() { mostrarAviso(mensaje); }, 300);
        }

    } catch (error) {}
}


/* ---------- Formularios como ventana inferior ---------- */

const SP_FORMULARIOS =
    "#formularioMedicamento, #formularioCita, #formularioActividad, #formularioSueno";


function prepararFormulariosFlotantes() {

    const formularios = document.querySelectorAll(SP_FORMULARIOS);

    if (formularios.length === 0) return;

    const fondo = document.createElement("div");

    fondo.className = "fondo-formulario";

    fondo.addEventListener("click", function() {
        cerrarFormulariosAbiertos();
    });

    document.body.appendChild(fondo);

    function actualizar() {

        let abierto = null;

        formularios.forEach(function(formulario) {

            // Sacamos el formulario al body para que flote bien
            if (formulario.parentElement !== document.body) {
                document.body.appendChild(formulario);
            }

            if (!formulario.classList.contains("oculto")) {
                abierto = formulario;
            }
        });

        fondo.classList.toggle("visible", !!abierto);

        document.body.classList.toggle("sin-scroll", !!abierto || !!SP_hojaActual);

        if (abierto && !abierto._enfocado) {

            const primero = abierto.querySelector("input, textarea, select");

            if (primero) setTimeout(function() { primero.focus(); }, 50);
        }

        formularios.forEach(function(formulario) {

            formulario._enfocado = !formulario.classList.contains("oculto");

            if (formulario.classList.contains("oculto")) {
                limpiarErrores(formulario);
            }
        });
    }

    const observador = new MutationObserver(actualizar);

    formularios.forEach(function(formulario) {

        formulario.setAttribute("role", "dialog");

        formulario.setAttribute("aria-modal", "true");

        observador.observe(formulario, { attributes: true, attributeFilter: ["class"] });
    });

    actualizar();
}


function cerrarFormulariosAbiertos() {

    let cerrado = false;

    document.querySelectorAll(SP_FORMULARIOS).forEach(function(formulario) {

        if (formulario.classList.contains("oculto")) return;

        const boton = formulario.querySelector(
            ".formulario-header button, .formulario-cita-header button, .formulario-bienestar-header button"
        );

        if (boton) {
            boton.click();
        } else {
            formulario.classList.add("oculto");
        }

        cerrado = true;
    });

    return cerrado;
}


function cerrarLoQueEsteAbierto() {

    if (cerrarHoja()) return true;

    return cerrarFormulariosAbiertos();
}


document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {
        cerrarLoQueEsteAbierto();
    }
});


/* =========================================
   6. VALIDACIÓN DE FORMULARIOS
========================================= */

const SP_REGEX = {
    correo: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    nombre: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/,
    tieneNumero: /\d/
};


function contarLetras(texto) {

    const letras = String(texto).match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g);

    return letras ? letras.length : 0;
}


function mostrarErrorCampo(campo, mensaje) {

    if (typeof campo === "string") campo = document.getElementById(campo);

    if (!campo) return;

    limpiarErrorCampo(campo);

    campo.classList.add("campo-invalido");

    campo.setAttribute("aria-invalid", "true");

    const error = document.createElement("p");

    error.className = "error-campo";

    error.setAttribute("role", "alert");

    error.textContent = "⚠️ " + mensaje;

    // Debajo del contenedor del campo (el recuadro con el ícono)
    const contenedor =
        campo.closest(".campo-login, .campo-registro, .input-registro, .input-con-icono") ||
        campo;

    contenedor.insertAdjacentElement("afterend", error);

    campo._errorCampo = error;

    campo.addEventListener("input", function quitar() {
        limpiarErrorCampo(campo);
        campo.removeEventListener("input", quitar);
    });
}


function limpiarErrorCampo(campo) {

    if (typeof campo === "string") campo = document.getElementById(campo);

    if (!campo) return;

    campo.classList.remove("campo-invalido");

    campo.removeAttribute("aria-invalid");

    if (campo._errorCampo) {
        campo._errorCampo.remove();
        campo._errorCampo = null;
    }
}


function limpiarErrores(contenedor) {

    (contenedor || document).querySelectorAll(".campo-invalido").forEach(limpiarErrorCampo);

    (contenedor || document).querySelectorAll(".error-campo").forEach(function(error) {
        error.remove();
    });
}


/*
   validarFormulario([
       { id: "nombre", reglas: [ [condición, "mensaje"], ... ] }
   ])
   Devuelve true si todo es válido. Marca el primer error de cada
   campo y lleva el foco al primero.
*/

function validarFormulario(campos) {

    let primero = null;

    campos.forEach(function(definicion) {

        const campo = document.getElementById(definicion.id);

        if (!campo) return;

        limpiarErrorCampo(campo);

        for (let i = 0; i < definicion.reglas.length; i++) {

            const regla = definicion.reglas[i];

            if (!regla[0]) {

                mostrarErrorCampo(campo, regla[1]);

                if (!primero) primero = campo;

                break;
            }
        }
    });

    if (primero) {

        primero.focus();

        primero.scrollIntoView({ block: "center", behavior: "smooth" });

        return false;
    }

    return true;
}


/* =========================================
   INICIO
========================================= */

prepararDatosDiarios();

document.addEventListener("DOMContentLoaded", function() {

    prepararNavegacion();

    prepararFormulariosFlotantes();

    mostrarAvisoPendiente();

    mostrarAvisoSinServidor();

    if (SP_PAGINAS_PUBLICAS.indexOf(SP_PAGINA) === -1) {

        sincronizarConServidor().then(revisarRecordatoriosProgramados);

        setInterval(revisarRecordatoriosProgramados, 30000);
    }
});
