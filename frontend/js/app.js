/* =========================================
   SALUD+ - JAVASCRIPT
   Inicio, login, registro, dashboard
   y medicamentos.

   Requiere js/comun.js (se carga antes).
========================================= */


/* =========================================
   PANTALLA DE INICIO
========================================= */

function comenzar() {

    // El servidor decide: si hay sesión abre el inicio, si no, el login
    window.location.href = haySesionActiva() ? "dashboard.html" : "login.html";
}


function conocerMas() {

    abrirHoja({
        id: "conocer",
        titulo: "¿Qué es Salud+?",
        html:
            '<p class="hoja-texto">Salud+ es una aplicación pensada para ' +
            "adultos mayores y sus familias. Te ayuda a cuidar y organizar " +
            "tu bienestar día a día.</p>" +
            '<ul class="hoja-lista">' +
                "<li>💊 Recordatorios de medicamentos y control de tomas</li>" +
                "<li>📅 Agenda de citas médicas</li>" +
                "<li>💚 Seguimiento de agua, actividad física y sueño</li>" +
                "<li>🙂 Registro de tu estado emocional</li>" +
                "<li>📄 Informes para compartir con tu médico</li>" +
            "</ul>",
        acciones: [
            { texto: "Comenzar", clase: "panel-boton-principal", accion: comenzar }
        ]
    });
}


/* =========================================
   LOGIN
========================================= */

function mostrarContrasena() {

    const campo = document.getElementById("contrasena");

    if (!campo) return;

    campo.type = campo.type === "password" ? "text" : "password";
}


function recuperarContrasena(event) {

    if (event) event.preventDefault();

    mostrarAviso("La recuperación de contraseña por correo estará disponible pronto.");
}


function continuarGoogle() {

    mostrarAviso("El inicio de sesión con Google estará disponible pronto.");
}


function crearCuenta(event) {

    if (event) event.preventDefault();

    window.location.href = "registro.html";
}


const formularioLogin = document.getElementById("formLogin");

if (formularioLogin) {

    // Desactivamos la validación del navegador para usar la nuestra
    formularioLogin.setAttribute("novalidate", "");

    // Rellenar el último correo usado
    const correoGuardado = localStorage.getItem("ultimoCorreo");

    if (correoGuardado) {
        document.getElementById("correo").value = correoGuardado;
    }

    formularioLogin.addEventListener("submit", async function(event) {

        event.preventDefault();

        const correo = document.getElementById("correo").value.trim().toLowerCase();

        const contrasena = document.getElementById("contrasena").value;

        const valido = validarFormulario([
            {
                id: "correo",
                reglas: [
                    [correo !== "", "Escribe tu correo electrónico."],
                    [SP_REGEX.correo.test(correo), "El correo no es válido. Ej: maria@correo.com"]
                ]
            },
            {
                id: "contrasena",
                reglas: [
                    [contrasena !== "", "Escribe tu contraseña."],
                    [contrasena.length >= 6, "La contraseña tiene al menos 6 caracteres."]
                ]
            }
        ]);

        if (!valido) return;

        const boton = formularioLogin.querySelector('button[type="submit"]');

        await conBotonOcupado(boton, "Entrando...", async function() {

            try {

                const respuesta = await api("POST", "/auth/login", {
                    correo: correo,
                    contrasena: contrasena
                });

                // Datos de otro usuario que hubiera en este equipo
                limpiarDatosDeSesionLocal();

                localStorage.setItem("sesionActiva", "true");
                localStorage.setItem("nombreUsuario", respuesta.usuario.nombre);
                localStorage.setItem("correoUsuario", respuesta.usuario.correo);
                localStorage.setItem("ultimoCorreo", respuesta.usuario.correo);

                window.location.href = "dashboard.html";

            } catch (error) {

                mostrarErrorApi(error, { correo: "correo", contrasena: "contrasena" });
            }
        });
    });
}


/* =========================================
   REGISTRO
========================================= */

function mostrarContrasenaRegistro() {

    const campo = document.getElementById("contrasenaRegistro");

    if (!campo) return;

    campo.type = campo.type === "password" ? "text" : "password";
}


const formularioRegistro = document.getElementById("formRegistro");

