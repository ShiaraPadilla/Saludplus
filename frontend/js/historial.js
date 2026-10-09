/* =========================================
   SALUD+ - HISTORIAL
   Reúne todo lo registrado: estado emocional,
   medicamentos, citas, actividad, agua y sueño.
   Requiere js/comun.js
========================================= */


let filtroHistorial = "todos";

const DESCRIPCIONES_HISTORIAL = {
    todos: "Aquí puedes consultar todo lo que has registrado.",
    emocional: "Aquí puedes consultar cómo te has sentido.",
    medicamentos: "Tomas de medicamentos que registraste.",
    citas: "Tus citas médicas y su estado.",
    bienestar: "Actividad física, agua y sueño."
};


/* =========================================
   CONSTRUIR LA LÍNEA DE TIEMPO
========================================= */

function obtenerEventosHistorial(filtro) {

    const eventos = [];

    const agregar = function(tipo, fechaTexto, hora, datos) {

        const fecha = textoAFecha(fechaTexto);

        if (!fecha) return;

        eventos.push(Object.assign({
            tipo: tipo,
            fecha: fecha,
            fechaTexto: fechaTexto,
            orden: fecha.getTime() + horaAMinutos(hora) * 60000,
            hora: hora || ""
        }, datos));
    };


    if (filtro === "todos" || filtro === "emocional") {

        leerLista("registrosEmocionales").forEach(function(r, indice) {

            agregar("emocional", r.fecha, r.hora, {
                icono: SP_EMOJIS[r.emocion] || "😐",
                titulo: "Me sentí: " + r.emocion,
                detalle: r.comentario || "",
                indice: indice
            });
        });
    }


    if (filtro === "todos" || filtro === "medicamentos") {

        leerLista("seguimientoMedicamentos").forEach(function(r) {

            const tomado = r.estado === "tomado";

            agregar("medicamentos", r.fecha, r.horaRegistro, {
                icono: "💊",
                titulo: r.medicamento + " " + (r.dosis || ""),
                detalle: "Programado: " + r.horaProgramada,
                etiqueta: tomado ? "✅ Tomado" : "❌ No tomado",
                claseEtiqueta: tomado ? "chip-tomado" : "chip-no-tomado"
            });
        });
    }


    if (filtro === "todos" || filtro === "citas") {

        obtenerCitasConIndice().forEach(function(c) {

            const etiquetas = {
                pendiente: ["⏳ Pendiente", "chip-atrasado"],
                cumplida: ["✅ Cumplida", "chip-tomado"],
                cancelada: ["❌ Cancelada", "chip-no-tomado"]
            };

            agregar("citas", c.fecha, c.hora, {
                icono: "📅",
                titulo: "Cita con " + c.medico,
                detalle: [c.especialidad, c.lugar].filter(Boolean).join(" • "),
                hora: formatoHora12(c.hora),
                etiqueta: etiquetas[c.estado][0],
                claseEtiqueta: etiquetas[c.estado][1]
            });
        });
    }


    if (filtro === "todos" || filtro === "bienestar") {

        leerLista("actividadFisica").forEach(function(r) {

            if (typeof r === "string") {
                agregar("bienestar", r, "", { icono: "🏃", titulo: "Actividad física", detalle: "" });
                return;
            }

            agregar("bienestar", r.fecha, "", {
                icono: "🏃",
                titulo: "Actividad: " + r.actividad,
                detalle: r.minutos + " minutos"
            });
        });

        leerLista("historialAgua").forEach(function(r) {

            agregar("bienestar", r.fecha, "", {
                icono: "💧",
                titulo: "Agua: " + r.vasos + "/8 vasos",
                detalle: ""
            });
        });

        const aguaHoy = obtenerAguaDeHoy();

        if (aguaHoy > 0) {

            agregar("bienestar", fechaHoyLocal(), "", {
                icono: "💧",
                titulo: "Agua: " + aguaHoy + "/8 vasos",
                detalle: "Hoy (en curso)"
            });
        }

        leerLista("registrosSueno").forEach(function(r) {

            agregar("bienestar", r.fecha, "", {
                icono: "😴",
                titulo: "Sueño: " + r.horas + " h",
                detalle: ""
            });
        });
    }

    // Más recientes primero
    return eventos.sort(function(a, b) {
        return b.orden - a.orden;
    });
}


/* =========================================
   PINTAR
========================================= */

function filtrarHistorial(filtro) {

    filtroHistorial = filtro;

    document.querySelectorAll(".filtro-historial").forEach(function(boton) {

        const activo = boton.dataset.filtro === filtro;

        boton.classList.toggle("filtro-activo", activo);

        boton.setAttribute("aria-selected", activo ? "true" : "false");
    });

    const descripcion = document.getElementById("descripcionHistorial");

    if (descripcion) descripcion.textContent = DESCRIPCIONES_HISTORIAL[filtro];

    if (filtro === "emocional") {

        cargarHistorial();

        return;
    }

    pintarLineaDeTiempo(filtro);
}


