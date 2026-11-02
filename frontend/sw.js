/* =========================================
   SALUD+ - SERVICE WORKER
   Recibe las notificaciones push (llamadas, recordatorios y
   alertas) y abre la pantalla correcta al tocarlas.

   Compatibilidad con Android (Chrome):
   · Íconos en PNG: Android no muestra SVG en las notificaciones.
   · "badge" monocromático: el ícono pequeño de la barra de estado.
   · pushsubscriptionchange: Android renueva la suscripción de vez
     en cuando; aquí se vuelve a registrar en el servidor.
========================================= */

const ICONO = "/img/icono-192.png";
const BADGE = "/img/badge-96.png";


self.addEventListener("install", function() {
    self.skipWaiting();
});


self.addEventListener("activate", function(event) {
    event.waitUntil(self.clients.claim());
});


/* Llega una notificación push del servidor */

self.addEventListener("push", function(event) {

    let datos = {};

    try {
        datos = event.data ? event.data.json() : {};
    } catch (error) {
        datos = { titulo: "Salud+", cuerpo: event.data ? event.data.text() : "" };
    }

    const esLlamada = (datos.url || "").indexOf("/llamada/") === 0;

    const opciones = {
        body: datos.cuerpo || "",
        icon: ICONO,
        badge: BADGE,
        tag: datos.etiqueta || undefined,
        renotify: !!datos.etiqueta,
        requireInteraction: esLlamada || !!datos.urgente,     // la llamada no desaparece sola
        vibrate: esLlamada ? [500, 250, 500, 250, 500, 250, 500] : [200, 100, 200],
        timestamp: Date.now(),
        data: { url: datos.url || "/" },
        actions: esLlamada
            ? [{ action: "contestar", title: "📞 Contestar" }, { action: "ignorar", title: "Ahora no" }]
            : []
    };

    event.waitUntil(self.registration.showNotification(datos.titulo || "Salud+", opciones));
});


/* Se toca la notificación: abrir (o enfocar) la app en esa pantalla */

self.addEventListener("notificationclick", function(event) {

    event.notification.close();

    if (event.action === "ignorar") return;

    const url = new URL(
        (event.notification.data && event.notification.data.url) || "/",
        self.location.origin
    ).href;

    event.waitUntil(abrirEnLaApp(url));
});


async function abrirEnLaApp(url) {

    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

    for (const ventana of ventanas) {

        if (ventana.url.indexOf(self.location.origin) !== 0) continue;

        try {
            // navigate() solo funciona en ventanas controladas por este service worker
            const navegada = await ventana.navigate(url);
            return (navegada || ventana).focus();
        } catch (error) {
            // Ventana no controlada: se abre una nueva (abajo)
        }
    }

    return self.clients.openWindow(url);
}


/* Android renovó la suscripción: registrar la nueva en el servidor */

self.addEventListener("pushsubscriptionchange", function(event) {

    event.waitUntil((async function() {

        try {

            const respuesta = await fetch("/api/push/clave", { credentials: "same-origin" });

            const clave = await respuesta.json();

            if (!clave.disponible) return;

            const nueva = await self.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: base64UrlABytes(clave.clave)
            });

            await fetch("/api/push/suscribir", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nueva.toJSON())
            });

        } catch (error) {
            // Se reintentará la próxima vez que se abra la app
        }
    })());
});


function base64UrlABytes(base64) {

    const relleno = "=".repeat((4 - (base64.length % 4)) % 4);

    const binario = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));

    return Uint8Array.from(binario, function(c) { return c.charCodeAt(0); });
}
