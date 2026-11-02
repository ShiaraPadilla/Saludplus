/* =========================================
   SALUD+ - PANEL DEL CUIDADOR (RF-02)
   Solo lectura: resumen del día, informe de 7 días,
   alertas de tomas omitidas y videollamada.
   Requiere js/comun.js
========================================= */

const ESTADOS_TOMA = {
    tomado: ["✅ Tomado", "chip-tomado"],
    no_tomado: ["❌ No tomado", "chip-no-tomado"],
    atrasada: ["⚠️ Sin registrar", "chip-no-tomado"],
    pendiente: ["⏳ Pendiente", "chip-atrasado"]
};


async function cargarPanelCuidador() {

    document.getElementById("nombreCuidador").textContent =
        (localStorage.getItem("nombreUsuario") || "Cuidador").split(" ")[0];

    try {

        const respuestas = await Promise.all([
            api("GET", "/cuidador/personas"),
            api("GET", "/cuidador/alertas")
        ]);

        pintarPersonas(respuestas[0].personas);

        pintarAlertas(respuestas[1].alertas);

    } catch (error) {

        if (error.estado !== 401) {
            document.getElementById("listaPersonas").innerHTML =
                '<p class="panel-vacio">⚠️ ' + escaparHTML(error.message) + "</p>";
        }
    }
}


function pintarPersonas(personas) {

    const contenedor = document.getElementById("listaPersonas");

    if (personas.length === 0) {

        contenedor.innerHTML =
            '<div class="cuidador-vacio">' +
                '<div class="cuidador-vacio-icono">👨‍👩‍👧</div>' +
                "<strong>Aún no cuidas a nadie</strong>" +
                "<span>Escribe abajo el código que te dé la persona que cuidas.</span>" +
            "</div>";

        return;
    }

    contenedor.innerHTML = personas.map(function(p) {

        const tomas = p.tomas.length
            ? p.tomas.map(function(t) {
                const estado = ESTADOS_TOMA[t.estado] || ESTADOS_TOMA.pendiente;
                return (
                    '<li class="cuidador-toma">' +
                        '<span class="cuidador-toma-hora">' + escaparHTML(t.hora) + "</span>" +
                        '<span class="cuidador-toma-nombre">' + escaparHTML(t.medicamento) + "</span>" +
                        '<span class="chip-estado ' + estado[1] + '">' + estado[0] +
                            (t.registrada ? " " + escaparHTML(t.registrada) : "") + "</span>" +
                    "</li>"
                );
            }).join("")
            : '<li class="panel-vacio">No tiene medicamentos registrados.</li>';

        const emocion = p.emocion
            ? (SP_EMOJIS[p.emocion.emocion] || "") + " " + p.emocion.emocion + " · " +
              describirDia(fechaISO(new Date(p.emocion.registrado_en))).toLowerCase()
            : "Sin registro";

        const cita = p.proxima_cita
            ? describirDia(p.proxima_cita.fecha) + ", " + p.proxima_cita.hora + " · " + p.proxima_cita.medico
            : "Sin citas pendientes";

        return (
            '<article class="cuidador-persona">' +
                '<header class="cuidador-persona-cabecera">' +
                    '<span class="admin-avatar">' + escaparHTML(p.nombre.charAt(0)) + "</span>" +
                    "<div>" +
                        "<h2>" + escaparHTML(p.nombre) + "</h2>" +
                        "<span>" + p.tomadas + " de " + p.tomas.length + " tomas hoy" +
                            (p.omitidas ? ' · <strong class="texto-alerta">' + p.omitidas + " sin registrar</strong>" : "") +
                        "</span>" +
                    "</div>" +
                "</header>" +
                '<ul class="cuidador-tomas">' + tomas + "</ul>" +
                '<div class="cuidador-datos">' +
                    "<div><span>🙂 Ánimo</span><strong>" + escaparHTML(emocion) + "</strong></div>" +
                    "<div><span>💧 Agua hoy</span><strong>" + p.agua + "/8 vasos</strong></div>" +
                    "<div><span>📅 Próxima cita</span><strong>" + escaparHTML(cita) + "</strong></div>" +
                "</div>" +
                '<div class="cuidador-acciones">' +
                    '<button type="button" class="boton-llamar-grande" onclick="iniciarLlamada({ receptor_id: ' + p.id + ' })">' +
                        "📹 Llamar a " + escaparHTML(p.nombre.split(" ")[0]) + "</button>" +
                    '<button type="button" class="panel-boton-secundario" onclick="verInforme(' + p.id + ')">' +
                        "📄 Informe de 7 días</button>" +
                "</div>" +
            "</article>"
        );

    }).join("");
}


function pintarAlertas(alertas) {

    const seccion = document.getElementById("seccionAlertas");

    seccion.hidden = alertas.length === 0;

    document.getElementById("listaAlertas").innerHTML = alertas.slice(0, 5).map(function(a) {

        return (
            '<div class="cuidador-alerta">' +
                "<strong>" + escaparHTML(a.adulto.split(" ")[0]) + " · " + escaparHTML(a.medicamento) + "</strong>" +
                "<span>" + escaparHTML(describirDia(a.fecha)) + ", programado a las " + escaparHTML(a.hora) + "</span>" +
            "</div>"
        );

    }).join("");
}


