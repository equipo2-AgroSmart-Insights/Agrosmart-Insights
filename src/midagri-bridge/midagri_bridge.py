"""
AgroSmart MIDAGRI Bridge

Conserva los endpoints de boletines diarios y añade el Calendario Agrario.

Endpoints protegidos por X-Bridge-Token:
  GET /pdf?date=YYYY-MM-DD&mercado=GMML|MMF2
  GET /calendario?month=11
  GET /calendario-json?month=11

/calendario devuelve el PDF original.
/calendario-json devuelve los eventos ya separados por las 6 columnas reales del PDF.
"""

from datetime import date
from hmac import compare_digest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import json
import os
import re
import requests

from calendario_parser import parsear_calendario_pdf


HOST = "0.0.0.0"
PORT = 8080
BRIDGE_TOKEN = os.environ.get("BRIDGE_TOKEN", "").strip()


# ======================================================
# BOLETINES GMML / MMF2
# ======================================================

BASE_URLS = {
    "GMML": "https://siea.midagri.gob.pe/files/datos_estadisticas/diarias/mml",
    "MMF2": "https://siea.midagri.gob.pe/files/datos_estadisticas/diarias/mmf",
}

MESES_BOLETIN = {
    1: ["ene"],
    2: ["feb"],
    3: ["mar"],
    4: ["abr"],
    5: ["may"],
    6: ["jun"],
    7: ["jul"],
    8: ["ago"],
    9: ["sep", "set"],
    10: ["oct"],
    11: ["nov"],
    12: ["dic"],
}


# ======================================================
# CALENDARIO AGRARIO
# ======================================================

MESES_CALENDARIO = {
    1: "enero",
    2: "febrero",
    3: "marzo",
    4: "abril",
    5: "mayo",
    6: "junio",
    7: "julio",
    8: "agosto",
    9: "septiembre",
    10: "octubre",
    11: "noviembre",
    12: "diciembre",
}

MESES_CALENDARIO_INV = {
    nombre: numero
    for numero, nombre in MESES_CALENDARIO.items()
}

CALENDARIO_BASE = (
    "https://siea.midagri.gob.pe/images/eventos/calendario"
)


CABECERAS_MIDAGRI = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/154.0 Safari/537.36"
    ),
    "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
}


class ErrorMIDAGRI(Exception):
    """Fallo de conexión o respuesta no válida de la fuente MIDAGRI."""


# ======================================================
# UTILIDADES
# ======================================================


def validar_fecha(texto):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto or ""):
        raise ValueError("Formato incorrecto. Use YYYY-MM-DD")
    return date.fromisoformat(texto)


def resolver_mes_calendario(valor):
    if valor is None:
        raise ValueError("Debe enviar ?month=1..12 o el nombre del mes")

    texto = str(valor).strip().lower()

    if texto.isdigit():
        numero = int(texto)
        if numero not in MESES_CALENDARIO:
            raise ValueError("Mes fuera de rango")
        return numero, MESES_CALENDARIO[numero]

    texto = (
        texto.replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
    )

    normalizados = {
        nombre.replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u"): numero
        for nombre, numero in MESES_CALENDARIO_INV.items()
    }

    if texto not in normalizados:
        raise ValueError("Nombre de mes no reconocido")

    numero = normalizados[texto]
    return numero, MESES_CALENDARIO[numero]


# ======================================================
# BOLETINES DIARIOS
# ======================================================


def construir_urls(fecha, mercado="GMML"):
    if mercado not in BASE_URLS:
        raise ValueError("Mercado no soportado")

    anio, mes, dia = fecha.year, fecha.month, fecha.day
    base = BASE_URLS[mercado]

    for abreviatura in MESES_BOLETIN[mes]:
        sufijo = f"{dia:02d}{abreviatura}{anio % 100:02d}.pdf"
        if mercado == "MMF2":
            filename = f"sisap-ingreso-mm2-{sufijo}"
        else:
            filename = f"sisap-ingreso-gmml-{sufijo}"
        url = f"{base}/{anio}/{mes:02d}/{filename}"
        yield url, filename