if (formularioRegistro) {

    formularioRegistro.setAttribute("novalidate", "");

    formularioRegistro.addEventListener("submit", async function(event) {

        event.preventDefault();

        const nombre = document.getElementById("nombre").value.trim().replace(/\s+/g, " ");

        const correo = document.getElementById("correoRegistro").value.trim().toLowerCase();

        const contrasena = document.getElementById("contrasenaRegistro").value;

        const confirmar = document.getElementById("confirmarContrasena").value;

        const valido = validarFormulario([
            {
                id: "nombre",
                reglas: [
                    [nombre !== "", "Escribe tu nombre."],
                    [SP_REGEX.nombre.test(nombre), "El nombre solo puede tener letras y espacios."],
                    [contarLetras(nombre) >= 3, "El nombre debe tener al menos 3 letras."],
                    [nombre.length <= 60, "El nombre es demasiado largo."]
                ]
            },
            {
                id: "correoRegistro",
                reglas: [
                    [correo !== "", "Escribe tu correo electrónico."],
                    [SP_REGEX.correo.test(correo), "El correo no es válido. Ej: maria@correo.com"]
                ]
            },
            {
                id: "contrasenaRegistro",
                reglas: [
                    [contrasena !== "", "Crea una contraseña."],
                    [contrasena.length >= 6, "Debe tener al menos 6 caracteres."],
                    [!/\s/.test(contrasena), "No puede tener espacios."]
                ]
            },
            {
                id: "confirmarContrasena",
                reglas: [
                    [confirmar !== "", "Repite tu contraseña."],
                    [confirmar === contrasena, "Las contraseñas no coinciden."]
                ]
            }
        ]);

        if (!valido) return;

        const boton = formularioRegistro.querySelector('button[type="submit"]');

        await conBotonOcupado(boton, "Creando cuenta...", async function() {

            try {

                await api("POST", "/auth/registro", {
                    nombre: nombre,
                    correo: correo,
                    contrasena: contrasena,
                    confirmar: confirmar
                });

                localStorage.setItem("ultimoCorreo", correo);

                avisoEnSiguientePantalla(
                    "✅ ¡Cuenta creada, " + nombre.split(" ")[0] + "! Ahora inicia sesión."
                );

                window.location.href = "login.html";

            } catch (error) {

                mostrarErrorApi(error, {
                    nombre: "nombre",
                    correo: "correoRegistro",
                    contrasena: "contrasenaRegistro",
                    confirmar: "confirmarContrasena"
                });
            }
        });
    });
}


/* =========================================
   NAVEGACIÓN
========================================= */

function irAMedicamentos() { irAPagina("medicamentos"); }

function irACitas() { irAPagina("citas"); }

function irABienestar() { irAPagina("bienestar"); }

function irAEmocional() { irAPagina("emocional"); }

function irAInicio() { irAPagina("dashboard"); }

function irAHistorial() { irAPagina("historial"); }

function irAAjustes() { irAPagina("ajustes"); }

function volverDashboard() { volverAtras(); }


/* Activar tarjetas no-botón con Enter o Espacio */

function activarConTeclado(event, accion) {

    if (event.key === "Enter" || event.key === " ") {

        event.preventDefault();

        accion();
    }
}


/* =========================================
   MIS MEDICAMENTOS
========================================= */

/* Copia local de los medicamentos (la fuente real es el servidor) */

let medicamentos = leerLista("medicamentos");


/* Índice del medicamento que se está editando (-1 = nuevo) */

let medicamentoEditando = -1;

/* Pestaña visible en Mis medicamentos */

let pestanaMedicamentos = "activos";


