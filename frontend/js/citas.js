/* =========================================
   SALUD+ - CITAS MÉDICAS
   Requiere js/comun.js
========================================= */


let citas = leerLista("citasMedicas");


/* =========================================
   CARGAR CITAS
========================================= */

function cargarCitas() {

    const lista = document.getElementById("listaCitas");

    if (!lista) return;

    citas = leerLista("citasMedicas");

    lista.innerHTML = "";

    if (citas.length === 0) {

        lista.innerHTML = `
            <div class="mensaje-sin-citas">
                No tienes citas médicas registradas.
                <br><br>
                Pulsa el botón + para agregar una cita.
            </div>
        `;

        return;
    }

    const ahora = new Date();

    const todas = obtenerCitasConIndice();

    const ordenarAsc = function(a, b) {
        return (a.fecha + a.hora).localeCompare(b.fecha + b.hora);
    };

    const proximas = todas.filter(function(c) {
        return c.estado === "pendiente" && new Date(c.fecha + "T" + c.hora) >= ahora;
    }).sort(ordenarAsc);

    const porConfirmar = todas.filter(function(c) {
        return c.estado === "pendiente" && new Date(c.fecha + "T" + c.hora) < ahora;
    }).sort(ordenarAsc);

    const anteriores = todas.filter(function(c) {
        return c.estado !== "pendiente";
    }).sort(ordenarAsc).reverse();


    if (proximas.length === 0) {

        lista.insertAdjacentHTML(
            "beforeend",
            '<div class="mensaje-sin-citas">No tienes citas próximas. ' +
            "Pulsa el botón + para agregar una.</div>"
        );
    }

    proximas.forEach(function(cita) {
        lista.appendChild(crearTarjetaCita(cita, false));
    });

    if (porConfirmar.length > 0) {

        lista.insertAdjacentHTML(
            "beforeend",
            '<h2 class="subtitulo-citas">⏰ ¿Asististe a estas citas?</h2>'
        );

        porConfirmar.forEach(function(cita) {
            lista.appendChild(crearTarjetaCita(cita, true));
        });
    }

    if (anteriores.length > 0) {

        lista.insertAdjacentHTML(
            "beforeend",
            '<h2 class="subtitulo-citas">📁 Citas anteriores</h2>'
        );

        anteriores.forEach(function(cita) {
            lista.appendChild(crearTarjetaCita(cita, false));
        });
    }
}


function crearTarjetaCita(cita, pasada) {

    const estado = cita.estado;

    const textos = {
        pendiente: pasada ? "Sin confirmar" : "Pendiente",
        cumplida: "Cumplida",
        cancelada: "Cancelada"
    };

    const tarjeta = document.createElement("article");

    tarjeta.className = "tarjeta-cita" + (estado !== "pendiente" ? " cita-cerrada" : "");

    tarjeta.innerHTML = `
        <div class="cita-fecha">
            <span class="cita-calendario">📅</span>
            ${escaparHTML(describirDia(cita.fecha) === "Hoy" ? "Hoy, " + formatearFecha(cita.fecha) : formatearFecha(cita.fecha))}
        </div>
        <div class="cita-hora">
            ${escaparHTML(convertirHora(cita.hora))}
        </div>
        <div class="cita-medico">
            ${escaparHTML(cita.medico)}
        </div>
        <div class="cita-especialidad">
            ${escaparHTML(cita.especialidad)}
        </div>
        <div class="cita-lugar">
            📍 ${escaparHTML(cita.lugar)}
        </div>
        <div class="estado-cita ${estado}">
            ${textos[estado] || "Pendiente"}
        </div>
        ${
            estado === "pendiente"
            ? `
            <div class="acciones-cita">
                <button
                    type="button"
                    class="boton-cita-cumplida"
                    onclick="cambiarEstadoCita(${cita.indice}, 'cumplida')">
                    ✅ ${pasada ? "Sí, asistí" : "Marcar como cumplida"}
                </button>
                <button
                    type="button"
                    class="boton-cita-cancelar"
                    onclick="cambiarEstadoCita(${cita.indice}, 'cancelada')">
                    ❌ ${pasada ? "No asistí" : "Cancelar cita"}
                </button>
            </div>
            `
            : `
            <button
                type="button"
                class="boton-deshacer"
                onclick="cambiarEstadoCita(${cita.indice}, 'pendiente')">
                ↩️ Volver a pendiente
            </button>
            `
        }
        <button
            type="button"
            class="boton-eliminar-cita"
            onclick="eliminarCita(${cita.indice})">
            🗑️ Eliminar cita
        </button>
    `;

    return tarjeta;
}


/* =========================================
   FORMULARIO
========================================= */