/* ---------- Informe de 7 días (solo lectura) ---------- */

async function verInforme(adultoId) {

    let informe;

    try {
        informe = (await api("GET", "/cuidador/personas/" + adultoId + "/informe")).informe;
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
        return;
    }

    const filas = informe.dias.map(function(d) {

        const dia = describirDia(d.fecha);

        return (
            "<tr>" +
                "<td>" + escaparHTML(dia) + "</td>" +
                "<td>" + (d.programadas ? d.tomadas + "/" + d.programadas : "—") + "</td>" +
                "<td>" + (d.agua !== null && d.agua !== undefined ? d.agua : "—") + "</td>" +
                "<td>" + (d.sueno !== null ? d.sueno + " h" : "—") + "</td>" +
                "<td>" + (d.actividad ? d.actividad + "′" : "—") + "</td>" +
                "<td>" + (d.emocion ? SP_EMOJIS[d.emocion] || d.emocion : "—") + "</td>" +
            "</tr>"
        );

    }).join("");

    const medicamentos = informe.medicamentos.map(function(m) {
        return "<li>💊 " + escaparHTML(m.nombre + " " + m.dosis) + " · " + escaparHTML(m.hora) + "</li>";
    }).join("") || "<li>Sin medicamentos.</li>";

    const citas = informe.citas.map(function(c) {
        return "<li>📅 " + escaparHTML(describirDia(c.fecha) + ", " + c.hora + " · " + c.medico + " (" + c.especialidad + ")") + "</li>";
    }).join("") || "<li>Sin citas pendientes.</li>";

    const emociones = informe.emociones.slice(-4).reverse().map(function(e) {
        return "<li>" + (SP_EMOJIS[e.emocion] || "") + " " + escaparHTML(e.emocion) +
            (e.comentario ? " — <em>" + escaparHTML(e.comentario) + "</em>" : "") + "</li>";
    }).join("") || "<li>Sin registros.</li>";

    abrirHoja({
        id: "informe-cuidador",
        titulo: "📄 " + informe.persona.nombre.split(" ")[0] + " · últimos 7 días",
        html:
            '<div class="informe-cuidador-resumen">' +
                "<strong>" + (informe.cumplimiento !== null ? informe.cumplimiento + "%" : "—") + "</strong>" +
                "<span>cumplimiento de medicamentos</span>" +
            "</div>" +
            '<div class="tabla-desplazable"><table class="tabla-informe-cuidador">' +
                "<thead><tr><th>Día</th><th>💊</th><th>💧</th><th>😴</th><th>🏃</th><th>🙂</th></tr></thead>" +
                "<tbody>" + filas + "</tbody>" +
            "</table></div>" +
            '<h3 class="panel-subtitulo">Medicamentos</h3><ul class="lista-informe">' + medicamentos + "</ul>" +
            '<h3 class="panel-subtitulo">Próximas citas</h3><ul class="lista-informe">' + citas + "</ul>" +
            '<h3 class="panel-subtitulo">Estado de ánimo reciente</h3><ul class="lista-informe">' + emociones + "</ul>" +
            '<p class="hoja-texto-suave">Solo lectura: los datos los registra ' + escaparHTML(informe.persona.nombre.split(" ")[0]) + " desde su app.</p>",
        acciones: [
            { texto: "📹 Llamar", clase: "panel-boton-principal", accion: function() { cerrarHoja(); iniciarLlamada({ receptor_id: adultoId }); } }
        ]
    });
}


/* ---------- Vincular con código ---------- */

async function vincularConCodigo() {

    const campo = document.getElementById("codigoVinculo");

    const codigo = campo.value.replace(/\D/g, "");

    const valido = validarFormulario([
        { id: "codigoVinculo", reglas: [[codigo.length === 6, "Escribe los 6 números del código."]] }
    ]);

    if (!valido) return;

    await conBotonOcupado(document.getElementById("botonVincular"), "Vinculando…", async function() {

        try {

            const respuesta = await api("POST", "/vinculos/aceptar", { codigo: codigo });

            campo.value = "";

            mostrarAviso("✅ " + respuesta.mensaje);

            cargarPanelCuidador();

        } catch (error) {

            mostrarErrorApi(error, { codigo: "codigoVinculo" });
        }
    });
}


/* ---------- Notificaciones ---------- */

async function revisarAvisoPush() {

    const aviso = document.getElementById("avisoPush");

    aviso.hidden = !pushSoportado() || await pushActivoEnEsteCelular();
}


document.getElementById("botonVincular").onclick = vincularConCodigo;

document.getElementById("codigoVinculo").addEventListener("keydown", function(event) {
    if (event.key === "Enter") vincularConCodigo();
});

document.getElementById("botonActivarPush").onclick = async function() {

    try {
        const resultado = await activarNotificacionesPush();
        mostrarAviso(resultado.ok ? resultado.mensaje : "⚠️ " + resultado.mensaje);
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
    }

    revisarAvisoPush();
};


document.addEventListener("DOMContentLoaded", function() {

    cargarPanelCuidador();

    revisarAvisoPush();

    setInterval(cargarPanelCuidador, 60000);
});
