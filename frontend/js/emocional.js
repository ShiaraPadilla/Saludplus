/* =========================================
   SALUD+ - ESTADO EMOCIONAL
   Requiere js/comun.js
========================================= */


let emocionSeleccionada = "";


function seleccionarEmocion(emocion, boton) {

    emocionSeleccionada = emocion;

    document.querySelectorAll(".boton-emocion").forEach(function(actual) {
        actual.classList.remove("seleccionado");
        actual.setAttribute("aria-pressed", "false");
    });

    boton.classList.add("seleccionado");

    boton.setAttribute("aria-pressed", "true");

    const error = document.getElementById("errorEmocion");

    if (error) error.remove();
}


function actualizarContador() {

    const comentario = document.getElementById("comentarioEmocional");

    const contador = document.getElementById("contadorCaracteres");

    contador.textContent = comentario.value.length + "/300";
}


async function guardarEstadoEmocional() {

    const comentario = document
        .getElementById("comentarioEmocional")
        .value
        .trim()
        .replace(/\s{3,}/g, "  ");

    if (emocionSeleccionada === "") {

        if (!document.getElementById("errorEmocion")) {

            const error = document.createElement("p");

            error.id = "errorEmocion";

            error.className = "error-campo";

            error.setAttribute("role", "alert");

            error.textContent = "⚠️ Toca una carita para elegir cómo te sientes.";

            document.querySelector(".emociones").insertAdjacentElement("afterend", error);
        }

        document.querySelector(".emociones").scrollIntoView({ block: "center", behavior: "smooth" });

        return;
    }

    if (comentario.length > 300) {

        mostrarErrorCampo("comentarioEmocional", "Máximo 300 caracteres.");

        return;
    }

    const boton = document.querySelector(".boton-guardar-emocion");

    await conBotonOcupado(boton, "Guardando...", async function() {

        try {

            const respuesta = await api("POST", "/emociones", {
                emocion: emocionSeleccionada,
                comentario: comentario
            });

            const registros = leerLista("registrosEmocionales");

            registros.push(emocionDesdeApi(respuesta.emocion));

            guardarLista("registrosEmocionales", registros);

            avisoEnSiguientePantalla(
                (SP_EMOJIS[emocionSeleccionada] || "🙂") + " Estado guardado: " + emocionSeleccionada
            );

            window.location.href = "dashboard.html";

        } catch (error) {

            mostrarErrorApi(error, { comentario: "comentarioEmocional" });
        }
    });
}


/* Si ya registró hoy, lo indicamos */

function mostrarRegistroDeHoy() {

    const registros = leerLista("registrosEmocionales");

    const ultimo = registros[registros.length - 1];

    if (!ultimo || ultimo.fecha !== fechaHoyLocal()) return;

    const titulo = document.querySelector(".titulo-emocion");

    if (!titulo || document.getElementById("avisoEmocionHoy")) return;

    const aviso = document.createElement("p");

    aviso.id = "avisoEmocionHoy";

    aviso.className = "aviso-informativo";

    aviso.textContent =
        "Hoy ya registraste: " + (SP_EMOJIS[ultimo.emocion] || "") + " " + ultimo.emocion +
        " (" + ultimo.hora + "). Puedes agregar otro registro si tu ánimo cambió.";

    titulo.insertAdjacentElement("beforebegin", aviso);
}


/* =========================================
   NAVEGACIÓN
========================================= */

function volverDashboard() { volverAtras(); }

function irAInicio() { irAPagina("dashboard"); }

function irAHistorial() { irAPagina("historial"); }

function irAAjustes() { irAPagina("ajustes"); }


document.addEventListener("DOMContentLoaded", function() {

    mostrarRegistroDeHoy();

    document.querySelectorAll(".boton-emocion").forEach(function(boton) {
        boton.setAttribute("aria-pressed", "false");
    });
});
