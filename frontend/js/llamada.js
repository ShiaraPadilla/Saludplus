/* =========================================
   SALUD+ - VIDEOLLAMADA (/llamada/<id>)
   Requiere js/comun.js y daily-js.

   1. Pide el token (solo participantes).
   2. Entra a la sala privada de Daily sin pantallas intermedias.
   3. Al colgar avisa al servidor, que calcula la duración.
========================================= */

const LLAMADA_ID = Number(window.location.pathname.split("/").pop());

const SEGUNDOS_TIMBRE = 60;

let marco = null;
let simulado = false;

// Motivo técnico del último error de video (se envía al servidor al colgar)
let diagnostico = "";
let soyIniciador = false;
let terminada = false;
let enCurso = false;
let inicioLlamada = null;
let temporizadorCronometro = null;
let temporizadorSondeo = null;
let temporizadorTimbre = null;
let microfonoActivo = true;
let camaraActiva = true;

const $ = function(id) { return document.getElementById(id); };


function mostrarEstado(texto) {
    $("estadoLlamada").textContent = texto;
}


/* ---------- Inicio ---------- */

async function iniciarPantallaLlamada() {

    if (!LLAMADA_ID) {
        mostrarFin("⚠️", "Llamada no válida", "");
        return;
    }

    let datos;

    try {
        datos = await api("GET", "/llamadas/" + LLAMADA_ID + "/token");
    } catch (error) {
        mostrarFin("📞", error.estado === 410 ? "Esta llamada ya terminó" : "No se pudo entrar", error.estado === 410 ? "" : error.message);
        return;
    }

    const llamada = datos.llamada;

    soyIniciador = llamada.direccion === "saliente";

    simulado = !!datos.simulado;

    $("nombreOtro").textContent = llamada.con;
    $("avatarOtro").textContent = llamada.con.charAt(0);
    $("avatarGrande").textContent = llamada.con.charAt(0);

    if (llamada.cita) {
        $("citaLlamada").hidden = false;
        $("citaLlamada").textContent = "📅 Cita con " + llamada.cita.medico + " · " + llamada.cita.especialidad;
    }

    if (simulado) {

        $("avisoSimulado").hidden = false;

    } else {

        try {
            await unirseADaily(datos.url, datos.token);
        } catch (error) {
            if (terminada) return;      // el evento "error" de Daily ya lo manejó
            diagnostico = "join: " + ((error && (error.errorMsg || error.message)) || String(error));
            mostrarFin("⚠️", "No se pudo conectar el video", "Revisa tu conexión a internet y vuelve a intentarlo. (" + diagnostico + ")");
            avisarFin();
            return;
        }
    }

    if (llamada.estado === "en_curso") {

        empezarLlamada(llamada.iniciada_en);

    } else {

        mostrarEstado(soyIniciador ? "Llamando a " + llamada.con + "…" : "Conectando…");

        if (soyIniciador) {
            temporizadorTimbre = setTimeout(noContesto, SEGUNDOS_TIMBRE * 1000);
        }
    }

    temporizadorSondeo = setInterval(revisarEstado, 3000);
}


/* ---------- Daily.co ---------- */

async function unirseADaily(url, token) {

    if (!window.DailyIframe) {
        throw new Error("daily-js no cargó");
    }

    $("escenaEspera").hidden = true;

    marco = window.DailyIframe.createFrame($("video"), {
        showLeaveButton: false,          // usamos nuestro botón grande
        showFullscreenButton: false,
        lang: "es",
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "18px" }
    });

    marco.on("participant-joined", function(evento) {
        if (!evento.participant.local) empezarLlamada();
    });

    marco.on("participant-left", function(evento) {
        if (!evento.participant.local && !terminada) {
            colgar("El otro participante colgó.");
        }
    });

    marco.on("left-meeting", function() {
        if (!terminada) colgar();
    });

    // Error fatal de Daily: mostrar el motivo real y registrarlo en el servidor
    marco.on("error", function(evento) {
        if (terminada) return;
        const e = explicarErrorDaily(evento);
        diagnostico = e.tecnico;
        colgar(e.detalle, e.icono, e.titulo);
    });

    // Sin permiso de cámara o micrófono: la llamada sigue, pero se avisa
    marco.on("camera-error", function(evento) {
        diagnostico = "camera-error: " + ((evento && evento.errorMsg && (evento.errorMsg.errorMsg || evento.errorMsg)) || "");
        mostrarAviso("📷 Chrome no tiene permiso para la cámara o el micrófono. Toca el candado junto a la dirección → Permisos → permite Cámara y Micrófono.");
        api("POST", "/llamadas/" + LLAMADA_ID + "/diagnostico", { motivo: diagnostico }).catch(function() {});
    });

    await marco.join({ url: url, token: token });
}


/* ---------- Estados ---------- */

function empezarLlamada(iniciadaEn) {

    if (enCurso || terminada) return;

    enCurso = true;

    clearTimeout(temporizadorTimbre);

    inicioLlamada = iniciadaEn ? new Date(iniciadaEn) : new Date();

    mostrarEstado("En llamada");

    $("cronometro").hidden = false;

    actualizarCronometro();

    temporizadorCronometro = setInterval(actualizarCronometro, 1000);
}


function actualizarCronometro() {

    const segundos = Math.max(0, Math.floor((Date.now() - inicioLlamada.getTime()) / 1000));

    $("cronometro").textContent =
        String(Math.floor(segundos / 60)).padStart(2, "0") + ":" + String(segundos % 60).padStart(2, "0");
}


