"""
SALUD+ · Punto de entrada

Ejecutar:
    python app.py

Luego abre en el navegador:
    http://localhost:5000
"""

from backend import crear_app

app = crear_app()


if __name__ == "__main__":
    # host="0.0.0.0" permite abrir la app desde el celular
    # conectado a la misma red Wi-Fi: http://IP-DEL-PC:5000
    app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
