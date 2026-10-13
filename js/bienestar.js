/* =========================================
   SALUD+ - MI BIENESTAR
========================================= */


/* =========================================
   CARGAR DATOS
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

    const registros =
        JSON.parse(
            localStorage.getItem(
                "registrosEmocionales"
            )
        ) || [];


    const estado =
        document.getElementById(
            "estadoEmocionalBienestar"
        );

    const emoji =
        document.getElementById(
            "emojiBienestar"
        );


    if (registros.length === 0) {

        estado.textContent =
            "Sin registros";

        emoji.textContent =
            "😐";

        return;

    }


    const ultimo =
        registros[registros.length - 1];


    estado.textContent =
        ultimo.emocion;


    const emojis = {

        "Muy bien": "😄",

        "Bien": "🙂",

        "Regular": "😐",

        "Mal": "😞",

        "Muy mal": "😠"

    };


    emoji.textContent =
        emojis[ultimo.emocion] || "😐";

}


/* =========================================
   MEDICAMENTOS
========================================= */

function cargarMedicamentos() {

    const medicamentos =
        JSON.parse(
            localStorage.getItem("medicamentos")
        ) || [];

    const resultado =
        document.getElementById(
            "medicamentosBienestar"
        );

    const barra =
        document.getElementById(
            "barraMedicamentos"
        );

    /*
        Obtenemos los registros de seguimiento
        de los medicamentos.
    */
    const seguimiento =
        JSON.parse(
            localStorage.getItem(
                "seguimientoMedicamentos"
            )
        ) || [];


    /*
        Si no hay medicamentos registrados
        mostramos 0%.
    */
    if (medicamentos.length === 0) {

        resultado.textContent = "0%";

        barra.style.width = "0%";

        return;
    }


    /*
        Si hay medicamentos pero todavía
        no se ha registrado ninguna toma.
    */
    if (seguimiento.length === 0) {

        resultado.textContent = "0%";

        barra.style.width = "0%";

        return;
    }


    /*
        Contamos cuántos medicamentos
        fueron marcados como tomados.
    */
    const medicamentosTomados =
        seguimiento.filter(
            function(registro) {

                return registro.estado === "tomado";

            }
        ).length;


    /*
        Calculamos el porcentaje real.
    */
    const porcentaje =
        Math.round(
            (medicamentosTomados /
                seguimiento.length) * 100
        );


    /*
        Mostramos el porcentaje.
    */
    resultado.textContent =
        porcentaje + "%";

    barra.style.width =
        porcentaje + "%";

}


/* =========================================
   CITAS
========================================= */

function cargarCitas() {

    const citas =
        JSON.parse(
            localStorage.getItem(
                "citasMedicas"
            )
        ) || [];


    const resultado =
        document.getElementById(
            "citasBienestar"
        );


    resultado.textContent =
        citas.length;

}


/* =========================================
   ACTIVIDAD
========================================= */

function cargarActividad() {

    const actividad =
        JSON.parse(
            localStorage.getItem(
                "actividadFisica"
            )
        ) || [];


    const resultado =
        document.getElementById(
            "actividadBienestar"
        );


    resultado.textContent =
        actividad.length + "/7 días";

}


/* =========================================
   ACTIVIDAD FÍSICA
========================================= */

let actividadSeleccionada = "";


/* =========================================
   ABRIR FORMULARIO
========================================= */

function registrarActividad() {

    const formulario =
        document.getElementById(
            "formularioActividad"
        );

    if (!formulario) return;

    formulario.classList.remove(
        "oculto"
    );

}


/* =========================================
   SELECCIONAR ACTIVIDAD
========================================= */

function seleccionarActividad(
    actividad,
    boton
) {

    actividadSeleccionada =
        actividad;


    const botones =
        document.querySelectorAll(
            ".opciones-actividad button"
        );


    botones.forEach(
        function(botonActual) {

            botonActual.classList.remove(
                "seleccionado"
            );

        }
    );


    boton.classList.add(
        "seleccionado"
    );

}


/* =========================================
   GUARDAR ACTIVIDAD
========================================= */

