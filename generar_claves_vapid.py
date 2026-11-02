"""
Genera las claves VAPID para las notificaciones push (se hace UNA vez).

Uso:
    python generar_claves_vapid.py

Copia las dos líneas que imprime en las variables de entorno de Render
(y en tu .env para probar en local). No subas la clave privada a GitHub.
"""

import base64

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid


def b64(datos):
    return base64.urlsafe_b64encode(datos).rstrip(b"=").decode()


def main():

    vapid = Vapid()
    vapid.generate_keys()

    privada = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")

    publica = vapid.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )

    print("VAPID_PUBLIC_KEY=" + b64(publica))
    print("VAPID_PRIVATE_KEY=" + b64(privada))


if __name__ == "__main__":
    main()
