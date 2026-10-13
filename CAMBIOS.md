# Salud+ — Cambios en el Dashboard

## Correcciones
- Las tarjetas del dashboard no tenían estilo: el HTML usaba `dashboard-card` y el CSS `tarjeta-dashboard`. Se agregaron ambas clases (no se quitó ninguna).
- La campana mostraba "♧" (un trébol); ahora es un ícono de campana.
- "Tienes 2 recordatorios" estaba escrito a mano; ahora se calcula con las tomas pendientes y las citas de hoy.
- Los medicamentos de ejemplo no se guardaban, por eso el dashboard decía "sin medicamentos" mientras la pantalla de medicamentos mostraba tres. Ahora se guardan la primera vez.
- En emocional.html e historial.html, "Ajustes" mostraba "próximamente"; ahora abre ajustes.html.

## Funciones nuevas
- Fecha del día bajo el saludo.
- Contador rojo en la campana con los pendientes de hoy.
- Panel inferior de recordatorios: medicamentos del día con botones "Lo tomé / No lo tomé", tomas atrasadas, citas de hoy y (desde la campana) próximas citas.
- Tarjeta de medicamentos: tomas de hoy y próxima toma.
- Tarjeta de citas: "Hoy / Mañana / fecha" con hora en formato a. m./p. m. y médico.
- Si ya registraste tu estado emocional hoy, la tarjeta superior muestra tu carita.
- Sesión: el login la guarda, el dashboard la exige y "Cerrar sesión" la borra (los datos se conservan).
- El dashboard se actualiza cada minuto y al volver con "atrás".
- Accesibilidad: foco visible, tecla Escape cierra el panel, etiquetas para lectores de pantalla.

Archivos modificados: dashboard.html, js/app.js, css/estilos.css (solo se agregó al final), js/ajustes.js, js/emocional.js, js/historial.js.
