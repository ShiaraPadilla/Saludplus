document.addEventListener(
    "DOMContentLoaded",
    function () {

        cargarNombre();
        cargarMedicamentos();
        cargarCitas();
        cargarEmocional();
        cargarBienestar();

    }
);


/* ================================
   NOMBRE DEL USUARIO
================================ */

function cargarNombre() {

    const nombre =
        localStorage.getItem(
            "nombreUsuario"
        );

    const elemento =
        document.getElementById(
            "nombreInforme"
        );

    if (nombre) {

        elemento.textContent =
            nombre;

    } else {

        elemento.textContent =
            "Usuario";

    }
}


/* ================================
   MEDICAMENTOS
================================ */

function cargarMedicamentos() {

    const medicamentos =
        JSON.parse(
            localStorage.getItem(
                "medicamentos"
            )
        ) || [];


    const seguimiento =
        JSON.parse(
            localStorage.getItem(
                "seguimientoMedicamentos"
            )
        ) || [];


    const resultado =
        document.getElementById(
            "resumenMedicamentos"
        );


    if (medicamentos.length === 0) {

        resultado.innerHTML = `
            <p>
                No tienes medicamentos
                registrados.
            </p>
        `;

        return;

    }


    let tomados = 0;


    seguimiento.forEach(
        function (registro) {

            if (
                registro.estado ===
                "tomado"
            ) {

                tomados++;

            }

        }
    );


    let porcentaje = 0;


    if (seguimiento.length > 0) {

        porcentaje =
            Math.round(
                (tomados /
                    seguimiento.length) *
                100
            );

    }


    let html = `
        <div class="dato-informe">

            <span>
                Medicamentos registrados
            </span>

            <strong>
                ${medicamentos.length}
            </strong>

        </div>


        <div class="dato-informe">

            <span>
                Cumplimiento
            </span>

            <strong>
                ${porcentaje}%
            </strong>

        </div>
    `;


    medicamentos.forEach(
        function (medicamento) {

            html += `

                <div
                    class="item-informe">

                    💊

                    <strong>
                        ${medicamento.nombre}
                    </strong>

                    <span>
                        ${medicamento.dosis}
                    </span>

                </div>

            `;

        }
    );


    resultado.innerHTML =
        html;

}


/* ================================
   CITAS MÉDICAS
================================ */

function cargarCitas() {

    const resultado = document.getElementById("resumenCitas");

    const citas = obtenerCitasConIndice().sort(function(a, b) {
        return (b.fecha + b.hora).localeCompare(a.fecha + a.hora);
    });

    if (citas.length === 0) {

        resultado.innerHTML = "<p>No tienes citas médicas registradas.</p>";

        return;
    }

    const resumen = resumenCitas();

    const estados = {
        pendiente: "⏳ Pendiente",
        cumplida: "✅ Cumplida",
        cancelada: "❌ Cancelada"
    };

    let html = `
        <div class="dato-informe">
            <span>Citas registradas</span>
            <strong>${resumen.total}</strong>
        </div>
        <div class="dato-informe">
            <span>Cumplidas</span>
            <strong>${resumen.cumplidas}/${resumen.validas}</strong>
        </div>
        <div class="dato-informe">
            <span>Pendientes</span>
            <strong>${resumen.pendientes}</strong>
        </div>
    `;

    citas.forEach(function(cita) {

        html += `
            <div class="item-informe">
                📅
                <strong>${escaparHTML(cita.medico)}</strong>
                <span>
                    ${escaparHTML(cita.especialidad)}
                    <br>
                    ${escaparHTML(formatoFechaLarga(cita.fecha))} - ${escaparHTML(formatoHora12(cita.hora))}
                    <br>
                    ${estados[cita.estado] || ""}
                </span>
            </div>
        `;
    });

    resultado.innerHTML = html;
}


/* ================================
   ESTADO EMOCIONAL
================================ */

function cargarEmocional() {

    const registros =
        JSON.parse(
            localStorage.getItem(
                "registrosEmocionales"
            )
        ) || [];


    const resultado =
        document.getElementById(
            "resumenEmocional"
        );


    if (registros.length === 0) {

        resultado.innerHTML = `
            <p>
                No tienes registros
                emocionales.
            </p>
        `;

        return;

    }


    const ultimo =
        registros[
            registros.length - 1
        ];


    resultado.innerHTML = `

        <div class="dato-informe">

            <span>
                Último estado
            </span>

            <strong>
                ${ultimo.emocion}
            </strong>

        </div>


        <div class="dato-informe">

            <span>
                Fecha
            </span>

            <strong>
                ${ultimo.fecha}
            </strong>

        </div>


        <div class="dato-informe">

            <span>
                Registros realizados
            </span>

            <strong>
                ${registros.length}
            </strong>

        </div>

    `;

}


