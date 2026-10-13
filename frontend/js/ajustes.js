/* ========================================
   AJUSTES - SALUD+
   Requiere js/comun.js
======================================== */


/* NAVEGACIÓN */

function volverDashboard() { volverAtras(); }

function irAInicio() { irAPagina("dashboard"); }

function irAHistorial() { irAPagina("historial"); }

function irAAjustes() { irAPagina("ajustes"); }


/* ========================================
   MI PERFIL (ver y editar nombre)
======================================== */

async function abrirPerfil() {

    let usuario = {
        nombre: localStorage.getItem("nombreUsuario") || "",
        correo: localStorage.getItem("correoUsuario") || "",
        creado_en: null
    };

    try {
        usuario = (await api("GET", "/auth/yo")).usuario;
    } catch (error) {
        if (error.estado === 401) return;
    }

    const creada = usuario.creado_en
        ? new Date(usuario.creado_en).toLocaleDateString("es-CO", {
            day: "numeric", month: "long", year: "numeric"
        })
        : "—";

    abrirHoja({
        id: "perfil",
        titulo: "👤 Mi información",
        html:
            '<div class="hoja-campo">' +
                '<label for="perfilNombre">Nombre completo</label>' +
                '<input type="text" id="perfilNombre" maxlength="60" autocomplete="name" value="' +
                    escaparHTML(usuario.nombre) + '">' +
            "</div>" +
            '<div class="hoja-datos">' +
                "<div><span>Correo</span><strong>" + escaparHTML(usuario.correo || "—") + "</strong></div>" +
                "<div><span>Cuenta creada</span><strong>" + escaparHTML(creada) + "</strong></div>" +
            "</div>",
        acciones: [
            { texto: "Cancelar", accion: function() { cerrarHoja(); } },
            { texto: "Guardar", clase: "panel-boton-principal", accion: guardarPerfil }
        ]
    });
}


async function guardarPerfil() {

    const nuevo = document.getElementById("perfilNombre").value.trim().replace(/\s+/g, " ");

    const valido = validarFormulario([
        {
            id: "perfilNombre",
            reglas: [
                [nuevo !== "", "Escribe tu nombre."],
                [SP_REGEX.nombre.test(nuevo), "El nombre solo puede tener letras y espacios."],
                [contarLetras(nuevo) >= 3, "El nombre debe tener al menos 3 letras."]
            ]
        }
    ]);

    if (!valido) return;

    const boton = document.querySelector(".hoja-general .panel-boton-principal");

    await conBotonOcupado(boton, "Guardando...", async function() {

        try {

            const respuesta = await api("PUT", "/auth/perfil", { nombre: nuevo });

            localStorage.setItem("nombreUsuario", respuesta.usuario.nombre);

            avisarCambioDeDatos();

            cerrarHoja();

            mostrarAviso("✅ Nombre actualizado");

        } catch (error) {

            mostrarErrorApi(error, { nombre: "perfilNombre" });
        }
    });
}


/* ========================================
   RECORDATORIOS (configuración real)
======================================== */

function abrirRecordatorios() {

    const p = obtenerPreferenciasRecordatorios();

    const soporta = "Notification" in window;

    const permiso = soporta ? Notification.permission : "no-soportado";

    const textoPermiso = {
        granted: "Permitidas ✅",
        denied: "Bloqueadas en el navegador",
        "default": "Sin permiso todavía",
        "no-soportado": "No disponibles en este navegador"
    }[permiso];

    abrirHoja({
        id: "config-recordatorios",
        titulo: "🔔 Recordatorios",
        html:
            '<label class="interruptor-fila">' +
                "<span><strong>Avisos dentro de la app</strong>" +
                "<small>Te avisamos a la hora de cada medicamento y antes de tus citas.</small></span>" +
                '<input type="checkbox" id="prefActivos"' + (p.activos ? " checked" : "") + ">" +
            "</label>" +
            '<label class="interruptor-fila">' +
                "<span><strong>Notificaciones del celular</strong>" +
                "<small>Estado: " + textoPermiso + "</small></span>" +
                '<input type="checkbox" id="prefSistema"' +
                    (p.sistema && permiso === "granted" ? " checked" : "") +
                    (soporta ? "" : " disabled") + ">" +
            "</label>" +
            '<div class="hoja-campo">' +
                '<label for="prefMinutosCita">Avisar las citas con anticipación</label>' +
                '<select id="prefMinutosCita">' +
                    [30, 60, 120, 180].map(function(m) {
                        return '<option value="' + m + '"' + (Number(p.minutosCita) === m ? " selected" : "") + ">" +
                            (m < 60 ? m + " minutos antes" : (m / 60) + (m === 60 ? " hora antes" : " horas antes")) +
                            "</option>";
                    }).join("") +
                "</select>" +
            "</div>" +
            '<h3 class="panel-subtitulo">Así se verán tus recordatorios de hoy</h3>' +
            '<pre class="vista-previa-recordatorio">' + escaparHTML(textoRecordatoriosDeHoy()) + "</pre>",
        acciones: [
            { texto: "🔔 Probar aviso", accion: probarRecordatorio },
            { texto: "Guardar", clase: "panel-boton-principal", accion: guardarConfiguracionRecordatorios }
        ]
    });
}