function cargarMedicamentos() {

    const lista = document.getElementById("listaMedicamentos");

    if (!lista) return;

    medicamentos = leerLista("medicamentos");

    lista.innerHTML = "";

    if (medicamentos.length === 0 && SP_sincronizando) {

        lista.innerHTML = '<div class="mensaje-historial">⏳ Cargando tus medicamentos...</div>';

        return;
    }

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

    const ahora = minutosAhora();

    obtenerTomasDeHoy().forEach(function(toma) {

        const medicamento = toma.medicamento;

        const indice = toma.indice;

        const tarjeta = document.createElement("article");

        tarjeta.className = "tarjeta-medicamento";

        tarjeta.tabIndex = 0;

        tarjeta.setAttribute("role", "button");

        tarjeta.setAttribute("aria-label", "Ver detalles de " + medicamento.nombre);

        tarjeta.onclick = function() {
            mostrarDetalleMedicamento(indice);
        };

        tarjeta.onkeydown = function(event) {
            if (event.target === tarjeta) {
                activarConTeclado(event, function() { mostrarDetalleMedicamento(indice); });
            }
        };


        let seguimientoHTML = "";

        if (toma.registro) {

            const tomado = toma.registro.estado === "tomado";

            seguimientoHTML = `
                <div class="seguimiento-medicamento seguimiento-listo">
                    <span class="chip-estado ${tomado ? "chip-tomado" : "chip-no-tomado"}">
                        ${tomado ? "✅ Tomado hoy a las " + escaparHTML(toma.registro.horaRegistro) : "❌ Marcado como no tomado hoy"}
                    </span>
                    <button
                        type="button"
                        class="boton-deshacer"
                        onclick="event.stopPropagation(); deshacerToma(${indice})">
                        Deshacer
                    </button>
                </div>
            `;

        } else {

            seguimientoHTML = `
                <div class="seguimiento-medicamento">
                    <div class="pregunta-medicamento">
                        ¿Tomaste este medicamento hoy?
                        ${toma.minutos < ahora ? '<span class="chip-estado chip-atrasado">⚠️ Atrasado</span>' : ""}
                    </div>
                    <div class="botones-seguimiento">
                        <button
                            type="button"
                            class="boton-tome"
                            onclick="event.stopPropagation(); registrarMedicamento(${indice}, 'tomado')">
                            ✅ Lo tomé
                        </button>
                        <button
                            type="button"
                            class="boton-no-tome"
                            onclick="event.stopPropagation(); registrarMedicamento(${indice}, 'no_tomado')">
                            ❌ No lo tomé
                        </button>
                    </div>
                </div>
            `;
        }


        tarjeta.innerHTML = `
            <div class="medicamento-contenido">
                <div class="medicamento-icono">💊</div>
                <div class="medicamento-datos">
                    <div class="medicamento-nombre">
                        ${escaparHTML(medicamento.nombre)} ${escaparHTML(medicamento.dosis)}
                    </div>
                    <div class="medicamento-dosis">
                        ${escaparHTML(medicamento.cantidad)}
                    </div>
                    <div class="medicamento-hora">
                        🕐 ${escaparHTML(medicamento.hora)}
                    </div>
                </div>
                <button
                    type="button"
                    class="medicamento-recordatorio"
                    aria-label="Recordatorio de ${escaparHTML(medicamento.nombre)}"
                    onclick="event.stopPropagation(); mostrarRecordatorioMedicamento(${indice})">
                    🔔
                </button>
            </div>
            ${seguimientoHTML}
        `;

        lista.appendChild(tarjeta);
    });
}


/* =========================================
   FORMULARIO (agregar / editar)
========================================= */

function abrirFormularioMedicamento(indiceEditar) {

    const formulario = document.getElementById("formularioMedicamento");

    if (!formulario) return;

    const titulo = formulario.querySelector(".formulario-header h2");

    const boton = formulario.querySelector(".boton-guardar-medicamento");

    limpiarErrores(formulario);

    if (typeof indiceEditar === "number" && medicamentos[indiceEditar]) {

        const m = medicamentos[indiceEditar];

        medicamentoEditando = indiceEditar;

        document.getElementById("nombreMedicamento").value = m.nombre;
        document.getElementById("dosisMedicamento").value = m.dosis;
        document.getElementById("cantidadMedicamento").value = m.cantidad;

        const minutos = horaAMinutos(m.hora);

        document.getElementById("horaMedicamento").value =
            String(Math.floor(minutos / 60)).padStart(2, "0") + ":" +
            String(minutos % 60).padStart(2, "0");

        if (titulo) titulo.textContent = "Editar medicamento";
        if (boton) boton.textContent = "Guardar cambios";

    } else {

        medicamentoEditando = -1;

        limpiarFormularioMedicamento();

        if (titulo) titulo.textContent = "Agregar medicamento";
        if (boton) boton.textContent = "Guardar medicamento";
    }

    formulario.classList.remove("oculto");

    document.getElementById("nombreMedicamento").focus();
}


function cerrarFormularioMedicamento() {

    const formulario = document.getElementById("formularioMedicamento");

    if (formulario) formulario.classList.add("oculto");

    medicamentoEditando = -1;
}


