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

async function abrirRecordatorios() {

    const p = obtenerPreferenciasRecordatorios();

    const pushActivo = await pushActivoEnEsteCelular();

    const permiso = "Notification" in window ? Notification.permission : "no-soportado";

    const textoPermiso = !pushSoportado()
        ? "No disponibles en este navegador (en iPhone, instala la app primero)"
        : pushActivo ? "Activas en este celular ✅"
        : permiso === "denied" ? "Bloqueadas en el navegador"
        : "Desactivadas";

    const cuidador = esCuidador();

    abrirHoja({
        id: "config-recordatorios",
        titulo: cuidador ? "🔔 Notificaciones" : "🔔 Recordatorios",
        html:
            (cuidador ? "" :
            '<label class="interruptor-fila">' +
                "<span><strong>Avisos dentro de la app</strong>" +
                "<small>Te avisamos a la hora de cada medicamento y antes de tus citas.</small></span>" +
                '<input type="checkbox" id="prefActivos"' + (p.activos ? " checked" : "") + ">" +
            "</label>") +
            '<label class="interruptor-fila">' +
                "<span><strong>Notificaciones del celular</strong>" +
                "<small>" + (cuidador ? "Videollamadas y alertas de tomas olvidadas. " : "Recordatorios y videollamadas. ") +
                "Estado: " + textoPermiso + "</small></span>" +
                '<input type="checkbox" id="prefSistema"' + (pushActivo ? " checked" : "") +
                    (pushSoportado() ? "" : " disabled") + ">" +
            "</label>" +
            (cuidador ? "" :
            '<label class="interruptor-fila">' +
                "<span><strong>🔊 Leer recordatorios en voz alta</strong>" +
                "<small>Al abrir un recordatorio, la app lo lee en español.</small></span>" +
                '<input type="checkbox" id="prefVoz"' + (p.vozActiva ? " checked" : "") +
                    ("speechSynthesis" in window ? "" : " disabled") + ">" +
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
            '<pre class="vista-previa-recordatorio">' + escaparHTML(textoRecordatoriosDeHoy()) + "</pre>"),
        acciones: [
            cuidador
                ? { texto: "🔔 Probar", accion: probarPush }
                : { texto: "🔊 Probar voz", accion: function() { leerRecordatoriosEnVoz(); } },
            { texto: "Guardar", clase: "panel-boton-principal", accion: guardarConfiguracionRecordatorios }
        ]
    });
}


async function guardarConfiguracionRecordatorios() {

    const actual = obtenerPreferenciasRecordatorios();

    const marcado = function(id, porDefecto) {
        const campo = document.getElementById(id);
        return campo ? campo.checked : porDefecto;
    };

    const preferencias = {
        activos: marcado("prefActivos", actual.activos),
        sistema: marcado("prefSistema", false),
        vozActiva: marcado("prefVoz", actual.vozActiva),
        minutosCita: Number((document.getElementById("prefMinutosCita") || {}).value) || actual.minutosCita || 60
    };

    const boton = document.querySelector(".hoja-general .panel-boton-principal");

    await conBotonOcupado(boton, "Guardando…", async function() {

        let mensaje = "✅ Preferencias guardadas";

        try {

            // Notificaciones push: suscribir o desuscribir este celular
            const yaActivo = await pushActivoEnEsteCelular();

            if (preferencias.sistema && !yaActivo) {

                const resultado = await activarNotificacionesPush();

                if (!resultado.ok) {
                    preferencias.sistema = false;
                    mensaje = "⚠️ " + resultado.mensaje;
                }

            } else if (!preferencias.sistema && yaActivo) {

                await desactivarNotificacionesPush();
            }

            await guardarPreferenciasRecordatorios(preferencias);

            cerrarHoja();

            mostrarAviso(mensaje);

            if (preferencias.vozActiva && !actual.vozActiva) {
                leerEnVoz("Listo. Leeré tus recordatorios en voz alta.");
            }

        } catch (error) {

            mostrarAviso("⚠️ " + error.message);
        }
    });
}