function guardarConfiguracionRecordatorios() {

    const preferencias = {
        activos: document.getElementById("prefActivos").checked,
        sistema: document.getElementById("prefSistema").checked,
        minutosCita: Number(document.getElementById("prefMinutosCita").value) || 60
    };

    const terminar = async function(mensaje) {

        try {

            await guardarPreferenciasRecordatorios(preferencias);

            cerrarHoja();

            mostrarAviso(mensaje);

        } catch (error) {

            mostrarAviso("⚠️ " + error.message);
        }
    };

    if (preferencias.sistema) {

        solicitarPermisoNotificaciones(function(concedido, motivo) {

            if (!concedido) {

                preferencias.sistema = false;

                terminar("⚠️ " + motivo);

                return;
            }

            terminar("✅ Recordatorios guardados");
        });

        return;
    }

    terminar("✅ Recordatorios guardados");
}


function probarRecordatorio() {

    const pendientes = obtenerRecordatoriosDeHoy().filter(function(item) {
        return item.estado === "pendiente";
    });

    const primero = pendientes[0];

    mostrarBannerRecordatorio(
        primero
            ? primero.icono + " " + primero.titulo + " — " + primero.hora
            : "🔔 Así se verá un recordatorio de Salud+"
    );

    if ("Notification" in window && Notification.permission === "granted") {

        try {
            new Notification("Salud+ 🔔", {
                body: textoRecordatoriosDeHoy().replace("🔔 ", ""),
                icon: "img/icono.svg"
            });
        } catch (error) {}
    }
}


/* ========================================
   OTRAS OPCIONES
======================================== */

function abrirSeguimientoMedicamentos() {

    irAPagina("medicamentos");
}


function abrirInformes() {

    irAPagina("informes");
}


/* ========================================
   CERRAR SESIÓN
   Borra la sesión, conserva los registros
======================================== */

function cerrarSesion() {

    abrirHoja({
        id: "cerrar-sesion",
        titulo: "🚪 Cerrar sesión",
        html:
            '<p class="hoja-texto">¿Seguro que quieres salir?</p>' +
            '<p class="hoja-texto hoja-texto-suave">Tus medicamentos, citas y registros ' +
            "se conservan en este dispositivo. Los verás de nuevo al iniciar sesión.</p>",
        acciones: [
            { texto: "Cancelar", accion: function() { cerrarHoja(); } },
            { texto: "Cerrar sesión", clase: "panel-boton-peligro", accion: cerrarSesionUsuario }
        ]
    });
}


/* ========================================
   ADMINISTRACIÓN (solo rol admin)
======================================== */

function mostrarOpcionAdministrador() {

    const contenido = document.querySelector(".ajustes-contenido");

    const existente = document.getElementById("seccionAdmin");

    if (!esAdministrador()) {

        if (existente) existente.remove();

        return;
    }

    if (!contenido || existente) return;

    const seccion = document.createElement("section");

    seccion.className = "ajustes-seccion";

    seccion.id = "seccionAdmin";

    seccion.innerHTML =
        "<h2>🛡️ Administración</h2>" +
        '<button type="button" class="opcion-ajustes" onclick="irAPagina(\'admin\')">' +
            '<div class="opcion-ajustes-icono">📊</div>' +
            '<div class="opcion-ajustes-texto">' +
                "<strong>Panel de administración</strong>" +
                "<span>Usuarios y estadísticas del sistema</span>" +
            "</div>" +
            '<div class="opcion-ajustes-flecha">›</div>' +
        "</button>";

    contenido.prepend(seccion);
}


document.addEventListener("DOMContentLoaded", mostrarOpcionAdministrador);

document.addEventListener("saludplus:datos", mostrarOpcionAdministrador);