async function revisarEstado() {

    if (terminada) return;

    try {

        const llamada = (await api("GET", "/llamadas/" + LLAMADA_ID)).llamada;

        if (llamada.estado === "en_curso") {
            empezarLlamada(llamada.iniciada_en);
        } else if (llamada.estado === "perdida") {
            terminar("📵", soyIniciador ? llamada.con + " no contestó" : "Llamada cancelada", "Puedes intentarlo de nuevo más tarde.");
        } else if (llamada.estado === "finalizada") {
            terminar("📞", "Llamada finalizada", duracionTexto(llamada.duracion_segundos));
        }

    } catch (error) {}
}


function noContesto() {

    if (enCurso || terminada) return;

    colgar(null, "📵", $("nombreOtro").textContent + " no contestó");
}


/* ---------- Colgar ---------- */

async function colgar(motivo, icono, titulo) {

    if (terminada) return;

    terminada = true;

    limpiarTemporizadores();

    salirDeDaily();

    let llamada = null;

    try {
        llamada = (await api("POST", "/llamadas/" + LLAMADA_ID + "/fin", diagnostico ? { motivo: diagnostico } : undefined)).llamada;
    } catch (error) {}

    const duracion = llamada && llamada.duracion_segundos ? duracionTexto(llamada.duracion_segundos) : "";

    mostrarFin(icono || "📞", titulo || "Llamada finalizada", [motivo, duracion].filter(Boolean).join(" "));
}


function terminar(icono, titulo, detalle) {

    if (terminada) return;

    terminada = true;

    limpiarTemporizadores();

    salirDeDaily();

    mostrarFin(icono, titulo, detalle);
}


function avisarFin() {

    terminada = true;

    limpiarTemporizadores();

    api("POST", "/llamadas/" + LLAMADA_ID + "/fin", diagnostico ? { motivo: diagnostico } : undefined).catch(function() {});
}


function salirDeDaily() {

    if (!marco) return;

    try { marco.leave(); } catch (error) {}
    try { marco.destroy(); } catch (error) {}

    marco = null;
}


function limpiarTemporizadores() {

    clearInterval(temporizadorCronometro);
    clearInterval(temporizadorSondeo);
    clearTimeout(temporizadorTimbre);
}


function duracionTexto(segundos) {

    if (!segundos) return "";

    const minutos = Math.floor(segundos / 60);

    const resto = segundos % 60;

    return "Duración: " + (minutos ? minutos + " min " : "") + resto + " s.";
}


function mostrarFin(icono, titulo, detalle) {

    $("finIcono").textContent = icono;
    $("finTitulo").textContent = titulo;
    $("finDetalle").textContent = detalle || "";

    document.querySelector(".llamada-controles").hidden = true;
    $("video").hidden = true;
    $("avisoSimulado").hidden = true;
    $("cronometro").hidden = true;
    $("llamadaFin").hidden = false;

    mostrarEstado(titulo);

    $("botonVolver").focus();
}


/* ---------- Botones ---------- */

$("botonColgar").onclick = function() { colgar(); };

$("botonMicrofono").onclick = function() {

    microfonoActivo = !microfonoActivo;

    if (marco) marco.setLocalAudio(microfonoActivo);

    this.setAttribute("aria-pressed", String(microfonoActivo));
    this.classList.toggle("apagado", !microfonoActivo);
    this.querySelector("small").textContent = microfonoActivo ? "Micrófono" : "Silenciado";
};

$("botonCamara").onclick = function() {

    camaraActiva = !camaraActiva;

    if (marco) marco.setLocalVideo(camaraActiva);

    this.setAttribute("aria-pressed", String(camaraActiva));
    this.classList.toggle("apagado", !camaraActiva);
    this.querySelector("small").textContent = camaraActiva ? "Cámara" : "Sin cámara";
};

$("botonVolver").onclick = function() {
    window.location.href = "/" + paginaDeInicio() + ".html";
};

// Si cierran la pestaña durante la llamada, se registra el fin
window.addEventListener("pagehide", function() {
    if (!terminada) {
        navigator.sendBeacon && navigator.sendBeacon("/api/llamadas/" + LLAMADA_ID + "/fin");
    }
});

document.addEventListener("DOMContentLoaded", iniciarPantallaLlamada);



/* ---------- Errores de Daily en lenguaje claro ---------- */

function explicarErrorDaily(evento) {

    const tipo = (evento && evento.error && evento.error.type) || "";

    const mensaje = (evento && (evento.errorMsg || (evento.error && evento.error.msg))) || "";

    const tecnico = (tipo || "error") + (mensaje ? ": " + mensaje : "");

    // La sala se cerró: el otro colgó o la llamada se dio por terminada
    if (["ejected", "no-room", "exp-room", "exp-token"].indexOf(tipo) !== -1 ||
        /room.*(deleted|does not exist|expired)|ejected/i.test(mensaje)) {
        return { icono: "📞", titulo: "La llamada terminó", detalle: "El otro participante colgó o la sala se cerró.", tecnico: tecnico };
    }

    if (tipo === "account-missing-payment-method" || /payment method/i.test(mensaje)) {
        return { icono: "⚠️", titulo: "La cuenta de video no está habilitada", detalle: "La cuenta de Daily.co necesita un método de pago registrado (no se cobra en el plan gratuito).", tecnico: tecnico };
    }

    if (tipo === "meeting-full") {
        return { icono: "⚠️", titulo: "La sala está llena", detalle: "Ya hay otra persona en esta llamada.", tecnico: tecnico };
    }

    if (tipo === "not-allowed" || /not allowed|token/i.test(mensaje)) {
        return { icono: "🔒", titulo: "No se pudo entrar a la sala", detalle: "Permiso de la sala rechazado. Intenta llamar de nuevo.", tecnico: tecnico };
    }

    return { icono: "📶", titulo: "Llamada finalizada", detalle: "Se perdió la conexión. Motivo: " + tecnico, tecnico: tecnico };
}