function limpiarFormularioMedicamento() {

    ["nombreMedicamento", "dosisMedicamento", "cantidadMedicamento", "horaMedicamento"]
        .forEach(function(id) {
            const campo = document.getElementById(id);
            if (campo) campo.value = "";
        });
}


async function guardarMedicamento() {

    const nombre = document.getElementById("nombreMedicamento").value.trim().replace(/\s+/g, " ");

    const dosis = document.getElementById("dosisMedicamento").value.trim();

    const cantidad = document.getElementById("cantidadMedicamento").value.trim();

    const horaInput = document.getElementById("horaMedicamento").value;

    const hora = horaInput ? convertirHora(horaInput) : "";

    medicamentos = leerLista("medicamentos");

    const repetido = medicamentos.some(function(m, i) {
        return (
            i !== medicamentoEditando &&
            m.nombre.toLowerCase() === nombre.toLowerCase() &&
            m.hora === hora
        );
    });

    const valido = validarFormulario([
        {
            id: "nombreMedicamento",
            reglas: [
                [nombre !== "", "Escribe el nombre del medicamento."],
                [contarLetras(nombre) >= 2, "El nombre debe tener al menos 2 letras."],
                [nombre.length <= 40, "El nombre es demasiado largo."]
            ]
        },
        {
            id: "dosisMedicamento",
            reglas: [
                [dosis !== "", "Escribe la dosis."],
                [SP_REGEX.tieneNumero.test(dosis), "La dosis debe incluir un número. Ej: 50 mg"],
                [dosis.length <= 20, "La dosis es demasiado larga."]
            ]
        },
        {
            id: "cantidadMedicamento",
            reglas: [
                [cantidad !== "", "Escribe la cantidad. Ej: 1 tableta"],
                [cantidad.length <= 30, "La cantidad es demasiado larga."]
            ]
        },
        {
            id: "horaMedicamento",
            reglas: [
                [horaInput !== "", "Elige la hora de la toma."]
            ]
        }
    ]);

    if (!valido) return;

    if (repetido) {

        mostrarErrorCampo("horaMedicamento", "Ya tienes " + nombre + " registrado a esa hora.");

        return;
    }

    const editando = medicamentoEditando >= 0;

    const actual = editando ? medicamentos[medicamentoEditando] : null;

    const boton = document.querySelector(".boton-guardar-medicamento");

    await conBotonOcupado(boton, "Guardando...", async function() {

        try {

            const datos = { nombre: nombre, dosis: dosis, cantidad: cantidad, hora: horaInput };

            const respuesta = editando
                ? await api("PUT", "/medicamentos/" + actual.id, datos)
                : await api("POST", "/medicamentos", datos);

            const guardado = medicamentoDesdeApi(respuesta.medicamento);

            if (editando) {
                medicamentos[medicamentoEditando] = guardado;
            } else {
                medicamentos.push(guardado);
            }

            guardarLista("medicamentos", medicamentos);

            limpiarFormularioMedicamento();

            cerrarFormularioMedicamento();

            pestanaMedicamentos = "activos";

            mostrarActivos();

            mostrarAviso(editando ? "✏️ Medicamento actualizado" : "✅ Medicamento agregado");

        } catch (error) {

            mostrarErrorApi(error, {
                nombre: "nombreMedicamento",
                dosis: "dosisMedicamento",
                cantidad: "cantidadMedicamento",
                hora: "horaMedicamento"
            });
        }
    });
}


/* "14:30" → "2:30 p. m." */

function convertirHora(hora) {

    return formatoHora12(hora);
}


/* =========================================
   DETALLE DEL MEDICAMENTO
========================================= */

