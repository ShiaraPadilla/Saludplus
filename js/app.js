/* =========================================
   SALUD+ - JAVASCRIPT
   Pantalla de inicio
========================================= */


/* =========================================
   BOTÓN COMENZAR
========================================= */

function comenzar() {

    window.location.href = "login.html";

}


/* =========================================
   BOTÓN CONOCER MÁS
========================================= */

function conocerMas() {

    // Por ahora mostramos información.
    // Más adelante podemos crear una sección
    // de información sobre Salud+.

    alert(
        "Salud+ es una aplicación diseñada " +
        "para ayudarte a cuidar y organizar tu bienestar."
    );

}
/* =========================================
   MOSTRAR / OCULTAR CONTRASEÑA
========================================= */

function mostrarContrasena() {

    const campo = document.getElementById("contrasena");

    if (campo.type === "password") {

        campo.type = "text";

    } else {

        campo.type = "password";

    }
}


/* =========================================
   RECUPERAR CONTRASEÑA
========================================= */

function recuperarContrasena() {

    alert("Próximamente podrás recuperar tu contraseña.");

}


/* =========================================
   CONTINUAR CON GOOGLE
========================================= */

function continuarGoogle() {

    alert("Inicio de sesión con Google próximamente.");

}


/* =========================================
   CREAR CUENTA
========================================= */

function crearCuenta() {

    window.location.href = "registro.html";

}


/* =========================================
   FORMULARIO DE LOGIN
========================================= */

const formularioLogin = document.getElementById("formLogin");

if (formularioLogin) {

    formularioLogin.addEventListener("submit", function(event) {

        event.preventDefault();

        const correo = document.getElementById("correo").value;
        const contrasena = document.getElementById("contrasena").value;

        if (correo === "" || contrasena === "") {

            alert("Por favor completa todos los campos.");

            return;

        }

        window.location.href = "dashboard.html";

    });

}

/* =========================================
   MOSTRAR CONTRASEÑA DEL REGISTRO
========================================= */

function mostrarContrasenaRegistro() {

    const campo = document.getElementById("contrasenaRegistro");

    if (!campo) {
        return;
    }

    if (campo.type === "password") {

        campo.type = "text";

    } else {

        campo.type = "password";

    }
}


/* =========================================
   FORMULARIO DE REGISTRO
========================================= */

const formularioRegistro =
    document.getElementById("formRegistro");


if (formularioRegistro) {

    formularioRegistro.addEventListener(
        "submit",
        function(event) {

            event.preventDefault();


            const nombre =
                document.getElementById("nombre").value.trim();


            const correo =
                document.getElementById("correoRegistro").value.trim();


            const contrasena =
                document.getElementById(
                    "contrasenaRegistro"
                ).value;


            const confirmar =
                document.getElementById(
                    "confirmarContrasena"
                ).value;


            /* Comprobar contraseñas */

            if (contrasena !== confirmar) {

                alert("Las contraseñas no coinciden.");

                return;

            }


            /* Comprobar longitud */

            if (contrasena.length < 6) {

                alert(
                    "La contraseña debe tener al menos 6 caracteres."
                );

                return;

            }


            /* Registro provisional */

           // Guardar el nombre del usuario
localStorage.setItem("nombreUsuario", nombre);

// Mostrar mensaje
alert(
    "¡Cuenta creada correctamente, " +
    nombre +
    "!"
);

// Ir al login
window.location.href = "login.html";

        }
    );

}

/* =========================================
   DASHBOARD
========================================= */

function irAMedicamentos() {

    window.location.href =
        "medicamentos.html";

}


function irACitas() {

    window.location.href = "citas.html";

}


function irABienestar() {

    window.location.href =
        "bienestar.html";

}

function irAEmocional() {

    window.location.href =
        "emocional.html";

}


