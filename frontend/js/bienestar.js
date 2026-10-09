/* =========================================
   SALUD+ - MI BIENESTAR
   Requiere js/comun.js
========================================= */


function cargarBienestar() {

    cargarEstadoEmocional();
    cargarMedicamentos();
    cargarCitas();
    cargarActividad();
    cargarAgua();
    cargarSueno();
}


/* =========================================
   ESTADO EMOCIONAL
========================================= */

function cargarEstadoEmocional() {

    const registros = leerLista("registrosEmocionales");

    const estado = document.getElementById("estadoEmocionalBienestar");

    const emoji = document.getElementById("emojiBienestar");

    if (registros.length === 0) {

        estado.textContent = "Sin registros";

        emoji.textContent = "😐";

        return;
    }

    const ultimo = registros[registros.length - 1];

    estado.textContent =
        ultimo.emocion + (ultimo.fecha === fechaHoyLocal() ? " (hoy)" : " (" + describirDia(ultimo.fecha).toLowerCase() + ")");

    emoji.textContent = SP_EMOJIS[ultimo.emocion] || "😐";
}


/* =========================================
   MEDICAMENTOS (cumplimiento real)
========================================= */

function cargarMedicamentos() {

    const resultado = document.getElementById("medicamentosBienestar");

    const barra = document.getElementById("barraMedicamentos");

    const medicamentos = leerLista("medicamentos");

    const porcentaje = medicamentos.length === 0 ? 0 : calcularCumplimientoGeneral();

    resultado.textContent = porcentaje + "%";

    barra.style.width = porcentaje + "%";
}


/* =========================================
   CITAS (cumplidas / no canceladas)
========================================= */

function cargarCitas() {

    const resultado = document.getElementById("citasBienestar");

    const resumen = resumenCitas();

    resultado.textContent = resumen.cumplidas + "/" + resumen.validas;
}


/* =========================================
   ACTIVIDAD FÍSICA (últimos 7 días)
========================================= */

function cargarActividad() {

    const resultado = document.getElementById("actividadBienestar");

    resultado.textContent = actividadUltimos7Dias().length + "/7 días";
}


let actividadSeleccionada = "";


function registrarActividad() {

    const formulario = document.getElementById("formularioActividad");

    if (!formulario) return;

    const hoy = fechaHoyLocal();

    const yaRegistrada = leerLista("actividadFisica").some(function(registro) {
        return (typeof registro === "string" ? registro : registro.fecha) === hoy;
    });

    if (yaRegistrada) {

        mostrarAviso("🏃 Ya registraste tu actividad física de hoy. ¡Bien hecho!");

        return;
    }

    formulario.classList.remove("oculto");
}


function seleccionarActividad(actividad, boton) {

    actividadSeleccionada = actividad;

    document.querySelectorAll(".opciones-actividad button").forEach(function(actual) {
        actual.classList.remove("seleccionado");
        actual.setAttribute("aria-pressed", "false");
    });

    boton.classList.add("seleccionado");

    boton.setAttribute("aria-pressed", "true");

    const opciones = document.querySelector(".opciones-actividad");

    const error = opciones && opciones.nextElementSibling;

    if (error && error.classList.contains("error-campo")) error.remove();
}


function guardarActividad() {

    const texto = document.getElementById("minutosActividad").value.trim();

    const minutos = Number(texto);

    const opciones = document.querySelector(".opciones-actividad");

    if (actividadSeleccionada === "") {

        limpiarErrores(document.getElementById("formularioActividad"));

        const error = document.createElement("p");

        error.className = "error-campo";

        error.textContent = "⚠️ Elige el tipo de actividad.";

        opciones.insertAdjacentElement("afterend", error);

        return;
    }

    const valido = validarFormulario([
        {
            id: "minutosActividad",
            reglas: [
                [texto !== "", "Escribe cuántos minutos hiciste."],
                [Number.isInteger(minutos), "Escribe un número entero de minutos."],
                [minutos >= 5, "El mínimo son 5 minutos."],
                [minutos <= 300, "El máximo son 300 minutos (5 horas)."]
            ]
        }
    ]);

    if (!valido) return;

    const actividad = leerLista("actividadFisica");

    const hoy = fechaHoyLocal();

    const existeHoy = actividad.some(function(registro) {
        return (typeof registro === "string" ? registro : registro.fecha) === hoy;
    });

    if (existeHoy) {

        cerrarActividad();

        mostrarAviso("Ya registraste actividad física hoy.");

        return;
    }

    actividad.push({
        fecha: hoy,
        actividad: actividadSeleccionada,
        minutos: minutos
    });

    // Guardamos hasta 90 días para el historial y los informes
    guardarLista("actividadFisica", actividad.slice(-90));

    cerrarActividad();

    cargarActividad();

    mostrarAviso("🏃 ¡Actividad registrada: " + actividadSeleccionada + ", " + minutos + " min!");
}