function mostrarDetalleMedicamento(indice) {

    medicamentos = leerLista("medicamentos");

    const medicamento = medicamentos[indice];

    if (!medicamento) return;

    const registros = leerLista("seguimientoMedicamentos").filter(function(r) {
        return r.medicamento === medicamento.nombre;
    });

    const tomados = registros.filter(function(r) { return r.estado === "tomado"; }).length;

    const cumplimiento = registros.length
        ? Math.round((tomados / registros.length) * 100) + "%"
        : "Sin registros";

    abrirHoja({
        id: "detalle-medicamento",
        titulo: "💊 " + medicamento.nombre,
        html:
            '<div class="hoja-datos">' +
                "<div><span>Dosis</span><strong>" + escaparHTML(medicamento.dosis) + "</strong></div>" +
                "<div><span>Cantidad</span><strong>" + escaparHTML(medicamento.cantidad) + "</strong></div>" +
                "<div><span>Hora</span><strong>" + escaparHTML(medicamento.hora) + "</strong></div>" +
                "<div><span>Tomas registradas</span><strong>" + registros.length + "</strong></div>" +
                "<div><span>Cumplimiento</span><strong>" + cumplimiento + "</strong></div>" +
            "</div>",
        acciones: [
            {
                texto: "✏️ Editar",
                accion: function() {
                    cerrarHoja();
                    abrirFormularioMedicamento(indice);
                }
            },
            {
                texto: "🗑️ Eliminar",
                clase: "panel-boton-peligro",
                accion: function() {
                    eliminarMedicamento(indice);
                }
            }
        ]
    });
}


async function eliminarMedicamento(indice) {

    medicamentos = leerLista("medicamentos");

    const medicamento = medicamentos[indice];

    if (!medicamento) return;

    if (!confirm("¿Eliminar " + medicamento.nombre + "?\n\nSu historial de tomas se conserva.")) {
        return;
    }

    try {

        await api("DELETE", "/medicamentos/" + medicamento.id);

        medicamentos.splice(indice, 1);

        guardarLista("medicamentos", medicamentos);

        cerrarHoja();

        cargarMedicamentos();

        mostrarAviso("🗑️ Medicamento eliminado");

    } catch (error) {

        mostrarAviso("⚠️ " + error.message);
    }
}


/* Campana de cada medicamento */

function mostrarRecordatorioMedicamento(indice) {

    medicamentos = leerLista("medicamentos");

    const medicamento = medicamentos[indice];

    if (!medicamento) return;

    const preferencias = obtenerPreferenciasRecordatorios();

    const sistema =
        preferencias.sistema &&
        "Notification" in window &&
        Notification.permission === "granted";

    abrirHoja({
        id: "recordatorio-medicamento",
        titulo: "🔔 Recordatorio",
        html:
            '<p class="hoja-texto">Te recordaremos tomar <strong>' +
                escaparHTML(medicamento.nombre + " " + medicamento.dosis) +
            "</strong> todos los días a las <strong>" +
                escaparHTML(medicamento.hora) +
            "</strong>.</p>" +
            '<div class="hoja-datos">' +
                "<div><span>Avisos en la app</span><strong>" +
                    (preferencias.activos ? "✅ Activos" : "⏸️ Pausados") + "</strong></div>" +
                "<div><span>Notificaciones del celular</span><strong>" +
                    (sistema ? "✅ Activas" : "Desactivadas") + "</strong></div>" +
            "</div>",
        acciones: [
            { texto: "⚙️ Configurar", accion: function() { irAPagina("ajustes"); } },
            { texto: "Entendido", clase: "panel-boton-principal", accion: function() { cerrarHoja(); } }
        ]
    });
}


/* =========================================
   SEGUIMIENTO DE MEDICAMENTOS
========================================= */

function registrarMedicamento(indice, estado, silencioso) {

    const registro = registrarTomaMedicamento(indice, estado);

    if (!registro) return;

    if (!silencioso) {

        mostrarAviso(
            estado === "tomado"
                ? "✅ " + registro.medicamento + " marcado como tomado"
                : "❌ " + registro.medicamento + " marcado como no tomado"
        );
    }

    refrescarPestanaMedicamentos();
}


function deshacerToma(indice) {

    deshacerTomaMedicamento(indice);

    mostrarAviso("↩️ Registro deshecho");

    refrescarPestanaMedicamentos();
}


function refrescarPestanaMedicamentos() {

    if (!document.getElementById("listaMedicamentos")) return;

    if (pestanaMedicamentos === "historial") {
        mostrarHistorial();
    } else {
        cargarMedicamentos();
    }
}


/* =========================================
   ACTIVOS / HISTORIAL
========================================= */

function mostrarActivos() {

    pestanaMedicamentos = "activos";

    document.getElementById("tabActivos").classList.add("activo");

    document.getElementById("tabHistorial").classList.remove("activo");

    const info = document.querySelector(".informacion-medicamento");

    if (info) info.style.display = "";

    cargarMedicamentos();
}