/* ================================
   BIENESTAR
================================ */

function cargarBienestar() {

    const resultado = document.getElementById("resumenBienestar");

    const agua = obtenerAguaDeHoy();

    const actividad = actividadUltimos7Dias();

    const minutos = actividad.reduce(function(total, r) {
        return total + (Number(r.minutos) || 0);
    }, 0);

    const sueno = promedioSueno();

    resultado.innerHTML = `
        <div class="dato-informe">
            <span>💧 Agua consumida hoy</span>
            <strong>${agua}/8 vasos</strong>
        </div>
        <div class="dato-informe">
            <span>🏃 Actividad física (7 días)</span>
            <strong>${actividad.length}/7 días</strong>
        </div>
        <div class="dato-informe">
            <span>⏱️ Minutos de actividad (7 días)</span>
            <strong>${minutos} min</strong>
        </div>
        <div class="dato-informe">
            <span>😴 Sueño promedio (7 días)</span>
            <strong>${sueno === null ? "Sin registro" : sueno + " h"}</strong>
        </div>
    `;
}


/* ================================
   IMPRIMIR
================================ */

function imprimirInforme() {

    window.print();

}


/* ================================
   EXPORTAR CSV
================================ */

function exportarCSV() {

    const nombre =
        localStorage.getItem(
            "nombreUsuario"
        ) || "Usuario";


    const medicamentos =
        JSON.parse(
            localStorage.getItem(
                "medicamentos"
            )
        ) || [];


    const seguimiento =
        JSON.parse(
            localStorage.getItem(
                "seguimientoMedicamentos"
            )
        ) || [];


    let csv =
        "INFORME DE SALUD SALUD+\\n\\n";


    csv +=
        "Usuario," +
        nombre +
        "\\n\\n";


    csv +=
        "MEDICAMENTOS\\n";


    csv +=
        "Medicamento,Dosis,Estado,Fecha,Hora\\n";


    seguimiento.forEach(
        function (registro) {

            csv +=
                registro.medicamento +
                "," +
                registro.dosis +
                "," +
                registro.estado +
                "," +
                registro.fecha +
                "," +
                registro.horaRegistro +
                "\\n";

        }
    );


    csv +=
        "\\nCITAS MEDICAS\\n";


    const citas =
        JSON.parse(
            localStorage.getItem(
                "citasMedicas"
            )
        ) || [];


    csv +=
        "Medico,Especialidad,Fecha,Hora,Lugar\\n";


    citas.forEach(
        function (cita) {

            csv +=
                cita.medico +
                "," +
                cita.especialidad +
                "," +
                cita.fecha +
                "," +
                cita.hora +
                "," +
                cita.lugar +
                "\\n";

        }
    );


    csv +=
        "\\nESTADO EMOCIONAL\\n";


    csv +=
        "Emocion,Fecha,Hora,Comentario\\n";


    const emociones =
        JSON.parse(
            localStorage.getItem(
                "registrosEmocionales"
            )
        ) || [];


    emociones.forEach(
        function (registro) {

            csv +=
                registro.emocion +
                "," +
                registro.fecha +
                "," +
                registro.hora +
                "," +
                registro.comentario +
                "\\n";

        }
    );


    const archivo =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const enlace =
        document.createElement(
            "a"
        );


    enlace.href =
        URL.createObjectURL(
            archivo
        );


    enlace.download =
        "informe_salud_saludplus.csv";


    enlace.click();


    URL.revokeObjectURL(
        enlace.href
    );

}


/* ================================
   NAVEGACIÓN
================================ */