function mostrarNotificaciones() {

    const recordatorios = [];

    const medicamentos =
        JSON.parse(
            localStorage.getItem("medicamentos")
        ) || [];

    const citas =
        JSON.parse(
            localStorage.getItem("citasMedicas")
        ) || [];


    /* MEDICAMENTOS */

    medicamentos.forEach(function(medicamento) {

        recordatorios.push(
            "💊 " +
            medicamento.nombre +
            " - " +
            medicamento.hora
        );

    });


    /* CITAS */

    const citasPendientes =
        citas.filter(function(cita) {

            return (cita.estado || "pendiente")
                === "pendiente";

        });

    citasPendientes.forEach(function(cita) {

        recordatorios.push(
            "📅 Cita con " +
            cita.medico +
            " - " +
            cita.fecha +
            " " +
            cita.hora
        );

    });


    if (recordatorios.length === 0) {

        alert(
            "🔔 No tienes recordatorios pendientes."
        );

        return;
    }


    alert(
        "🔔 TUS RECORDATORIOS\n\n" +
        recordatorios.join("\n\n")
    );
}


function mostrarRecordatorios() {

    alert("Tienes 2 recordatorios para hoy.");

}


function irAInicio() {

    window.location.href = "dashboard.html";

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
   MOSTRAR NOMBRE DEL USUARIO
========================================= */

const nombreUsuario =
    document.getElementById("nombreUsuario");

if (nombreUsuario) {

    const nombreGuardado =
        localStorage.getItem("nombreUsuario");

    if (nombreGuardado) {

        nombreUsuario.textContent = nombreGuardado;

    }

}

/* =========================================
   MIS MEDICAMENTOS
========================================= */

let medicamentos = JSON.parse(
    localStorage.getItem("medicamentos")
) || [
    {
        nombre: "Losartán",
        dosis: "50 mg",
        cantidad: "1 tableta",
        hora: "8:00 a. m."
    },
    {
        nombre: "Metformina",
        dosis: "850 mg",
        cantidad: "1 tableta",
        hora: "1:00 p. m."
    },
    {
        nombre: "Atorvastatina",
        dosis: "20 mg",
        cantidad: "1 tableta",
        hora: "8:00 p. m."
    }
];


/* =========================================
   CARGAR MEDICAMENTOS
========================================= */

function cargarMedicamentos() {

    const lista = document.getElementById("listaMedicamentos");

    if (!lista) {
        return;
    }

    lista.innerHTML = "";

    if (medicamentos.length === 0) {

        lista.innerHTML = `
            <div class="mensaje-historial">
                No tienes medicamentos registrados.
                <br><br>
                Pulsa el botón + para agregar uno.
            </div>
        `;

        return;
    }


    medicamentos.forEach(function(medicamento, indice) {

        const tarjeta = document.createElement("article");

        tarjeta.className = "tarjeta-medicamento";


        tarjeta.innerHTML = `

            <div class="medicamento-contenido">

                <div class="medicamento-icono">
                    💊
                </div>

                <div class="medicamento-datos">

                    <div class="medicamento-nombre">
                        ${medicamento.nombre} ${medicamento.dosis}
                    </div>

                    <div class="medicamento-dosis">
                        ${medicamento.cantidad}
                    </div>

                    <div class="medicamento-hora">
                        🕐 ${medicamento.hora}
                    </div>

                </div>

                <button
                    type="button"
                    class="medicamento-recordatorio"
                    onclick="mostrarRecordatorioMedicamento('${medicamento.nombre}')">
                    🔔
                </button>

            </div>


            <div class="seguimiento-medicamento">

                <div class="pregunta-medicamento">
                    ¿Tomaste este medicamento?
                </div>

                <div class="botones-seguimiento">

                    <button
                        type="button"
                        class="boton-tome"
                        onclick="registrarMedicamento(${indice}, 'tomado')">
                        ✅ Lo tomé
                    </button>

                    <button
                        type="button"
                        class="boton-no-tome"
                        onclick="registrarMedicamento(${indice}, 'no_tomado')">
                        ❌ No lo tomé
                    </button>

                </div>

            </div>

        `;


        lista.appendChild(tarjeta);

    });

}


/* =========================================
   ABRIR FORMULARIO
========================================= */

function abrirFormularioMedicamento() {

    const formulario =
        document.getElementById(
            "formularioMedicamento"
        );

    formulario.classList.remove("oculto");

    document
        .getElementById("nombreMedicamento")
        .focus();

}


/* =========================================
   CERRAR FORMULARIO
========================================= */

function cerrarFormularioMedicamento() {

    document
        .getElementById("formularioMedicamento")
        .classList.add("oculto");

}


/* =========================================
   GUARDAR MEDICAMENTO
========================================= */

function guardarMedicamento() {

    const nombre =
        document
            .getElementById("nombreMedicamento")
            .value
            .trim();


    const dosis =
        document
            .getElementById("dosisMedicamento")
            .value
            .trim();


    const cantidad =
        document
            .getElementById("cantidadMedicamento")
            .value
            .trim();


    const horaInput =
        document
            .getElementById("horaMedicamento")
            .value;


    if (
        nombre === "" ||
        dosis === "" ||
        cantidad === "" ||
        horaInput === ""
    ) {

        alert(
            "Por favor completa todos los campos."
        );

        return;
    }


    const hora =
        convertirHora(horaInput);


    const nuevoMedicamento = {

        nombre: nombre,

        dosis: dosis,

        cantidad: cantidad,

        hora: hora

    };


    medicamentos.push(nuevoMedicamento);


    localStorage.setItem(
        "medicamentos",
        JSON.stringify(medicamentos)
    );


    document
        .getElementById("nombreMedicamento")
        .value = "";

    document
        .getElementById("dosisMedicamento")
        .value = "";

    document
        .getElementById("cantidadMedicamento")
        .value = "";

    document
        .getElementById("horaMedicamento")
        .value = "";


    cerrarFormularioMedicamento();

    cargarMedicamentos();


    alert(
        "Medicamento agregado correctamente."
    );

}


/* =========================================
   CONVERTIR HORA
========================================= */

function convertirHora(hora) {

    const partes = hora.split(":");

    let horas = parseInt(partes[0]);

    const minutos = partes[1];

    const periodo =
        horas >= 12 ? "p. m." : "a. m.";


    if (horas === 0) {
        horas = 12;
    }

    if (horas > 12) {
        horas -= 12;
    }


    return `${horas}:${minutos} ${periodo}`;

}


/* =========================================
   DETALLE
========================================= */

function mostrarDetalleMedicamento(indice) {

    const medicamento =
        medicamentos[indice];


    alert(
        "Medicamento: " +
        medicamento.nombre +
        "\nDosis: " +
        medicamento.dosis +
        "\nCantidad: " +
        medicamento.cantidad +
        "\nHora: " +
        medicamento.hora
    );

}


/* =========================================
   RECORDATORIO
========================================= */

/* =========================================
   SEGUIMIENTO DE MEDICAMENTOS
========================================= */

function registrarMedicamento(indice, estado) {

    const medicamento = medicamentos[indice];

    if (!medicamento) {
        return;
    }


    const ahora = new Date();


    const fecha = ahora.toLocaleDateString("es-CO");

    const horaRegistro = ahora.toLocaleTimeString(
        "es-CO",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );


    const registro = {

        medicamento: medicamento.nombre,

        dosis: medicamento.dosis,

        cantidad: medicamento.cantidad,

        horaProgramada: medicamento.hora,

        fecha: fecha,

        horaRegistro: horaRegistro,

        estado: estado

    };


    let seguimiento = JSON.parse(
        localStorage.getItem("seguimientoMedicamentos")
    ) || [];


    seguimiento.push(registro);


    localStorage.setItem(
        "seguimientoMedicamentos",
        JSON.stringify(seguimiento)
    );


    if (estado === "tomado") {

        alert(
            "✅ Medicamento registrado\n\n" +
            medicamento.nombre +
            " fue marcado como tomado."
        );

    } else {

        alert(
            "❌ Medicamento registrado\n\n" +
            medicamento.nombre +
            " fue marcado como no tomado."
        );

    }

}


/* =========================================
   ACTIVOS
========================================= */

function mostrarActivos() {

    document
        .getElementById("tabActivos")
        .classList.add("activo");

    document
        .getElementById("tabHistorial")
        .classList.remove("activo");

    cargarMedicamentos();

}


/* =========================================
   HISTORIAL DE MEDICAMENTOS
========================================= */

function mostrarHistorial() {

    document
        .getElementById("tabHistorial")
        .classList.add("activo");

    document
        .getElementById("tabActivos")
        .classList.remove("activo");


    const lista = document.getElementById(
        "listaMedicamentos"
    );


    const seguimiento = JSON.parse(
        localStorage.getItem("seguimientoMedicamentos")
    ) || [];


    lista.innerHTML = "";


    if (seguimiento.length === 0) {

        lista.innerHTML = `
            <div class="mensaje-historial">

                <div style="font-size: 40px;">
                    💊
                </div>

                <strong>
                    Aún no tienes registros
                </strong>

                <br><br>

                Cuando marques un medicamento como
                <b>"Lo tomé"</b> o
                <b>"No lo tomé"</b>,
                aparecerá aquí.

            </div>
        `;

        return;
    }


    // Mostrar primero los registros más recientes
    const registros = [...seguimiento].reverse();


    registros.forEach(function(registro) {

        const tarjeta = document.createElement("article");

        tarjeta.className = "tarjeta-seguimiento";


        let estadoHTML = "";


        if (registro.estado === "tomado") {

            estadoHTML = `
                <div class="estado-medicamento tomado">
                    ✅ Tomado
                </div>
            `;

        } else {

            estadoHTML = `
                <div class="estado-medicamento no-tomado">
                    ❌ No tomado
                </div>
            `;

        }


        tarjeta.innerHTML = `

            <div class="seguimiento-superior">

                <div class="seguimiento-icono">
                    💊
                </div>

                <div class="seguimiento-datos">

                    <div class="seguimiento-nombre">
                        ${registro.medicamento}
                        ${registro.dosis}
                    </div>

                    <div class="seguimiento-cantidad">
                        ${registro.cantidad}
                    </div>

                </div>

                ${estadoHTML}

            </div>


            <div class="seguimiento-informacion">

                <div>
                    📅 ${registro.fecha}
                </div>

                <div>
                    🕐 Hora programada:
                    ${registro.horaProgramada}
                </div>

                <div>
                    🕐 Registrado:
                    ${registro.horaRegistro}
                </div>

            </div>

        `;


        lista.appendChild(tarjeta);

    });

}


/* =========================================
   VOLVER
========================================= */

function volverDashboard() {

    window.location.href =
        "dashboard.html";

}


/* =========================================
   CARGAR AL ABRIR
========================================= */

if (
    document.getElementById(
        "listaMedicamentos"
    )
) {

    cargarMedicamentos();

}

function calcularCumplimientoMedicamentos() {

    const seguimiento = JSON.parse(
        localStorage.getItem("seguimientoMedicamentos")
    ) || [];

    if (seguimiento.length === 0) {
        return 0;
    }

    const medicamentosTomados = seguimiento.filter(
        function(registro) {
            return registro.estado === "tomado";
        }
    ).length;

    const porcentaje = Math.round(
        (medicamentosTomados / seguimiento.length) * 100
    );

    return porcentaje;
}

/* =========================================
   SALUD+ - DASHBOARD DINÁMICO
========================================= */

function cargarDashboard() {

    cargarNombreDashboard();
    cargarResumenMedicamentos();
    cargarResumenCitas();
    cargarResumenEmocional();
    cargarResumenBienestar();
}


/* =========================================
   NOMBRE DEL USUARIO
========================================= */

function cargarNombreDashboard() {

    const nombre =
        localStorage.getItem("nombreUsuario");

    const elemento =
        document.getElementById("nombreUsuario");

    if (!elemento) return;

    if (nombre && nombre.trim() !== "") {

        elemento.textContent = nombre;

    } else {

        elemento.textContent = "Usuario";

    }
}


/* =========================================
   MEDICAMENTOS
========================================= */

function cargarResumenMedicamentos() {

    const elemento =
        document.getElementById("resumenMedicamentos");

    if (!elemento) return;

    const medicamentos =
        JSON.parse(
            localStorage.getItem("medicamentos")
        ) || [];

    if (medicamentos.length === 0) {

        elemento.textContent =
            "No tienes medicamentos registrados";

        return;
    }

    const medicamento = medicamentos[0];

    elemento.textContent =
        medicamento.nombre +
        " • " +
        medicamento.hora;
}


/* =========================================
   CITAS
========================================= */

function cargarResumenCitas() {

    const elemento =
        document.getElementById("resumenCitas");

    if (!elemento) return;

    const citas =
        JSON.parse(
            localStorage.getItem("citasMedicas")
        ) || [];

    const citasPendientes =
        citas.filter(function(cita) {

            return (cita.estado || "pendiente")
                === "pendiente";

        });

    if (citasPendientes.length === 0) {

        elemento.textContent =
            "No tienes citas pendientes";

        return;
    }

    const proxima = obtenerProximaCita(citasPendientes);

    if (!proxima) {

        elemento.textContent =
            "Tienes citas pendientes";

        return;
    }

    elemento.textContent =
        proxima.fecha +
        " • " +
        proxima.hora;
}


/* =========================================
   OBTENER PRÓXIMA CITA
========================================= */

function obtenerProximaCita(citas) {

    const hoy = new Date();

    const citasFuturas = citas.filter(function(cita) {

        const fechaCita =
            new Date(
                cita.fecha + "T" + cita.hora
            );

        return fechaCita >= hoy;

    });

    if (citasFuturas.length === 0) {

        return null;

    }

    citasFuturas.sort(function(a, b) {

        const fechaA =
            new Date(a.fecha + "T" + a.hora);

        const fechaB =
            new Date(b.fecha + "T" + b.hora);

        return fechaA - fechaB;

    });

    return citasFuturas[0];
}


/* =========================================
   ESTADO EMOCIONAL
========================================= */

function cargarResumenEmocional() {

    const elemento =
        document.getElementById("resumenEmocional");

    if (!elemento) return;

    const registros =
        JSON.parse(
            localStorage.getItem("registrosEmocionales")
        ) || [];

    if (registros.length === 0) {

        elemento.textContent =
            "Aún no has registrado cómo te sientes";

        return;
    }

    const ultimo =
        registros[registros.length - 1];

    const emojis = {

        "Muy bien": "😄",

        "Bien": "🙂",

        "Regular": "😐",

        "Mal": "😞",

        "Muy mal": "😠"

    };

    const emoji =
        emojis[ultimo.emocion] || "🙂";

    elemento.textContent =
        emoji + " " + ultimo.emocion;
}


/* =========================================
   RESUMEN DE BIENESTAR
========================================= */

function cargarResumenBienestar() {

    const elemento =
        document.getElementById(
            "resumenBienestarDashboard"
        );

    if (!elemento) return;

    const agua =
        parseInt(
            localStorage.getItem("aguaConsumida")
        ) || 0;

    const actividad =
        JSON.parse(
            localStorage.getItem("actividadFisica")
        ) || [];

    elemento.textContent =
        "💧 " +
        agua +
        "/8 vasos • 🏃 " +
        actividad.length +
        "/7 días";
}


/* =========================================
   INICIAR DASHBOARD
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        cargarDashboard();

    }
);