function mostrarHistorial() {

    pestanaMedicamentos = "historial";

    document.getElementById("tabHistorial").classList.add("activo");

    document.getElementById("tabActivos").classList.remove("activo");

    const info = document.querySelector(".informacion-medicamento");

    if (info) info.style.display = "none";

    const lista = document.getElementById("listaMedicamentos");

    const seguimiento = leerLista("seguimientoMedicamentos");

    lista.innerHTML = "";

    if (seguimiento.length === 0) {

        lista.innerHTML = `
            <div class="mensaje-historial">
                <div style="font-size: 40px;">💊</div>
                <strong>Aún no tienes registros</strong>
                <br><br>
                Cuando marques un medicamento como
                <b>"Lo tomé"</b> o <b>"No lo tomé"</b>,
                aparecerá aquí.
            </div>
        `;

        return;
    }

    // Más recientes primero
    [...seguimiento].reverse().forEach(function(registro) {

        const tarjeta = document.createElement("article");

        tarjeta.className = "tarjeta-seguimiento";

        const estadoHTML = registro.estado === "tomado"
            ? '<div class="estado-medicamento tomado">✅ Tomado</div>'
            : '<div class="estado-medicamento no-tomado">❌ No tomado</div>';

        tarjeta.innerHTML = `
            <div class="seguimiento-superior">
                <div class="seguimiento-icono">💊</div>
                <div class="seguimiento-datos">
                    <div class="seguimiento-nombre">
                        ${escaparHTML(registro.medicamento)} ${escaparHTML(registro.dosis)}
                    </div>
                    <div class="seguimiento-cantidad">
                        ${escaparHTML(registro.cantidad)}
                    </div>
                </div>
                ${estadoHTML}
            </div>
            <div class="seguimiento-informacion">
                <div>📅 ${escaparHTML(describirDia(registro.fecha))} (${escaparHTML(registro.fecha)})</div>
                <div>🕐 Hora programada: ${escaparHTML(registro.horaProgramada)}</div>
                <div>🕐 Registrado: ${escaparHTML(registro.horaRegistro)}</div>
            </div>
        `;

        lista.appendChild(tarjeta);
    });
}


function calcularCumplimientoMedicamentos() {

    return calcularCumplimientoGeneral();
}


/* =========================================
   SALUD+ - DASHBOARD DINÁMICO
========================================= */

function cargarDashboard() {

    cargarNombreDashboard();
    cargarFechaDashboard();
    cargarResumenMedicamentos();
    cargarResumenCitas();
    cargarResumenEmocional();
    cargarResumenBienestar();
    cargarRecordatoriosDashboard();
}


function cargarNombreDashboard() {

    const elemento = document.getElementById("nombreUsuario");

    if (!elemento) return;

    const nombre = localStorage.getItem("nombreUsuario");

    // Solo el primer nombre para que quepa en pantalla
    elemento.textContent =
        nombre && nombre.trim() !== "" ? nombre.trim().split(" ")[0] : "Usuario";
}


function cargarFechaDashboard() {

    const elemento = document.getElementById("fechaHoy");

    if (!elemento) return;

    const texto = new Date().toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    elemento.textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
}


function cargarResumenMedicamentos() {

    const elemento = document.getElementById("resumenMedicamentos");

    if (!elemento) return;

    const tomas = obtenerTomasDeHoy();

    if (tomas.length === 0) {

        elemento.textContent = "No tienes medicamentos registrados";

        return;
    }

    const tomadas = tomas.filter(function(toma) {
        return toma.registro && toma.registro.estado === "tomado";
    }).length;

    const pendientes = tomas.filter(function(toma) {
        return !toma.registro;
    });

    let detalle = "";

    if (pendientes.length === 0) {

        detalle = "✅ Tomas de hoy registradas";

    } else {

        const ahora = minutosAhora();

        // Primero las atrasadas; si no hay, la próxima
        const atrasada = pendientes.find(function(toma) {
            return toma.minutos < ahora;
        });

        const proxima = atrasada || pendientes[0];

        detalle =
            (atrasada ? "⚠️ Pendiente: " : "Próxima: ") +
            proxima.medicamento.nombre +
            " • " +
            proxima.medicamento.hora;
    }

    elemento.innerHTML =
        '<span class="resumen-linea">' +
            tomadas + " de " + tomas.length + " tomadas hoy" +
        "</span>" +
        '<span class="resumen-linea resumen-destacado">' +
            escaparHTML(detalle) +
        "</span>";
}