def buscar_pdf(fecha, mercado="GMML"):
    errores = []

    for url, filename in construir_urls(fecha, mercado):
        print(f"[{mercado}] Probando: {url}", flush=True)

        try:
            response = requests.get(
                url,
                headers=CABECERAS_MIDAGRI,
                timeout=(10, 30),
                allow_redirects=True,
            )
        except requests.RequestException as e:
            errores.append(f"Error de conexión: {type(e).__name__}")
            continue

        if response.status_code == 404:
            continue

        if response.status_code != 200:
            errores.append(f"MIDAGRI devolvió HTTP {response.status_code}")
            continue

        contenido = response.content

        if not contenido.startswith(b"%PDF"):
            errores.append("Respuesta 200 sin contenido PDF válido")
            continue

        return contenido, filename, url

    if errores:
        raise ErrorMIDAGRI("; ".join(errores))

    return None


# ======================================================
# CALENDARIO
# ======================================================


def descargar_calendario(mes_numero, mes_nombre):
    url = f"{CALENDARIO_BASE}/{mes_nombre}/calendario.pdf"
    filename = f"calendario-midagri-{mes_nombre}.pdf"

    print(f"[CALENDARIO] Descargando: {url}", flush=True)

    try:
        response = requests.get(
            url,
            headers=CABECERAS_MIDAGRI,
            timeout=(10, 60),
            allow_redirects=True,
        )
    except requests.RequestException as e:
        raise ErrorMIDAGRI(
            f"Error descargando calendario: {type(e).__name__}"
        ) from e

    if response.status_code == 404:
        return None

    if response.status_code != 200:
        raise ErrorMIDAGRI(
            f"MIDAGRI devolvió HTTP {response.status_code} para calendario"
        )

    contenido = response.content

    if not contenido.startswith(b"%PDF"):
        raise ErrorMIDAGRI(
            "MIDAGRI respondió 200 pero el calendario no es un PDF válido"
        )

    return contenido, filename, url


# ======================================================
# HTTP HANDLER
# ======================================================