function volverDashboard__original() {

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

/* ================================
   EXPORTAR EXCEL
================================ */

function exportarExcel() {

    const nombre =
        localStorage.getItem(
            "nombreUsuario"
        ) || "Usuario";


    const medicamentos =
        JSON.parse(
            localStorage.getItem(
                "medicamentos"
            )
        ) || [];


    const seguimiento =
        JSON.parse(
            localStorage.getItem(
                "seguimientoMedicamentos"
            )
        ) || [];


    const citas =
        JSON.parse(
            localStorage.getItem(
                "citasMedicas"
            )
        ) || [];


    const emociones =
        JSON.parse(
            localStorage.getItem(
                "registrosEmocionales"
            )
        ) || [];


    const agua =
        obtenerAguaDeHoy() + "/8 vasos (hoy)";


    const actividad =
        actividadUltimos7Dias().length + "/7 días";


    const sueño =
        promedioSueno() === null ? "Sin registro" : promedioSueno() + " h promedio";


    let html = `

        <html>

        <head>

            <meta charset="UTF-8">

        </head>

        <body>

            <h1>Informe de salud - Salud+</h1>

            <h2>Información personal</h2>

            <table border="1">

                <tr>
                    <th>Nombre</th>
                    <td>${nombre}</td>
                </tr>

            </table>


            <h2>Medicamentos</h2>

            <table border="1">

                <tr>
                    <th>Medicamento</th>
                    <th>Dosis</th>
                    <th>Cantidad</th>
                    <th>Hora</th>
                </tr>
    `;


    medicamentos.forEach(
        function (medicamento) {

            html += `

                <tr>

                    <td>
                        ${medicamento.nombre}
                    </td>

                    <td>
                        ${medicamento.dosis}
                    </td>

                    <td>
                        ${medicamento.cantidad}
                    </td>

                    <td>
                        ${medicamento.hora}
                    </td>

                </tr>

            `;

        }
    );


    html += `

            </table>


            <h2>Seguimiento de medicamentos</h2>

            <table border="1">

                <tr>
                    <th>Medicamento</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                </tr>

    `;


    seguimiento.forEach(
        function (registro) {

            html += `

                <tr>

                    <td>
                        ${registro.medicamento}
                    </td>

                    <td>
                        ${registro.estado}
                    </td>

                    <td>
                        ${registro.fecha}
                    </td>

                    <td>
                        ${registro.horaRegistro}
                    </td>

                </tr>

            `;

        }
    );


    html += `

            </table>


            <h2>Citas médicas</h2>

            <table border="1">

                <tr>
                    <th>Médico</th>
                    <th>Especialidad</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Lugar</th>
                </tr>

    `;


    citas.forEach(
        function (cita) {

            html += `

                <tr>

                    <td>
                        ${cita.medico}
                    </td>

                    <td>
                        ${cita.especialidad}
                    </td>

                    <td>
                        ${cita.fecha}
                    </td>

                    <td>
                        ${cita.hora}
                    </td>

                    <td>
                        ${cita.lugar}
                    </td>

                </tr>

            `;

        }
    );


    html += `

            </table>


            <h2>Estado emocional</h2>

            <table border="1">

                <tr>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Comentario</th>
                </tr>

    `;


    emociones.forEach(
        function (registro) {

            html += `

                <tr>

                    <td>
                        ${registro.emocion}
                    </td>

                    <td>
                        ${registro.fecha}
                    </td>

                    <td>
                        ${registro.hora}
                    </td>

                    <td>
                        ${registro.comentario}
                    </td>

                </tr>

            `;

        }
    );


    html += `

            </table>


            <h2>Bienestar</h2>

            <table border="1">

                <tr>
                    <th>Indicador</th>
                    <th>Valor</th>
                </tr>

                <tr>
                    <td>Agua consumida</td>
                    <td>${agua}</td>
                </tr>

                <tr>
                    <td>Actividad física</td>
                    <td>${actividad}</td>
                </tr>

                <tr>
                    <td>Horas de sueño</td>
                    <td>${sueño}</td>
                </tr>

            </table>

        </body>

        </html>

    `;


    const archivo =
        new Blob(
            [html],
            {
                type:
                    "application/vnd.ms-excel"
            }
        );


    const enlace =
        document.createElement(
            "a"
        );


    enlace.href =
        URL.createObjectURL(
            archivo
        );


    enlace.download =
        "informe_salud_saludplus.xls";


    enlace.click();


    URL.revokeObjectURL(
        enlace.href
    );

}

/* ================================
   NAVEGACIÓN (← vuelve a la pantalla anterior)
================================ */

function volverDashboard() {
    volverAtras();
}


/* Actualizar si cambian los datos */

document.addEventListener("saludplus:datos", function () {
    cargarNombre();
    cargarMedicamentos();
    cargarCitas();
    cargarEmocional();
    cargarBienestar();
});