function abrirFormularioCita() {

    const formulario = document.getElementById("formularioCita");

    if (!formulario) return;

    // No permitir fechas pasadas en el calendario
    document.getElementById("fechaCita").min = fechaISO(new Date());

    formulario.classList.remove("oculto");
}


function cerrarFormularioCita() {

    const formulario = document.getElementById("formularioCita");

    if (!formulario) return;

    formulario.classList.add("oculto");
}


function guardarCita() {

    const medico = document.getElementById("nombreMedico").value.trim().replace(/\s+/g, " ");

    const especialidad = document.getElementById("especialidad").value.trim().replace(/\s+/g, " ");

    const fecha = document.getElementById("fechaCita").value;

    const hora = document.getElementById("horaCita").value;

    const lugar = document.getElementById("lugarCita").value.trim().replace(/\s+/g, " ");

    const hoy = fechaISO(new Date());

    const fechaHora = fecha && hora ? new Date(fecha + "T" + hora) : null;

    const unAnio = new Date();

    unAnio.setFullYear(unAnio.getFullYear() + 2);

    const choque = leerLista("citasMedicas").some(function(cita) {
        return (
            (cita.estado || "pendiente") === "pendiente" &&
            cita.fecha === fecha &&
            cita.hora === hora
        );
    });

    const valido = validarFormulario([
        {
            id: "nombreMedico",
            reglas: [
                [medico !== "", "Escribe el nombre del médico."],
                [SP_REGEX.nombre.test(medico), "Usa solo letras. Ej: Dra. María López"],
                [contarLetras(medico) >= 3, "El nombre debe tener al menos 3 letras."],
                [medico.length <= 60, "El nombre es demasiado largo."]
            ]
        },
        {
            id: "especialidad",
            reglas: [
                [especialidad !== "", "Escribe la especialidad. Ej: Medicina general"],
                [contarLetras(especialidad) >= 3, "La especialidad debe tener al menos 3 letras."],
                [especialidad.length <= 50, "La especialidad es demasiado larga."]
            ]
        },
        {
            id: "fechaCita",
            reglas: [
                [fecha !== "", "Elige la fecha de la cita."],
                [fecha >= hoy, "La fecha no puede ser anterior a hoy."],
                [!fechaHora || fechaHora <= unAnio, "La fecha es demasiado lejana."]
            ]
        },
        {
            id: "horaCita",
            reglas: [
                [hora !== "", "Elige la hora de la cita."],
                [fecha !== hoy || !fechaHora || fechaHora > new Date(), "Esa hora ya pasó. Elige una hora más tarde."],
                [!choque, "Ya tienes otra cita a esa misma hora."]
            ]
        },
        {
            id: "lugarCita",
            reglas: [
                [lugar !== "", "Escribe el lugar de la cita."],
                [contarLetras(lugar) >= 3, "El lugar debe tener al menos 3 letras."],
                [lugar.length <= 80, "El lugar es demasiado largo."]
            ]
        }
    ]);

    if (!valido) return;

    citas = leerLista("citasMedicas");

    citas.push({
        medico: medico,
        especialidad: especialidad,
        fecha: fecha,
        hora: hora,
        lugar: lugar,
        estado: "pendiente"
    });

    guardarLista("citasMedicas", citas);

    ["nombreMedico", "especialidad", "fechaCita", "horaCita", "lugarCita"].forEach(function(id) {
        document.getElementById(id).value = "";
    });

    cerrarFormularioCita();

    cargarCitas();

    mostrarAviso("📅 Cita guardada para " + describirDia(fecha).toLowerCase() + " a las " + convertirHora(hora));
}


/* =========================================
   FORMATOS
========================================= */

function convertirHora(hora) {

    return formatoHora12(hora);
}


function formatearFecha(fecha) {

    return formatoFechaLarga(fecha);
}


/* =========================================
   CAMBIAR ESTADO / ELIMINAR
========================================= */

function cambiarEstadoCita(indice, nuevoEstado) {

    citas = leerLista("citasMedicas");

    if (!citas[indice]) return;

    citas[indice].estado = nuevoEstado;

    guardarLista("citasMedicas", citas);

    cargarCitas();

    const mensajes = {
        cumplida: "✅ Cita marcada como cumplida",
        cancelada: "❌ Cita cancelada",
        pendiente: "↩️ Cita de nuevo pendiente"
    };

    mostrarAviso(mensajes[nuevoEstado] || "Cita actualizada");
}


function eliminarCita(indice) {

    if (!confirm("¿Quieres eliminar esta cita?")) return;

    citas = leerLista("citasMedicas");

    citas.splice(indice, 1);

    guardarLista("citasMedicas", citas);

    cargarCitas();

    mostrarAviso("🗑️ Cita eliminada");
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

document.addEventListener("DOMContentLoaded", cargarCitas);

document.addEventListener("saludplus:datos", function() {
    if (!SP_hojaActual) cargarCitas();
});