function cerrarActividad() {

    const formulario = document.getElementById("formularioActividad");

    if (!formulario) return;

    formulario.classList.add("oculto");

    actividadSeleccionada = "";

    const minutos = document.getElementById("minutosActividad");

    if (minutos) minutos.value = "";

    document.querySelectorAll(".opciones-actividad button").forEach(function(boton) {
        boton.classList.remove("seleccionado");
    });

    limpiarErrores(formulario);
}


/* =========================================
   AGUA (se reinicia cada día)
========================================= */

function cargarAgua() {

    const vasos = obtenerAguaDeHoy();

    const resultado = document.getElementById("aguaBienestar");

    if (resultado) resultado.textContent = vasos + "/8 vasos";

    document.querySelectorAll(".vaso-agua").forEach(function(vaso, indice) {
        vaso.classList.toggle("tomado", indice < vasos);
    });
}


function registrarAgua() {

    let vasos = obtenerAguaDeHoy();

    if (vasos >= 8) {

        mostrarAviso("💧 Ya registraste los 8 vasos de agua de hoy.");

        return;
    }

    vasos++;

    localStorage.setItem("aguaConsumida", vasos);

    localStorage.setItem("aguaFecha", fechaHoyLocal());

    avisarCambioDeDatos();

    cargarAgua();

    mostrarAviso(
        vasos === 8
            ? "🎉 ¡Excelente! Alcanzaste los 8 vasos de hoy."
            : "💧 Vaso registrado (" + vasos + "/8)"
    );
}


/* =========================================
   SUEÑO (promedio de 7 días)
========================================= */

function cargarSueno() {

    const resultado = document.getElementById("suenoBienestar");

    const promedio = promedioSueno();

    resultado.textContent = promedio === null ? "Sin registro" : promedio + " h promedio";
}


function registrarSueno() {

    const formulario = document.getElementById("formularioSueno");

    if (!formulario) return;

    formulario.classList.remove("oculto");
}


function guardarSueno() {

    const input = document.getElementById("horasSuenoInput");

    if (!input) return;

    const texto = input.value.trim();

    const horas = Number(texto);

    const valido = validarFormulario([
        {
            id: "horasSuenoInput",
            reglas: [
                [texto !== "", "Escribe cuántas horas dormiste."],
                [!isNaN(horas), "Escribe un número. Ej: 7.5"],
                [horas >= 1, "El mínimo es 1 hora."],
                [horas <= 16, "El máximo es 16 horas."],
                [Math.round(horas * 2) === horas * 2, "Usa horas enteras o medias. Ej: 7 o 7.5"]
            ]
        }
    ]);

    if (!valido) return;

    const hoy = fechaHoyLocal();

    // Un registro por día: si ya existe el de hoy, se reemplaza
    const registros = leerLista("registrosSueno").filter(function(registro) {
        return registro.fecha !== hoy;
    });

    registros.push({ fecha: hoy, horas: horas });

    localStorage.setItem("registrosSueno", JSON.stringify(registros.slice(-90)));

    localStorage.setItem("horasSueno", promedioSueno());

    avisarCambioDeDatos();

    cerrarSueno();

    cargarSueno();

    mostrarAviso("😴 Sueño registrado: " + horas + " h");
}


function cerrarSueno() {

    const formulario = document.getElementById("formularioSueno");

    if (!formulario) return;

    formulario.classList.add("oculto");

    const input = document.getElementById("horasSuenoInput");

    if (input) input.value = "";
}


/* =========================================
   PERIODO
========================================= */

function seleccionarPeriodo() {

    const hoy = new Date();

    const inicio = new Date();

    inicio.setDate(hoy.getDate() - 6);

    mostrarAviso(
        "📅 Últimos 7 días: " +
        inicio.toLocaleDateString("es-CO", { day: "numeric", month: "short" }) +
        " al " +
        hoy.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
    );
}


/* =========================================
   NAVEGACIÓN
========================================= */

function volverDashboard() { volverAtras(); }

function irAInicio() { irAPagina("dashboard"); }

function irAHistorial() { irAPagina("historial"); }

function irAAjustes() { irAPagina("ajustes"); }


/* =========================================
   INICIAR
========================================= */

document.addEventListener("DOMContentLoaded", cargarBienestar);

document.addEventListener("saludplus:datos", cargarBienestar);
