/* =========================================
   SALUD+ - PANEL DE ADMINISTRACIÓN
   Requiere js/comun.js
========================================= */


async function cargarPanelAdmin() {

    try {

        const respuestas = await Promise.all([
            api("GET", "/admin/resumen"),
            api("GET", "/admin/usuarios")
        ]);

        pintarResumen(respuestas[0].resumen);

        pintarUsuarios(respuestas[1].usuarios);

        document.getElementById("adminActualizado").textContent =
            "Actualizado: " + new Date().toLocaleString("es-CO", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
            });

    } catch (error) {

        if (error.estado === 403) {
            window.location.replace("dashboard.html");
            return;
        }

        document.getElementById("adminActualizado").textContent = "⚠️ " + error.message;
    }
}


function pintarResumen(r) {

    document.getElementById("indUsuarios").textContent = r.usuarios;
    document.getElementById("indNuevos").textContent = r.nuevos_7_dias;
    document.getElementById("indMedicamentos").textContent = r.medicamentos_activos;
    document.getElementById("indCitas").textContent = r.citas.pendiente;


    /* Cumplimiento */

    document.getElementById("indCumplimiento").textContent = r.cumplimiento_7_dias + "%";

    document.getElementById("indTomas").textContent =
        r.tomas_7_dias + " toma" + (r.tomas_7_dias === 1 ? "" : "s") + " registrada" +
        (r.tomas_7_dias === 1 ? "" : "s");

    document.getElementById("barraCumplimientoRelleno").style.width = r.cumplimiento_7_dias + "%";

    document.getElementById("barraCumplimiento").setAttribute("aria-valuenow", r.cumplimiento_7_dias);


    /* Citas */

    document.getElementById("adminCitas").innerHTML =
        chip("⏳ Pendientes", r.citas.pendiente, "chip-atrasado") +
        chip("✅ Cumplidas", r.citas.cumplida, "chip-tomado") +
        chip("❌ Canceladas", r.citas.cancelada, "chip-no-tomado");


    /* Emociones */

    const emociones = r.emociones_30_dias;

    const maximo = Math.max(1, ...Object.values(emociones));

    // Orden fijo de la mejor a la peor emoción (el JSON llega ordenado alfabéticamente)
    const orden = ["Muy bien", "Bien", "Regular", "Mal", "Muy mal"];

    document.getElementById("adminEmociones").innerHTML = orden.map(function(nombre) {

        const valor = emociones[nombre] || 0;

        return (
            '<div class="admin-barra-fila">' +
                '<span class="admin-barra-etiqueta">' + (SP_EMOJIS[nombre] || "") + " " + escaparHTML(nombre) + "</span>" +
                '<div class="admin-barra-pista"><div style="width:' + Math.round(valor * 100 / maximo) + '%"></div></div>' +
                '<strong>' + valor + "</strong>" +
            "</div>"
        );

    }).join("");


    /* Bienestar */

    const b = r.registros_bienestar_7_dias;

    document.getElementById("adminBienestar").innerHTML =
        chip("🏃 Actividad", b.actividad, "") +
        chip("💧 Agua", b.agua, "") +
        chip("😴 Sueño", b.sueno, "");
}


function chip(texto, valor, clase) {

    return (
        '<span class="admin-chip ' + clase + '">' +
            escaparHTML(texto) + " <strong>" + valor + "</strong>" +
        "</span>"
    );
}


function pintarUsuarios(usuarios) {

    const contenedor = document.getElementById("adminUsuarios");

    if (usuarios.length === 0) {
        contenedor.innerHTML = '<p class="panel-vacio">No hay usuarios registrados.</p>';
        return;
    }

    contenedor.innerHTML = usuarios.map(function(u) {

        const creado = new Date(u.creado_en).toLocaleDateString("es-CO", {
            day: "numeric", month: "short", year: "numeric"
        });

        const ultima = u.ultima_toma
            ? describirDia(fechaISO(new Date(u.ultima_toma)))
            : "Sin registros";

        return (
            '<article class="admin-usuario">' +
                '<div class="admin-usuario-cabecera">' +
                    '<span class="admin-avatar">' + escaparHTML((u.nombre || "?").charAt(0)) + "</span>" +
                    "<div>" +
                        "<strong>" + escaparHTML(u.nombre) + "</strong>" +
                        "<span>" + escaparHTML(u.correo) + "</span>" +
                    "</div>" +
                    '<span class="admin-rol admin-rol-' + u.rol + '">' +
                        (u.rol === "admin" ? "Admin" : "Usuario") +
                    "</span>" +
                "</div>" +
                '<div class="admin-usuario-datos">' +
                    "<span>💊 " + u.medicamentos + "</span>" +
                    "<span>📅 " + u.citas + "</span>" +
                    "<span>🙂 " + u.registros_emocionales + "</span>" +
                    "<span>🕐 Última toma: " + escaparHTML(ultima) + "</span>" +
                    "<span>📆 Desde " + escaparHTML(creado) + "</span>" +
                "</div>" +
            "</article>"
        );

    }).join("");
}


document.addEventListener("DOMContentLoaded", cargarPanelAdmin);
