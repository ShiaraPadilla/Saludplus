/* =========================================
   SALUD+ - HISTORIAL
========================================= */


/* =========================================
   CARGAR HISTORIAL EMOCIONAL
========================================= */

function cargarHistorial() {

    const lista =
        document.getElementById("listaHistorial");

    if (!lista) {

        return;

    }


    const registros =
        JSON.parse(
            localStorage.getItem(
                "registrosEmocionales"
            )
        ) || [];


    lista.innerHTML = "";


    /* =====================================
       SIN REGISTROS
    ===================================== */

    if (registros.length === 0) {

        lista.innerHTML = `

            <div class="sin-registros">

                <strong>
                    😊 Aún no tienes registros
                </strong>

                Registra cómo te sientes
                cada día para poder consultar
                tu historial aquí.

                <br><br>

                Puedes hacerlo desde
                <b>Estado emocional</b>.

            </div>

        `;

        return;

    }


    /* =====================================
       MOSTRAR DEL MÁS RECIENTE AL MÁS ANTIGUO
    ===================================== */

    const registrosOrdenados =
        [...registros].reverse();


    registrosOrdenados.forEach(
        function(registro, posicion) {


            const tarjeta =
                document.createElement("article");


            tarjeta.className =
                "tarjeta-historial";


            /* Emoji */

            let emoji = "😐";

            let clase = "regular";


            if (registro.emocion === "Muy bien") {

                emoji = "😄";

                clase = "muy-bien";

            }

            else if (registro.emocion === "Bien") {

                emoji = "🙂";

                clase = "bien";

            }

            else if (registro.emocion === "Regular") {

                emoji = "😐";

                clase = "regular";

            }

            else if (registro.emocion === "Mal") {

                emoji = "😞";

                clase = "mal";

            }

            else if (registro.emocion === "Muy mal") {

                emoji = "😠";

                clase = "muy-mal";

            }


            /* Comentario */

            let comentarioHTML =
                `<span class="sin-comentario">
                    No agregaste un comentario.
                </span>`;


            if (
                registro.comentario &&
                registro.comentario.trim() !== ""
            ) {

                comentarioHTML =
                    registro.comentario;

            }


            /* Crear tarjeta */

            tarjeta.innerHTML = `

                <div class="historial-superior">

                    <div class="historial-emoji ${clase}">

                        ${emoji}

                    </div>


                    <div>

                        <div class="historial-emocion">

                            ${registro.emocion}

                        </div>


                        <div class="historial-fecha">

                            📅 ${registro.fecha}

                            &nbsp;&nbsp;

                            🕐 ${registro.hora}

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

        }
    );

}


/* =========================================
   ELIMINAR REGISTRO
========================================= */

function eliminarRegistro(indice) {

    const confirmar =
        confirm(
            "¿Quieres eliminar este registro?"
        );


    if (!confirmar) {

        return;

    }


    let registros =
        JSON.parse(
            localStorage.getItem(
                "registrosEmocionales"
            )
        ) || [];


    registros.splice(indice, 1);


    localStorage.setItem(
        "registrosEmocionales",
        JSON.stringify(registros)
    );


    cargarHistorial();

}


/* =========================================
   FILTRO
========================================= */

function mostrarHistorialEmocional() {

    cargarHistorial();

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


function irAAjustes() {

    alert(
        "Los ajustes estarán disponibles próximamente."
    );

}


/* =========================================
   INICIO
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        cargarHistorial();

    }
);