function cargarResumenCitas() {

    const elemento = document.getElementById("resumenCitas");

    if (!elemento) return;

    const proxima = obtenerProximaCita(obtenerCitasPendientesOrdenadas());

    if (!proxima) {

        elemento.textContent = "No tienes citas pendientes";

        return;
    }

    elemento.innerHTML =
        '<span class="resumen-linea resumen-destacado">' +
            escaparHTML(describirDia(proxima.fecha) + " • " + formatoHora12(proxima.hora)) +
        "</span>" +
        '<span class="resumen-linea">' +
            escaparHTML(proxima.medico || proxima.especialidad || "") +
        "</span>";
}


/* Próxima cita que aún no ha pasado */

function obtenerProximaCita(citas) {

    const ahora = new Date();

    const futuras = citas
        .filter(function(cita) {
            return new Date(cita.fecha + "T" + cita.hora) >= ahora;
        })
        .sort(function(a, b) {
            return new Date(a.fecha + "T" + a.hora) - new Date(b.fecha + "T" + b.hora);
        });

    return futuras.length > 0 ? futuras[0] : null;
}


function cargarResumenEmocional() {

    const elemento = document.getElementById("resumenEmocional");

    if (!elemento) return;

    const registros = leerLista("registrosEmocionales");

    if (registros.length === 0) {

        elemento.textContent = "Aún no has registrado cómo te sientes";

        return;
    }

    const ultimo = registros[registros.length - 1];

    const emoji = SP_EMOJIS[ultimo.emocion] || "🙂";

    const esDeHoy = ultimo.fecha === fechaHoyLocal();

    elemento.textContent = (esDeHoy ? "Hoy: " : "Último: ") + emoji + " " + ultimo.emocion;


    /* Tarjeta superior "¿Cómo te sientes hoy?" */

    const cara = document.getElementById("caraSentimiento");

    const texto = document.getElementById("textoSentimiento");

    if (esDeHoy) {

        if (cara) cara.textContent = emoji;

        if (texto) {
            texto.textContent = "Hoy te sientes: " + ultimo.emocion + ". Toca para actualizar";
        }
    }
}


function cargarResumenBienestar() {

    const elemento = document.getElementById("resumenBienestarDashboard");

    if (!elemento) return;

    elemento.textContent =
        "💧 " + obtenerAguaDeHoy() + "/8 vasos • 🏃 " +
        actividadUltimos7Dias().length + "/7 días";
}


function cargarRecordatoriosDashboard() {

    const texto = document.getElementById("textoRecordatorio");

    const subtexto = document.getElementById("subtextoRecordatorio");

    const badge = document.getElementById("badgeNotificaciones");

    const total = contarRecordatoriosDeHoy();

    if (texto) {

        if (total === 0) {

            texto.textContent = "No tienes recordatorios";

            if (subtexto) subtexto.textContent = "pendientes para hoy 🎉";

        } else {

            texto.textContent = "Tienes " + total + " recordatorio" + (total === 1 ? "" : "s");

            if (subtexto) subtexto.textContent = "para hoy";
        }
    }

    if (badge) {

        badge.textContent = total > 9 ? "9+" : String(total);

        badge.classList.toggle("oculto-badge", total === 0);
    }
}


/* Compatibilidad con versiones anteriores */

function marcarTomaDashboard(indice, estado) {

    marcarTomaDesdePanel(indice, estado);
}


function mostrarAvisoDashboard(mensaje) {

    mostrarAviso(mensaje);
}


/* =========================================
   INICIAR
========================================= */

document.addEventListener("DOMContentLoaded", function() {

    if (document.querySelector(".dashboard")) {

        cargarDashboard();

        // Actualizar cada minuto (próxima toma, atrasos)
        setInterval(cargarDashboard, 60000);
    }

    if (document.getElementById("listaMedicamentos")) {

        cargarMedicamentos();
    }
});


/* Cuando se guarda algo, actualizar lo que esté en pantalla */

document.addEventListener("saludplus:datos", function() {

    if (document.querySelector(".dashboard")) {
        cargarDashboard();
    }

    if (document.getElementById("listaMedicamentos") && !SP_hojaActual) {
        refrescarPestanaMedicamentos();
    }
});
