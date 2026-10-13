/* =========================================
   SALUD+ - CITAS MÉDICAS
========================================= */


/* =========================================
   VARIABLES
========================================= */

let citas = JSON.parse(
    localStorage.getItem("citasMedicas")
) || [];


/* =========================================
   CARGAR CITAS
========================================= */

function cargarCitas() {

    const lista = document.getElementById("listaCitas");

    if (!lista) {
        return;
    }

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

    citas.forEach(function(cita, indice) {

        // Las citas antiguas que no tengan estado
        // se consideran pendientes.
        const estado = cita.estado || "pendiente";

        let textoEstado = "Pendiente";

        if (estado === "cumplida") {
            textoEstado = "Cumplida";
        }

        if (estado === "cancelada") {
            textoEstado = "Cancelada";
        }

        const tarjeta = document.createElement("article");

        tarjeta.className = "tarjeta-cita";

        tarjeta.innerHTML = `

            <div class="cita-fecha">
                <span class="cita-calendario">📅</span>
                ${formatearFecha(cita.fecha)}
            </div>

            <div class="cita-hora">
                ${convertirHora(cita.hora)}
            </div>

            <div class="cita-medico">
                ${cita.medico}
            </div>

            <div class="cita-especialidad">
                ${cita.especialidad}
            </div>

            <div class="cita-lugar">
                📍 ${cita.lugar}
            </div>

            <div class="estado-cita ${estado}">
                ${textoEstado}
            </div>

            ${
                estado === "pendiente"
                ?
                `
                <div class="acciones-cita">

                    <button
                        type="button"
                        class="boton-cita-cumplida"
                        onclick="cambiarEstadoCita(${indice}, 'cumplida')">

                        ✅ Marcar como cumplida

                    </button>

                    <button
                        type="button"
                        class="boton-cita-cancelar"
                        onclick="cambiarEstadoCita(${indice}, 'cancelada')">

                        ❌ Cancelar cita

                    </button>

                </div>
                `
                :
                ""
            }

            <button
                type="button"
                class="boton-eliminar-cita"
                onclick="eliminarCita(${indice})">

                🗑️ Eliminar cita

            </button>
        `;

        lista.appendChild(tarjeta);

    });
}


/* =========================================
   ABRIR FORMULARIO
========================================= */

function abrirFormularioCita() {

    const formulario =
        document.getElementById("formularioCita");

    if (!formulario) {
        return;
    }

    formulario.classList.remove("oculto");

}


/* =========================================
   CERRAR FORMULARIO
========================================= */

function cerrarFormularioCita() {

    const formulario =
        document.getElementById("formularioCita");

    if (!formulario) {
        return;
    }

    formulario.classList.add("oculto");

}


/* =========================================
   GUARDAR CITA
========================================= */

function guardarCita() {

    const medico =
        document.getElementById("nombreMedico").value.trim();

    const especialidad =
        document.getElementById("especialidad").value.trim();

    const fecha =
        document.getElementById("fechaCita").value;

    const hora =
        document.getElementById("horaCita").value;

    const lugar =
        document.getElementById("lugarCita").value.trim();


    /* VALIDAR */

    if (
        medico === "" ||
        especialidad === "" ||
        fecha === "" ||
        hora === "" ||
        lugar === ""
    ) {

        alert("Por favor completa todos los campos.");

        return;
    }


    /* CREAR CITA */

   const nuevaCita = {
    medico: medico,
    especialidad: especialidad,
    fecha: fecha,
    hora: hora,
    lugar: lugar,
    estado: "pendiente"
};


    /* AGREGAR */

    citas.push(nuevaCita);


    /* GUARDAR */

    localStorage.setItem(
        "citasMedicas",
        JSON.stringify(citas)
    );


    /* LIMPIAR */

    document.getElementById("nombreMedico").value = "";

    document.getElementById("especialidad").value = "";

    document.getElementById("fechaCita").value = "";

    document.getElementById("horaCita").value = "";

    document.getElementById("lugarCita").value = "";


    /* CERRAR */

    cerrarFormularioCita();


    /* ACTUALIZAR */

    cargarCitas();


    alert("¡Cita médica guardada correctamente!");

}


/* =========================================
   CONVERTIR HORA
========================================= */

function convertirHora(hora) {

    const partes = hora.split(":");

    let horas = parseInt(partes[0]);

    const minutos = partes[1];


    let periodo = "a. m.";


    if (horas >= 12) {

        periodo = "p. m.";

    }


    if (horas === 0) {

        horas = 12;

    }


    if (horas > 12) {

        horas = horas - 12;

    }


    return horas + ":" + minutos + " " + periodo;

}


/* =========================================
   FORMATEAR FECHA
========================================= */

function formatearFecha(fecha) {

    const partes = fecha.split("-");

    const año = partes[0];

    const mes = parseInt(partes[1]);

    const dia = parseInt(partes[2]);


    const meses = [

        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre"

    ];


    return (
        dia +
        " de " +
        meses[mes - 1] +
        " de " +
        año
    );

}

/* =========================================
   CAMBIAR ESTADO DE CITA
========================================= */

function cambiarEstadoCita(indice, nuevoEstado) {

    if (!citas[indice]) {
        return;
    }

    citas[indice].estado = nuevoEstado;

    localStorage.setItem(
        "citasMedicas",
        JSON.stringify(citas)
    );

    cargarCitas();

}

/* =========================================
   ELIMINAR CITA
========================================= */

function eliminarCita(indice) {

    const confirmar = confirm(
        "¿Quieres eliminar esta cita?"
    );


    if (!confirmar) {

        return;

    }


    citas.splice(indice, 1);


    localStorage.setItem(
        "citasMedicas",
        JSON.stringify(citas)
    );


    cargarCitas();

}


/* =========================================
   VOLVER AL DASHBOARD
========================================= */

function volverDashboard() {

    window.location.href = "dashboard.html";

}


/* =========================================
   INICIO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        cargarCitas();

    }
);