function pintarLineaDeTiempo(filtro) {

    const lista = document.getElementById("listaHistorial");

    if (!lista) return;

    const eventos = obtenerEventosHistorial(filtro);

    lista.innerHTML = "";

    if (eventos.length === 0) {

        lista.innerHTML = `
            <div class="sin-registros">
                <strong>📋 Aún no hay registros aquí</strong>
                Cuando registres medicamentos, citas, tu estado de ánimo
                o tu bienestar, aparecerán en esta lista.
            </div>
        `;

        return;
    }

    let diaActual = "";

    eventos.forEach(function(evento) {

        const clave = fechaISO(evento.fecha);

        if (clave !== diaActual) {

            diaActual = clave;

            const dia = describirDia(clave);

            const larga = formatoFechaLarga(clave);

            lista.insertAdjacentHTML(
                "beforeend",
                '<h3 class="historial-dia">' +
                    escaparHTML(
                        dia === "Hoy" || dia === "Ayer" || dia === "Mañana"
                            ? dia + " · " + larga
                            : larga.charAt(0).toUpperCase() + larga.slice(1)
                    ) +
                "</h3>"
            );
        }

        lista.insertAdjacentHTML(
            "beforeend",
            '<article class="evento-historial evento-' + evento.tipo + '">' +
                '<span class="evento-icono">' + evento.icono + "</span>" +
                '<div class="evento-datos">' +
                    "<strong>" + escaparHTML(evento.titulo) + "</strong>" +
                    (evento.detalle ? "<span>" + escaparHTML(evento.detalle) + "</span>" : "") +
                    (evento.etiqueta
                        ? '<span class="chip-estado ' + evento.claseEtiqueta + '">' + evento.etiqueta + "</span>"
                        : "") +
                "</div>" +
                (evento.hora ? '<span class="evento-hora">' + escaparHTML(evento.hora) + "</span>" : "") +
            "</article>"
        );
    });
}


/* =========================================
   HISTORIAL EMOCIONAL (tarjetas originales)
========================================= */

function cargarHistorial() {

    const lista = document.getElementById("listaHistorial");

    if (!lista) return;

    const registros = leerLista("registrosEmocionales");

    lista.innerHTML = "";

    if (registros.length === 0) {

        lista.innerHTML = `
            <div class="sin-registros">
                <strong>😊 Aún no tienes registros</strong>
                Registra cómo te sientes cada día para poder
                consultar tu historial aquí.
                <br><br>
                Puedes hacerlo desde <b>Estado emocional</b>.
            </div>
        `;

        return;
    }

    const clases = {
        "Muy bien": "muy-bien",
        "Bien": "bien",
        "Regular": "regular",
        "Mal": "mal",
        "Muy mal": "muy-mal"
    };

    [...registros].reverse().forEach(function(registro, posicion) {

        const tarjeta = document.createElement("article");

        tarjeta.className = "tarjeta-historial";

        const comentarioHTML =
            registro.comentario && registro.comentario.trim() !== ""
                ? escaparHTML(registro.comentario)
                : '<span class="sin-comentario">No agregaste un comentario.</span>';

        tarjeta.innerHTML = `
            <div class="historial-superior">
                <div class="historial-emoji ${clases[registro.emocion] || "regular"}">
                    ${SP_EMOJIS[registro.emocion] || "😐"}
                </div>
                <div>
                    <div class="historial-emocion">
                        ${escaparHTML(registro.emocion)}
                    </div>
                    <div class="historial-fecha">
                        📅 ${escaparHTML(describirDia(registro.fecha))}
                        &nbsp;&nbsp;
                        🕐 ${escaparHTML(registro.hora)}
                    </div>
                </div>
            </div>
            <div class="historial-comentario">
                ${comentarioHTML}
            </div>
            <button
                type="button"
                class="boton-eliminar-historial"
                onclick="eliminarRegistro(${registros.length - 1 - posicion})">
                Eliminar registro
            </button>
        `;

        lista.appendChild(tarjeta);
    });
}


function eliminarRegistro(indice) {

    if (!confirm("¿Quieres eliminar este registro?")) return;

    const registros = leerLista("registrosEmocionales");

    registros.splice(indice, 1);

    guardarLista("registrosEmocionales", registros);

    mostrarAviso("🗑️ Registro eliminado");
}


function mostrarHistorialEmocional() {

    filtrarHistorial("emocional");
}


/* =========================================
   NAVEGACIÓN
========================================= */

function volverDashboard() { volverAtras(); }

function irAInicio() { irAPagina("dashboard"); }

function irAHistorial() { irAPagina("historial"); }

function irAAjustes() { irAPagina("ajustes"); }


/* =========================================
   INICIO
========================================= */

document.addEventListener("DOMContentLoaded", function() {
    filtrarHistorial("todos");
});

document.addEventListener("saludplus:datos", function() {
    filtrarHistorial(filtroHistorial);
});