function guardarActividad() {

    if (
        actividadSeleccionada === ""
    ) {

        alert(
            "Selecciona el tipo de actividad."
        );

        return;

    }


    const minutos =
        parseInt(
            document.getElementById(
                "minutosActividad"
            ).value
        );


    if (
        isNaN(minutos) ||
        minutos <= 0 ||
        minutos > 300
    ) {

        alert(
            "Ingresa una cantidad de minutos válida."
        );

        return;

    }


    let actividad =
        JSON.parse(
            localStorage.getItem(
                "actividadFisica"
            )
        ) || [];


    const hoy =
        new Date().toLocaleDateString(
            "es-CO"
        );


    /*
        Evitamos registrar dos actividades
        el mismo día.
    */

    const existeHoy =
        actividad.some(
            function(registro) {

                if (
                    typeof registro ===
                    "string"
                ) {

                    return registro === hoy;

                }


                return registro.fecha === hoy;

            }
        );


    if (existeHoy) {

        alert(
            "Ya registraste actividad física hoy."
        );

        return;

    }


    const nuevoRegistro = {

        fecha: hoy,

        actividad:
            actividadSeleccionada,

        minutos: minutos

    };


    actividad.push(
        nuevoRegistro
    );


    /*
        Conservamos solamente los últimos
        7 registros.
    */

    if (actividad.length > 7) {

        actividad.shift();

    }


    localStorage.setItem(
        "actividadFisica",
        JSON.stringify(actividad)
    );


    cerrarActividad();

    cargarActividad();


    alert(
        "¡Actividad física registrada correctamente!"
    );

}


/* =========================================
   CERRAR FORMULARIO
========================================= */

function cerrarActividad() {

    const formulario =
        document.getElementById(
            "formularioActividad"
        );


    if (!formulario) return;


    formulario.classList.add(
        "oculto"
    );


    actividadSeleccionada =
        "";


    const minutos =
        document.getElementById(
            "minutosActividad"
        );


    if (minutos) {

        minutos.value = "";

    }


    document
        .querySelectorAll(
            ".opciones-actividad button"
        )
        .forEach(
            function(boton) {

                boton.classList.remove(
                    "seleccionado"
                );

            }
        );

}


/* =========================================
   AGUA
========================================= */

function cargarAgua() {
    const vasos = parseInt(localStorage.getItem("aguaConsumida")) || 0;

    const resultado = document.getElementById("aguaBienestar");

    if (resultado) {
        resultado.textContent = vasos + "/8 vasos";
    }

    const vasosVisuales = document.querySelectorAll(".vaso-agua");

    vasosVisuales.forEach(function(vaso, indice) {
        if (indice < vasos) {
            vaso.classList.add("tomado");
        } else {
            vaso.classList.remove("tomado");
        }
    });
}

function registrarAgua() {
    let vasos = parseInt(localStorage.getItem("aguaConsumida")) || 0;

    if (vasos >= 8) {
        alert("💧 Ya registraste los 8 vasos de agua de hoy.");
        return;
    }

    vasos++;

    localStorage.setItem("aguaConsumida", vasos);

    cargarAgua();

    if (vasos === 8) {
        alert("🎉 ¡Excelente! Alcanzaste los 8 vasos de agua de hoy.");
    } else {
        alert("💧 ¡Vaso de agua registrado!");
    }
}


/* =========================================
   SUEÑO
========================================= */

function cargarSueno() {

    const sueno =
        localStorage.getItem(
            "horasSueno"
        );


    const resultado =
        document.getElementById(
            "suenoBienestar"
        );


    if (!sueno) {

        resultado.textContent =
            "Sin registro";

        return;

    }


    resultado.textContent =
        sueno + " h promedio";

}


/* =========================================
   REGISTRAR SUEÑO
========================================= */

function registrarSueno() {
    const formulario = document.getElementById("formularioSueno");

    if (!formulario) return;

    formulario.classList.remove("oculto");
}

function guardarSueno() {

    const input = document.getElementById("horasSuenoInput");

    if (!input) return;

    const horas = parseFloat(input.value);

    if (isNaN(horas) || horas <= 0 || horas > 24) {
        alert("😴 Ingresa una cantidad de horas válida.");
        return;
    }

    localStorage.setItem("horasSueno", horas);

    cerrarSueno();

    cargarSueno();

    alert("😴 ¡Registro de sueño guardado correctamente!");
}

function cerrarSueno() {

    const formulario = document.getElementById("formularioSueno");

    if (!formulario) return;

    formulario.classList.add("oculto");

    const input = document.getElementById("horasSuenoInput");

    if (input) {
        input.value = "";
    }
}


/* =========================================
   PERIODO
========================================= */

function seleccionarPeriodo() {

    alert(
        "Actualmente estás viendo los datos de esta semana."
    );

}


/* =========================================
   NAVEGACIÓN
========================================= */

function volverDashboard() {

    window.location.href =
        "dashboard.html";

}


function irAInicio() {

    window.location.href =
        "dashboard.html";

}


function irAHistorial() {

    window.location.href =
        "historial.html";

}


function irAAjustes() {

    window.location.href =
        "ajustes.html";

}


/* =========================================
   INICIAR
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        cargarBienestar();

    }
);