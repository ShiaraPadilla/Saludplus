/* =========================================
   SALUD+ - ESTADO EMOCIONAL
========================================= */


/* =========================================
   VARIABLES
========================================= */

let emocionSeleccionada = "";


/* =========================================
   SELECCIONAR EMOCIÓN
========================================= */

function seleccionarEmocion(emocion, boton) {

    emocionSeleccionada = emocion;


    /* Quitar selección anterior */

    const botones =
        document.querySelectorAll(".boton-emocion");


    botones.forEach(function(botonActual) {

        botonActual.classList.remove(
            "seleccionado"
        );

    });


    /* Marcar selección */

    boton.classList.add("seleccionado");

}


/* =========================================
   CONTADOR
========================================= */

function actualizarContador() {

    const comentario =
        document.getElementById(
            "comentarioEmocional"
        );


    const contador =
        document.getElementById(
            "contadorCaracteres"
        );


    contador.textContent =
        comentario.value.length + "/300";

}


/* =========================================
   GUARDAR ESTADO EMOCIONAL
========================================= */

function guardarEstadoEmocional() {

    const comentario =
        document
            .getElementById(
                "comentarioEmocional"
            )
            .value
            .trim();


    /* Comprobar emoción */

    if (emocionSeleccionada === "") {

        alert(
            "Por favor selecciona cómo te sientes."
        );

        return;
    }


    /* Crear registro */

    const registro = {

        emocion: emocionSeleccionada,

        comentario: comentario,

        fecha: new Date().toLocaleDateString(
            "es-CO"
        ),

        hora: new Date().toLocaleTimeString(
            "es-CO",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        )

    };


    /* Obtener registros anteriores */

    let registros = JSON.parse(
        localStorage.getItem(
            "registrosEmocionales"
        )
    ) || [];


    /* Agregar nuevo registro */

    registros.push(registro);


    /* Guardar */

    localStorage.setItem(
        "registrosEmocionales",
        JSON.stringify(registros)
    );


    alert(
        "¡Tu estado emocional fue guardado correctamente!"
    );


    /* Volver al panel */

    window.location.href =
        "dashboard.html";

}


/* =========================================
   VOLVER
========================================= */

function volverDashboard() {

    window.location.href =
        "dashboard.html";

}


/* =========================================
   NAVEGACIÓN
========================================= */

function irAInicio() {

    window.location.href =
        "dashboard.html";

}


function irAHistorial() {

    window.location.href =
        "historial.html";

}


function irAAjustes() {

    alert(
        "Los ajustes estarán disponibles próximamente."
    );

}