class Handler(BaseHTTPRequestHandler):
    def enviar_json(self, codigo, datos):
        cuerpo = json.dumps(
            datos,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")

        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

        try:
            self.wfile.write(cuerpo)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def autorizado(self):
        token_recibido = self.headers.get("X-Bridge-Token", "")
        return bool(
            BRIDGE_TOKEN
            and compare_digest(token_recibido, BRIDGE_TOKEN)
        )

    def exigir_token(self):
        if self.autorizado():
            return True

        self.enviar_json(
            401,
            {
                "ok": False,
                "tipo": "NO_AUTORIZADO",
                "mensaje": "Token invalido",
            },
        )
        return False

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path in ("/", "/health"):
            self.enviar_json(
                200,
                {
                    "ok": True,
                    "servicio": "AgroSmart MIDAGRI Bridge",
                    "estado": "activo",
                    "endpoints": [
                        "/pdf",
                        "/calendario",
                        "/calendario-json",
                    ],
                },
            )
            return

        if parsed.path not in (
            "/pdf",
            "/calendario",
            "/calendario-json",
        ):
            self.enviar_json(
                404,
                {
                    "ok": False,
                    "tipo": "RUTA_NO_EXISTE",
                    "mensaje": (
                        "Use /pdf, /calendario o /calendario-json"
                    ),
                },
            )
            return

        if not self.exigir_token():
            return

        params = parse_qs(parsed.query)

        # --------------------------------------------------
        # /pdf
        # --------------------------------------------------
        if parsed.path == "/pdf":
            fecha_texto = params.get("date", [None])[0]
            mercado = (
                params.get("mercado", ["GMML"])[0] or ""
            ).strip().upper()

            if mercado not in BASE_URLS:
                self.enviar_json(
                    400,
                    {
                        "ok": False,
                        "tipo": "MERCADO_INVALIDO",
                        "mensaje": "Mercado soportado: GMML o MMF2",
                    },
                )
                return

            if not fecha_texto:
                self.enviar_json(
                    400,
                    {
                        "ok": False,
                        "tipo": "FECHA_FALTANTE",
                        "mensaje": "Debe enviar ?date=YYYY-MM-DD",
                    },
                )
                return

            try:
                fecha = validar_fecha(fecha_texto)
            except ValueError:
                self.enviar_json(
                    400,
                    {
                        "ok": False,
                        "tipo": "FECHA_INVALIDA",
                        "fecha": fecha_texto,
                        "mensaje": "Use una fecha real con formato YYYY-MM-DD",
                    },
                )
                return

            try:
                resultado = buscar_pdf(fecha, mercado)
            except ErrorMIDAGRI as e:
                self.enviar_json(
                    502,
                    {
                        "ok": False,
                        "tipo": "ERROR_FUENTE_MIDAGRI",
                        "mensaje": str(e),
                    },
                )
                return

            if resultado is None:
                self.enviar_json(
                    404,
                    {
                        "ok": False,
                        "tipo": "BOLETIN_NO_DISPONIBLE",
                        "fecha": fecha_texto,
                        "mercado": mercado,
                    },
                )
                return

            contenido, filename, url_origen = resultado
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header(
                "Content-Disposition",
                f'attachment; filename="{filename}"',
            )
            self.send_header("X-MIDAGRI-Source", url_origen)
            self.send_header("Content-Length", str(len(contenido)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

            try:
                self.wfile.write(contenido)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        # --------------------------------------------------
        # /calendario y /calendario-json
        # --------------------------------------------------
        month = params.get("month", [None])[0]

        try:
            mes_numero, mes_nombre = resolver_mes_calendario(month)
        except ValueError as e:
            self.enviar_json(
                400,
                {
                    "ok": False,
                    "tipo": "MES_INVALIDO",
                    "mensaje": str(e),
                },
            )
            return

        try:
            resultado = descargar_calendario(
                mes_numero,
                mes_nombre,
            )
        except ErrorMIDAGRI as e:
            self.enviar_json(
                502,
                {
                    "ok": False,
                    "tipo": "ERROR_FUENTE_MIDAGRI",
                    "mensaje": str(e),
                },
            )
            return

        if resultado is None:
            self.enviar_json(
                404,
                {
                    "ok": False,
                    "tipo": "CALENDARIO_NO_DISPONIBLE",
                    "mes": mes_nombre,
                },
            )
            return

        contenido, filename, url_origen = resultado

        if parsed.path == "/calendario":
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header(
                "Content-Disposition",
                f'attachment; filename="{filename}"',
            )
            self.send_header("X-MIDAGRI-Source", url_origen)
            self.send_header("Content-Length", str(len(contenido)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

            try:
                self.wfile.write(contenido)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        # JSON estructurado por columnas.
        try:
            datos = parsear_calendario_pdf(
                contenido_pdf=contenido,
                fuente_archivo=filename,
                mes_solicitado=mes_numero,
            )
        except Exception as e:
            print(
                f"[CALENDARIO] Error parseando PDF: {e}",
                flush=True,
            )
            self.enviar_json(
                500,
                {
                    "ok": False,
                    "tipo": "ERROR_PARSE_CALENDARIO",
                    "mensaje": str(e),
                },
            )
            return

        datos["mes_solicitado"] = mes_numero
        datos["mes_solicitado_nombre"] = mes_nombre
        datos["url_origen"] = url_origen

        self.enviar_json(200, datos)


if __name__ == "__main__":
    if not BRIDGE_TOKEN:
        raise SystemExit(
            "Configure BRIDGE_TOKEN antes de iniciar.\n"
            '$env:BRIDGE_TOKEN="SU_TOKEN_NUEVO"'
        )

    servidor = ThreadingHTTPServer((HOST, PORT), Handler)

    print("\n======================================")
    print(" AgroSmart MIDAGRI Bridge")
    print("======================================")
    print(f"http://localhost:{PORT}")
    print(
        f"Calendario JSON: http://localhost:{PORT}/calendario-json?month=11"
    )
    print("\nEsperando solicitudes...\n")

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nBridge detenido.")
    finally:
        servidor.server_close()