async function probarPush() {

    try {
        await api("POST", "/push/probar");
        mostrarAviso("🔔 Notificación de prueba enviada");
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
    }
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


/* ========================================
   CUIDADO FAMILIAR (requerimiento avanzado)
======================================== */

function opcionAjustes(icono, titulo, detalle, accion) {

    return (
        '<button type="button" class="opcion-ajustes" onclick="' + accion + '">' +
            '<div class="opcion-ajustes-icono">' + icono + "</div>" +
            '<div class="opcion-ajustes-texto"><strong>' + titulo + "</strong><span>" + detalle + "</span></div>" +
            '<div class="opcion-ajustes-flecha">›</div>' +
        "</button>"
    );
}


function prepararAjustesPorRol() {

    const contenido = document.querySelector(".ajustes-contenido");

    if (!contenido || esAdministrador()) return;

    const cuidador = esCuidador();

    // Para el cuidador, "Recordatorios" configura sus notificaciones
    contenido.querySelectorAll(".opcion-ajustes").forEach(function(opcion) {
        const fuerte = opcion.querySelector("strong");
        const detalle = opcion.querySelector("span");
        if (fuerte && /Configurar recordatorios|Notificaciones/.test(fuerte.textContent)) {
            fuerte.textContent = cuidador ? "Notificaciones" : "Configurar recordatorios";
            if (detalle) detalle.textContent = cuidador ? "Videollamadas y alertas de tomas" : "Medicamentos y citas médicas";
        }
    });

    // El cuidador no tiene medicamentos ni informes propios
    contenido.querySelectorAll(".ajustes-seccion").forEach(function(seccion) {
        const titulo = (seccion.querySelector("h2") || {}).textContent || "";
        if (seccion.id !== "seccionFamilia" && /Medicamentos|Informes/.test(titulo)) {
            seccion.hidden = cuidador;
        }
    });

    let seccion = document.getElementById("seccionFamilia");

    if (!seccion) {

        seccion = document.createElement("section");

        seccion.className = "ajustes-seccion";

        seccion.id = "seccionFamilia";

        const perfil = contenido.querySelector(".ajustes-seccion");

        if (perfil) perfil.insertAdjacentElement("afterend", seccion);
        else contenido.prepend(seccion);
    }

    seccion.innerHTML =
        "<h2>👨‍👩‍👧 Cuidado familiar</h2>" +
        (cuidador
            ? opcionAjustes("🤝", "Personas que cuido", "Vincular con un código o dejar de cuidar", "abrirPersonasQueCuido()")
            : opcionAjustes("🤝", "Mi cuidador", "Vincula a tu familiar para que reciba alertas", "abrirMiCuidador()")) +
        opcionAjustes("📞", "Historial de llamadas", "Videollamadas hechas y recibidas", "abrirHistorialLlamadas()");
}


/* ---------- Adulto mayor: Mi cuidador ---------- */

async function abrirMiCuidador() {

    let datos;

    try {
        datos = await api("GET", "/vinculos");
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
        return;
    }

    const cuidadores = datos.cuidadores.length
        ? datos.cuidadores.map(function(c) {
            return (
                '<div class="vinculo-fila">' +
                    '<span class="admin-avatar">' + escaparHTML(c.nombre.charAt(0)) + "</span>" +
                    "<div><strong>" + escaparHTML(c.nombre) + "</strong><span>" + escaparHTML(c.correo) + "</span></div>" +
                    '<button type="button" class="boton-revocar" onclick="revocarVinculo(' + c.vinculo_id + ', \'' +
                        escaparHTML(c.nombre.split(" ")[0]).replace(/'/g, "") + '\')">Quitar</button>' +
                "</div>"
            );
        }).join("")
        : '<p class="panel-vacio">Todavía no tienes un cuidador vinculado.</p>';

    const codigo = datos.codigo_pendiente
        ? '<div class="codigo-vinculo">' +
              '<span class="codigo-vinculo-etiqueta">Tu código</span>' +
              '<strong class="codigo-vinculo-numero" aria-label="Código ' + datos.codigo_pendiente.codigo.split("").join(" ") + '">' +
                  datos.codigo_pendiente.codigo.slice(0, 3) + " " + datos.codigo_pendiente.codigo.slice(3) + "</strong>" +
              "<span>Vence " + new Date(datos.codigo_pendiente.vence).toLocaleString("es-CO", {
                  weekday: "long", hour: "numeric", minute: "2-digit" }) + "</span>" +
          "</div>"
        : "";

    abrirHoja({
        id: "mi-cuidador",
        titulo: "🤝 Mi cuidador",
        html:
            '<p class="hoja-texto">Tu cuidador podrá ver tu resumen del día y tu informe de 7 días, ' +
            "recibirá una alerta si olvidas una toma y podrá hacerte videollamadas. " +
            "<strong>No puede cambiar tus datos.</strong></p>" +
            '<h3 class="panel-subtitulo">Quién me cuida</h3>' + cuidadores +
            '<h3 class="panel-subtitulo">Vincular a un familiar</h3>' +
            (codigo || '<p class="hoja-texto-suave">Genera un código y dáselo a tu familiar. ' +
                "Él lo escribe en su cuenta de cuidador. El código vence en 24 horas.</p>"),
        acciones: [
            { texto: datos.codigo_pendiente ? "🔄 Nuevo código" : "🔢 Generar código", clase: "panel-boton-principal", accion: generarCodigoVinculo }
        ]
    });

    if (datos.codigo_pendiente && obtenerPreferenciasRecordatorios().vozActiva) {
        leerEnVoz("Tu código es " + datos.codigo_pendiente.codigo.split("").join(" "));
    }
}


async function generarCodigoVinculo() {

    try {
        await api("POST", "/vinculos/codigo");
        cerrarHoja();
        abrirMiCuidador();
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
    }
}


async function revocarVinculo(vinculoId, nombre) {

    if (!confirm("¿Quitar a " + nombre + "? Dejará de ver tu información y de recibir tus alertas.")) return;

    try {
        await api("DELETE", "/vinculos/" + vinculoId);
        mostrarAviso("✅ Vínculo eliminado");
        cerrarHoja();
        (esCuidador() ? abrirPersonasQueCuido : abrirMiCuidador)();
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
    }
}


/* ---------- Cuidador: personas que cuido ---------- */

async function abrirPersonasQueCuido() {

    let datos;

    try {
        datos = await api("GET", "/vinculos");
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
        return;
    }

    abrirHoja({
        id: "personas-cuido",
        titulo: "🤝 Personas que cuido",
        html: (datos.adultos.length
            ? datos.adultos.map(function(a) {
                return (
                    '<div class="vinculo-fila">' +
                        '<span class="admin-avatar">' + escaparHTML(a.nombre.charAt(0)) + "</span>" +
                        "<div><strong>" + escaparHTML(a.nombre) + "</strong><span>Desde " +
                            new Date(a.vinculado_en).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) + "</span></div>" +
                        '<button type="button" class="boton-revocar" onclick="revocarVinculo(' + a.vinculo_id + ', \'' +
                            escaparHTML(a.nombre.split(" ")[0]).replace(/'/g, "") + '\')">Dejar</button>' +
                    "</div>"
                );
            }).join("")
            : '<p class="panel-vacio">Aún no cuidas a nadie.</p>') +
            '<p class="hoja-texto-suave">Para vincular a otra persona, escribe su código en tu panel de inicio.</p>',
        acciones: [
            { texto: "Ir a mi panel", clase: "panel-boton-principal", accion: function() { irAPagina("panel-cuidador"); } }
        ]
    });
}


/* ---------- Historial de llamadas (RF-08) ---------- */

async function abrirHistorialLlamadas() {

    let llamadas;

    try {
        llamadas = (await api("GET", "/llamadas")).llamadas;
    } catch (error) {
        mostrarAviso("⚠️ " + error.message);
        return;
    }

    const estados = { finalizada: "✅", perdida: "📵", en_curso: "🟢", sonando: "🔔" };

    abrirHoja({
        id: "historial-llamadas",
        titulo: "📞 Historial de llamadas",
        html: llamadas.length
            ? llamadas.map(function(l) {
                const inicio = new Date(l.creada_en);
                const dur = l.duracion_segundos
                    ? Math.floor(l.duracion_segundos / 60) + " min " + (l.duracion_segundos % 60) + " s"
                    : (l.estado === "perdida" ? "No contestada" : "—");
                return (
                    '<div class="llamada-historial">' +
                        '<span class="llamada-historial-icono">' + (l.direccion === "saliente" ? "↗️" : "↙️") + "</span>" +
                        "<div><strong>" + escaparHTML(l.con) + "</strong>" +
                            "<span>" + escaparHTML(describirDia(fechaISO(inicio)) + ", " +
                                inicio.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" })) +
                            (l.cita ? " · cita con " + escaparHTML(l.cita.medico) : "") + "</span></div>" +
                        '<span class="llamada-historial-duracion">' + estados[l.estado] + " " + escaparHTML(dur) + "</span>" +
                    "</div>"
                );
            }).join("")
            : '<p class="panel-vacio">Todavía no hay llamadas.</p>'
    });
}


document.addEventListener("DOMContentLoaded", prepararAjustesPorRol);

document.addEventListener("saludplus:datos", prepararAjustesPorRol);
