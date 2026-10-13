// ========================================
// AJUSTES - SALUD+
// ========================================


// VOLVER AL DASHBOARD
function volverDashboard() {
    window.location.href = "dashboard.html";
}


// IR AL INICIO
function irAInicio() {
    window.location.href = "dashboard.html";
}


// IR AL HISTORIAL
function irAHistorial() {
    window.location.href = "historial.html";
}


// MANTENER EN AJUSTES
function irAAjustes() {
    window.location.href = "ajustes.html";
}


// MI PERFIL
function abrirPerfil() {

    const nombre = localStorage.getItem("nombreUsuario");

    if (nombre) {

        alert(
            "👤 Mi información\n\n" +
            "Nombre: " + nombre
        );

    } else {

        alert(
            "No encontramos información del usuario."
        );

    }
}


// RECORDATORIOS
function abrirRecordatorios() {

    alert(
        "🔔 Recordatorios\n\n" +
        "Aquí podrás configurar los recordatorios de:\n\n" +
        "💊 Medicamentos\n" +
        "📅 Citas médicas\n\n" +
        "Esta función se implementará próximamente."
    );

}


// SEGUIMIENTO DE MEDICAMENTOS
function abrirSeguimientoMedicamentos() {

    window.location.href = "medicamentos.html";

}


// INFORMES
function abrirInformes() {

    window.location.href = "informes.html";

}


// CERRAR SESIÓN
function cerrarSesion() {

    const confirmar = confirm(
        "¿Estás seguro de que quieres cerrar sesión?"
    );

    if (!confirmar) {
        return;
    }

    window.location.href = "login.html";

}


// EJECUTAR AL CARGAR
document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log("Ajustes de Salud+ cargados correctamente.");

    }
);