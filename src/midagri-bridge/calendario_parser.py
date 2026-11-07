from __future__ import annotations

import hashlib
import io
import re
import unicodedata
from datetime import date
from typing import Any

import pdfplumber


MESES = {
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

DEPARTAMENTOS = [
    "A nivel nacional",
    "Amazonas",
    "Áncash",
    "Apurímac",
    "Arequipa",
    "Ayacucho",
    "Cajamarca",
    "Cusco",
    "Huancavelica",
    "Huánuco",
    "Ica",
    "Junín",
    "La Libertad",
    "Lambayeque",
    "Lima",
    "Loreto",
    "Madre de Dios",
    "Moquegua",
    "Pasco",
    "Piura",
    "Puno",
    "San Martín",
    "Tacna",
    "Tumbes",
    "Ucayali",
]


def _sin_tildes(texto: str) -> str:
    return "".join(
        c
        for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )


def _normalizar_clave(texto: Any) -> str:
    texto = _limpiar_espacios(texto)
    return _sin_tildes(texto).lower().strip()


def _limpiar_espacios(valor: Any) -> str:
    if valor is None:
        return ""

    return re.sub(
        r"[ \t\r\f\v]+",
        " ",
        str(valor).replace("\u00a0", " ")
    ).strip()


DEP_MAP = {
    _normalizar_clave(x):
        ("Nacional" if x == "A nivel nacional" else x)
    for x in DEPARTAMENTOS
}


def _unir_lineas_celda(
    valor: Any,
    reparar_palabras: bool = False
) -> str:

    """
    Une saltos de línea de una celda sin cambiar de columna.

    Corrige solo cortes introducidos por el ajuste de texto del PDF:
    - palabras partidas
    - URL partidas
    - correos partidos
    """

    if valor is None:
        return ""

    lineas = [
        re.sub(
            r"[ \t]+",
            " ",
            linea.replace("\u00a0", " ")
        ).strip()

        for linea in
        str(valor)
        .replace("\r", "\n")
        .split("\n")

        if linea.strip()
    ]

    if not lineas:
        return ""

    salida = lineas[0]

    for siguiente in lineas[1:]:

        anterior = salida.rstrip()
        sig = siguiente.lstrip()

        # URL o correo cortado al final.
        if re.search(
            r"(?:https?://\S+|\S+@\S+)[-_/]$",
            anterior,
            re.I
        ):
            salida = anterior + sig
            continue

        # Correo partido antes del @.
        if (
            re.search(
                r"[A-Za-z0-9._%+-]+-$",
                anterior
            )
            and
            re.match(
                r"^[A-Za-z0-9._%+-]+@",
                sig
            )
        ):
            salida = anterior + sig
            continue

        # Dominio partido.
        if (
            re.search(
                r"@[^\s]+\.[A-Za-z]{2,}$",
                anterior
            )
            and
            re.match(
                r"^\.[A-Za-z]{2,}\b",
                sig
            )
        ):
            salida = anterior + sig
            continue

        # URL con fragmento corto en otra línea.
        if (
            re.search(
                r"https?://\S+$",
                anterior,
                re.I
            )
            and
            re.fullmatch(
                r"[A-Za-z0-9_-]{1,12}",
                sig
            )
        ):
            salida = anterior + sig
            continue

        # Reparar palabras cortadas dentro de Distrito/Provincia.
        if reparar_palabras:

            ultimo = re.search(
                r"([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{5,})$",
                anterior
            )

            primero = re.match(
                r"^([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{1,3})(?:\b|$)",
                sig
            )

            if ultimo and primero:

                frag = primero.group(1)

                salida = (
                    anterior
                    + frag
                    + sig[len(frag):]
                )

                continue

        salida = anterior + " " + sig

    return re.sub(
        r"\s+",
        " ",
        salida
    ).strip()


def _fecha_iso(
    anio: int,
    mes: int,
    dia: int
) -> str | None:

    try:
        return date(
            int(anio),
            int(mes),
            int(dia)
        ).isoformat()

    except (
        ValueError,
        TypeError
    ):
        return None


def _anio_4(valor: str) -> int:

    n = int(valor)

    if n < 100:
        n += 2000

    return n


def _parsear_fecha_expresion(
    texto: str
) -> tuple[
    dict[str, Any] | None,
    int,
    list[str]
]:

    """
    Devuelve:
    (
        info_fecha,
        caracteres_consumidos,
        observaciones
    )

    info_fecha:
    {
        tipo: simple | multiples | rango,
        fechas: [(inicio, fin), ...]
    }
    """

    original = re.sub(
        r"\s+",
        " ",
        texto or ""
    ).strip()

    s = original

    observaciones: list[str] = []

    # ==========================================================
    # 1. RANGO COMPLETO
    # 30/11/2026 - 04/12/2026
    # ==========================================================

    m = re.match(
        r"^(\d{1,2})[/.](\d{1,2})[/.](\d{2,5})\s*[-–—]\s*"
        r"(\d{1,2})[/.](\d{1,2})[/.](\d{2,5})\s*;?",
        s,
        re.I,
    )

    if m:

        y1_txt = m.group(3)
        y2_txt = m.group(6)

        y2 = (
            _anio_4(y2_txt)
            if len(y2_txt) <= 4
            else None
        )

        y1 = (
            _anio_4(y1_txt)
            if len(y1_txt) <= 4
            else None
        )

        # Error real del PDF:
        # 30/11/20206 - 04/12/2026

        if (
            y1 is None
            and y2 is not None
            and len(y1_txt) == 5
        ):

            y1 = y2

            observaciones.append(
                f"Año inicial corregido de "
                f"'{y1_txt}' a '{y1}' "
                "por consistencia con el año final del rango."
            )

        ini = (
            _fecha_iso(
                y1,
                int(m.group(2)),
                int(m.group(1))
            )
            if y1
            else None
        )

        fin = (
            _fecha_iso(
                y2,
                int(m.group(5)),
                int(m.group(4))
            )
            if y2
            else None
        )

        if ini and fin:

            return (
                {
                    "tipo": "rango",
                    "fechas": [
                        (
                            ini,
                            fin
                        )
                    ],
                },
                m.end(),
                observaciones,
            )

    # ==========================================================
    # 2. RANGO MISMO MES
    #
    # 5 al 7/11/2026
    # 24-25/11/2026
    # 09 - 13/11/2026
    # ==========================================================

    m = re.match(
        r"^(\d{1,2})\s*(?:al|a|[-–—])\s*"
        r"(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\s*;?",
        s,
        re.I,
    )

    if m:

        y = _anio_4(
            m.group(4)
        )

        ini = _fecha_iso(
            y,
            int(m.group(3)),
            int(m.group(1))
        )

        fin = _fecha_iso(
            y,
            int(m.group(3)),
            int(m.group(2))
        )

        if ini and fin:

            return (
                {
                    "tipo": "rango",
                    "fechas": [
                        (
                            ini,
                            fin
                        )
                    ],
                },
                m.end(),
                observaciones,
            )

    # ==========================================================
    # 3. FECHAS MÚLTIPLES
    #
    # 06 y 09/11/2026
    # 11, 18 y 25/11/2026
    # ==========================================================

    m = re.match(
        r"^([0-9\s,]+(?:\s+y\s+\d{1,2})?)"
        r"[/.](\d{1,2})[/.](\d{2,4})\b",
        s,
        re.I,
    )

    if m:

        dias = [
            int(x)
            for x in
            re.findall(
                r"\d{1,2}",
                m.group(1)
            )
        ]

        y = _anio_4(
            m.group(3)
        )

        fechas = []

        for d in dias:

            iso = _fecha_iso(
                y,
                int(m.group(2)),
                d
            )

            if iso:
                fechas.append(
                    (
                        iso,
                        iso
                    )
                )

        fechas = list(
            dict.fromkeys(
                fechas
            )
        )

        if len(fechas) >= 2:

            return (
                {
                    "tipo": "multiples",
                    "fechas": fechas,
                },
                m.end(),
                observaciones,
            )

    # ==========================================================
    # 4. FECHA SIMPLE
    # ==========================================================

    m = re.match(
        r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b",
        s
    )

    if m:

        y = _anio_4(
            m.group(3)
        )

        iso = _fecha_iso(
            y,
            int(m.group(2)),
            int(m.group(1))
        )

        if iso:

            return (
                {
                    "tipo": "simple",
                    "fechas": [
                        (
                            iso,
                            iso
                        )
                    ],
                },
                m.end(),
                observaciones,
            )

    # ==========================================================
    # 5. ERROR: FALTA "/" ENTRE MES Y AÑO
    #
    # 10/112026
    # 20/112026
    # ==========================================================

    m = re.match(
        r"^(\d{1,2})/(0[1-9]|1[0-2])(20\d{2})\b",
        s
    )

    if m:

        iso = _fecha_iso(
            int(m.group(3)),
            int(m.group(2)),
            int(m.group(1))
        )

        if iso:

            observaciones.append(
                f"Fecha corregida por separador faltante: "
                f"'{m.group(0)}' -> "
                f"'{m.group(1)}/{m.group(2)}/{m.group(3)}'."
            )

            return (
                {
                    "tipo": "simple",
                    "fechas": [
                        (
                            iso,
                            iso
                        )
                    ],
                },
                m.end(),
                observaciones,
            )

    # ==========================================================
    # 6. ERROR: DÍGITO EXTRA ENTRE MES Y AÑO
    #
    # 11/1172026 → 11/11/2026
    # ==========================================================

    m = re.match(
        r"^(\d{1,2})/(0[1-9]|1[0-2])\d(20\d{2})\b",
        s
    )

    if m:

        iso = _fecha_iso(
            int(m.group(3)),
            int(m.group(2)),
            int(m.group(1))
        )

        if iso:

            observaciones.append(
                f"Fecha corregida por dígito extra: "
                f"'{m.group(0)}' -> "
                f"'{m.group(1)}/{m.group(2)}/{m.group(3)}'."
            )

            return (
                {
                    "tipo": "simple",
                    "fechas": [
                        (
                            iso,
                            iso
                        )
                    ],
                },
                m.end(),
                observaciones,
            )

    return (
        None,
        0,
        observaciones
    )


def _normalizar_hora_texto(
    texto: str
) -> str:

    s = (
        texto or ""
    ).lower().strip()

    s = (
        s
        .replace(
            "a. m.",
            "am"
        )
        .replace(
            "p. m.",
            "pm"
        )
    )

    s = (
        s
        .replace(
            "a.m.",
            "am"
        )
        .replace(
            "p.m.",
            "pm"
        )
    )

    s = (
        s
        .replace(
            "a.m",
            "am"
        )
        .replace(
            "p.m",
            "pm"
        )
    )

    s = re.sub(
        r"\bhoras?\b",
        "",
        s
    )

    s = re.sub(
        r"\bhrs?\b",
        "",
        s
    )

    s = re.sub(
        r"\s+",
        " ",
        s
    ).strip(" ;")

    return s


def _hora_24(
    h: int,
    minuto: int,
    periodo: str | None
) -> str | None:

    if not (
        0 <= minuto <= 59
    ):
        return None

    if (
        periodo == "pm"
        and h < 12
    ):
        h += 12

    elif (
        periodo == "am"
        and h == 12
    ):
        h = 0

    if not (
        0 <= h <= 23
    ):
        return None

    return (
        f"{h:02d}:"
        f"{minuto:02d}:00"
    )


def _tokens_hora(
    texto: str
) -> list[dict[str, Any]]:

    s = _normalizar_hora_texto(
        texto
    )

    patron = re.compile(
        r"(?<!\d)"
        r"(\d{1,2})"
        r"(?:\s*[:.]\s*(\d{1,2}))?"
        r"\s*(am|pm|m\.)?"
        r"(?!\d)",
        re.I,
    )

    salida = []

    for m in patron.finditer(s):

        raw = m.group(0)

        # Evitar números que no representan horas.
        if (
            ":" not in raw
            and "." not in raw
            and not m.group(3)
        ):
            continue

        salida.append(
            {
                "h": int(
                    m.group(1)
                ),
                "m": int(
                    m.group(2)
                    or 0
                ),
                "p": (
                    (
                        m.group(3)
                        or ""
                    )
                    .lower()
                    .replace(
                        "m.",
                        ""
                    )
                    or None
                ),
            }
        )

    return salida


def _parsear_horas(
    texto: str,
    cantidad_fechas: int
) -> dict[str, Any]:

    original = (
        texto or ""
    ).strip()

    if not original:

        return {
            "tipo":
                "sin_hora",
            "hora_inicio":
                None,
            "hora_fin":
                None,
            "horas_por_fecha":
                None,
            "observacion":
                None,
        }

    tokens = _tokens_hora(
        original
    )

    if not tokens:

        return {
            "tipo":
                "hora_no_interpretable",
            "hora_inicio":
                None,
            "hora_fin":
                None,
            "horas_por_fecha":
                None,
            "observacion":
                (
                    "Hora no interpretable automáticamente: "
                    f"'{original}'."
                ),
        }

    s = _normalizar_hora_texto(
        original
    )

    # ==========================================================
    # RANGO DE HORAS
    # ==========================================================
    #
    # MIDAGRI tiene casos como:
    #
    # 8:00 a 13:00 pm
    # 9:00 a 12:00 pm
    #
    # El PM final NO debe aplicarse retroactivamente
    # si genera una hora inicial posterior a la final.
    #
    # También soporta:
    #
    # 3:00 a 5:00 pm
    #
    # que debe convertirse:
    #
    # 15:00 → 17:00
    # ==========================================================

    es_rango = (
        len(tokens) >= 2
        and
        (
            re.search(
                r"\s+a\s+",
                s
            )
            or
            re.search(
                r"\s*[-–—]\s*",
                s
            )
        )
    )

    if es_rango:

        t0 = tokens[0]
        t1 = tokens[1]

        candidatos: list[
            tuple[
                str | None,
                str | None,
                str
            ]
        ] = []

        # Interpretación literal.
        candidatos.append(
            (
                t0["p"],
                t1["p"],
                "literal"
            )
        )

        # Caso:
        # 3:00 a 5:00 pm
        if (
            not t0["p"]
            and t1["p"]
        ):

            candidatos.append(
                (
                    t1["p"],
                    t1["p"],
                    "propagado_atras"
                )
            )

        # Caso inverso.
        if (
            t0["p"]
            and not t1["p"]
        ):

            candidatos.append(
                (
                    t0["p"],
                    t0["p"],
                    "propagado_adelante"
                )
            )

        # Formato 24h puro.
        if (
            not t0["p"]
            and not t1["p"]
        ):

            candidatos = [
                (
                    None,
                    None,
                    "literal"
                )
            ]

        opciones_validas = []

        vistos = set()

        for (
            p0,
            p1,
            modo
        ) in candidatos:

            h0 = _hora_24(
                t0["h"],
                t0["m"],
                p0
            )

            h1 = _hora_24(
                t1["h"],
                t1["m"],
                p1
            )

            if (
                not h0
                or not h1
            ):
                continue

            clave = (
                h0,
                h1
            )

            if clave in vistos:
                continue

            vistos.add(
                clave
            )

            minutos_inicio = (
                int(h0[:2]) * 60
                +
                int(h0[3:5])
            )

            minutos_fin = (
                int(h1[:2]) * 60
                +
                int(h1[3:5])
            )

            # No permitir rangos invertidos.
            if (
                minutos_fin
                <
                minutos_inicio
            ):
                continue

            opciones_validas.append(
                {
                    "inicio":
                        h0,

                    "fin":
                        h1,

                    "duracion":
                        (
                            minutos_fin
                            -
                            minutos_inicio
                        ),

                    "modo":
                        modo,
                }
            )

        if opciones_validas:

            # Elegir interpretación válida
            # de menor duración.

            mejor = min(
                opciones_validas,
                key=lambda x:
                    x["duracion"]
            )

            observacion = None

            # Caso defectuoso de MIDAGRI:
            #
            # 8:00 a 13:00 pm
            # 9:00 a 12:00 pm

            if (
                mejor["modo"]
                == "literal"
                and
                not t0["p"]
                and
                t1["p"]
            ):

                observacion = (
                    "La fuente mezcla formato horario "
                    f"y sufijo '{t1['p']}' en el rango "
                    f"'{original}'. "
                    "El sufijo se aplicó solo a la hora "
                    "donde aparece para evitar invertir "
                    "el rango."
                )

            return {
                "tipo":
                    "rango",

                "hora_inicio":
                    mejor[
                        "inicio"
                    ],

                "hora_fin":
                    mejor[
                        "fin"
                    ],

                "horas_por_fecha":
                    None,

                "observacion":
                    observacion,
            }

        # Ninguna interpretación válida.
        return {
            "tipo":
                "hora_no_interpretable",

            "hora_inicio":
                None,

            "hora_fin":
                None,

            "horas_por_fecha":
                None,

            "observacion":
                (
                    "Rango horario no interpretable "
                    "sin invertir horas: "
                    f"'{original}'."
                ),
        }

    # ==========================================================
    # HORAS QUE NO SON RANGO
    # ==========================================================

    horas = [
        _hora_24(
            token["h"],
            token["m"],
            token["p"]
        )
        for token in tokens
    ]

    horas = [
        hora
        for hora in horas
        if hora
    ]

    if not horas:

        return {
            "tipo":
                "hora_no_interpretable",

            "hora_inicio":
                None,

            "hora_fin":
                None,

            "horas_por_fecha":
                None,

            "observacion":
                (
                    "Hora no interpretable automáticamente: "
                    f"'{original}'."
                ),
        }

    # ==========================================================
    # LISTA DE HORAS CON "Y"
    #
    # 09:30 y 14:30
    # ==========================================================

    if (
        re.search(
            r"\s+y\s+",
            s
        )
        and
        not re.search(
            r"\s+a\s+",
            s
        )
    ):

        if (
            cantidad_fechas
            ==
            len(horas)
        ):

            return {
                "tipo":
                    "horas_por_fecha",

                "hora_inicio":
                    None,

                "hora_fin":
                    None,

                "horas_por_fecha":
                    horas,

                "observacion":
                    None,
            }

        return {
            "tipo":
                "horas_multiples_ambiguas",

            "hora_inicio":
                None,

            "hora_fin":
                None,

            "horas_por_fecha":
                None,

            "observacion":
                (
                    "La fuente indica varias horas "
                    f"('{original}') para "
                    f"{cantidad_fechas} fechas; "
                    "no existe correspondencia inequívoca "
                    "y no se asignó una hora estructurada."
                ),
        }

    # ==========================================================
    # HORA SIMPLE
    # ==========================================================

    return {
        "tipo":
            "simple",

        "hora_inicio":
            horas[0],

        "hora_fin":
            None,

        "horas_por_fecha":
            None,

        "observacion":
            None,
    }


def _modalidad(
    plataforma: str
) -> str | None:

    n = _normalizar_clave(
        plataforma
    )

    if not n:
        return None

    if re.search(
        r"\b(hibrid|mixt)\w*\b",
        n
    ):
        return "Híbrida"

    virtual = (
        re.search(
            r"\b(virtual|meet|zoom|teams|webex|youtube|facebook)\b",
            n
        )
        or
        "http" in n
    )

    presencial = re.search(
        r"\b("
        r"presencial|"
        r"auditorio|"
        r"caserio|"
        r"comunidad|"
        r"local|"
        r"municipalidad|"
        r"plaza|"
        r"parcela|"
        r"predio|"
        r"campo|"
        r"instituto|"
        r"universidad|"
        r"colegio|"
        r"agencia|"
        r"estadio|"
        r"sector|"
        r"vivero|"
        r"oficina|"
        r"sede|"
        r"mercado|"
        r"calle|"
        r"jr\.|"
        r"avenida|"
        r"gore|"
        r"i\.e\.?|"
        r"i\.e\.p\.?"
        r")\b",
        n,
    )

    if (
        virtual
        and presencial
    ):
        return "Híbrida"

    if virtual:
        return "Virtual"

    if presencial:
        return "Presencial"

    if n in {
        "por definir",
        "todas/todas",
    }:
        return None

    return None


def _fecha_creacion_pdf(
    metadata: dict[str, Any]
) -> str | None:

    valor = str(
        (
            metadata
            or {}
        ).get(
            "CreationDate"
        )
        or ""
    )

    m = re.match(
        r"^D:(\d{4})(\d{2})(\d{2})",
        valor
    )

    if not m:
        return None

    return (
        f"{m.group(1)}-"
        f"{m.group(2)}-"
        f"{m.group(3)}"
    )


def _hash_evento(
    evento: dict[str, Any]
) -> str:

    # No incluye contacto/plataforma.
    # Así una corrección de esos campos
    # puede actualizar el evento sin duplicarlo.

    partes = [
        evento.get(
            "departamento"
        ),
        evento.get(
            "fecha_inicio"
        ),
        evento.get(
            "fecha_fin"
        ),
        evento.get(
            "hora_inicio"
        ),
        evento.get(
            "distrito_provincia_alcance"
        ),
        evento.get(
            "nombre_evento"
        ),
        evento.get(
            "entidad_organizadora"
        ),
        evento.get(
            "fuente_archivo"
        ),
    ]

    canon = "|".join(
        _normalizar_clave(
            x or ""
        )
        for x in partes
    )

    return hashlib.sha256(
        canon.encode(
            "utf-8"
        )
    ).hexdigest()


def _recuperar_celda_faltante(
    page,
    table,
    row_obj,
    indice: int
) -> str:

    otras = [
        c
        for c in row_obj.cells
        if c
    ]

    if not otras:
        return ""

    y0 = min(
        c[1]
        for c in otras
    )

    y1 = max(
        c[3]
        for c in otras
    )

    if indice == 0:

        x0 = table.bbox[0]

        x1 = next(
            (
                c[0]
                for c in
                row_obj.cells[1:]
                if c
            ),
            table.bbox[2],
        )

    elif (
        indice
        ==
        len(row_obj.cells) - 1
    ):

        x0 = next(
            (
                c[2]
                for c in
                reversed(
                    row_obj.cells[:indice]
                )
                if c
            ),
            table.bbox[0],
        )

        x1 = table.bbox[2]

    else:

        izquierda = next(
            (
                c
                for c in
                reversed(
                    row_obj.cells[:indice]
                )
                if c
            ),
            None,
        )

        derecha = next(
            (
                c
                for c in
                row_obj.cells[
                    indice + 1:
                ]
                if c
            ),
            None,
        )

        x0 = (
            izquierda[2]
            if izquierda
            else table.bbox[0]
        )

        x1 = (
            derecha[0]
            if derecha
            else table.bbox[2]
        )

    if (
        x1 <= x0
        or y1 <= y0
    ):
        return ""

    return (
        page
        .crop(
            (
                x0,
                y0,
                x1,
                y1
            )
        )
        .extract_text(
            x_tolerance=1,
            y_tolerance=2
        )
        or ""
    )


def parsear_calendario_pdf(
    contenido_pdf: bytes,
    fuente_archivo: str,
    mes_solicitado: int | None = None,
) -> dict[str, Any]:

    if not contenido_pdf.startswith(
        b"%PDF"
    ):
        raise ValueError(
            "El contenido recibido no es un PDF válido"
        )

    eventos: list[
        dict[str, Any]
    ] = []

    filas_fuente = 0

    departamento_actual = (
        "Nacional"
    )

    paginas_sin_tabla: list[
        int
    ] = []

    with pdfplumber.open(
        io.BytesIO(
            contenido_pdf
        )
    ) as pdf:

        fecha_actualizacion = (
            _fecha_creacion_pdf(
                pdf.metadata
                or {}
            )
        )

        for (
            numero_pagina,
            page
        ) in enumerate(
            pdf.pages,
            start=1
        ):

            tablas = (
                page
                .find_tables()
            )

            if not tablas:

                paginas_sin_tabla.append(
                    numero_pagina
                )

                continue

            # Tabla principal de la página.
            table = max(
                tablas,
                key=lambda t:
                    len(t.rows)
            )

            extraida = (
                table
                .extract()
            )

            for (
                row_obj,
                fila
            ) in zip(
                table.rows,
                extraida
            ):

                fila = list(
                    fila
                    or []
                )

                while (
                    len(fila)
                    <
                    6
                ):
                    fila.append(
                        None
                    )

                fila = fila[:6]

                # ==================================================
                # RECUPERAR CELDAS FALTANTES
                # ==================================================

                for (
                    idx,
                    valor
                ) in enumerate(
                    fila
                ):

                    if valor is None:

                        no_vacias = [
                            x
                            for x in fila
                            if x
                            not in (
                                None,
                                ""
                            )
                        ]

                        # Fila fusionada de departamento.
                        if (
                            len(no_vacias)
                            ==
                            1
                        ):
                            continue

                        fila[idx] = (
                            _recuperar_celda_faltante(
                                page,
                                table,
                                row_obj,
                                idx
                            )
                        )

                celdas_raw = [
                    x or ""
                    for x in fila
                ]

                celdas = [
                    _unir_lineas_celda(
                        x
                    )
                    for x in celdas_raw
                ]

                no_vacias = [
                    x
                    for x in celdas
                    if x
                ]

                if not no_vacias:
                    continue

                # ==================================================
                # DEPARTAMENTO
                # ==================================================

                if (
                    len(no_vacias)
                    ==
                    1
                ):

                    clave = (
                        _normalizar_clave(
                            no_vacias[0]
                        )
                    )

                    if clave in DEP_MAP:

                        departamento_actual = (
                            DEP_MAP[
                                clave
                            ]
                        )

                        continue

                # ==================================================
                # CABECERA DE TABLA
                # ==================================================

                cabecera = (
                    _normalizar_clave(
                        " ".join(
                            celdas
                        )
                    )
                )

                if (
                    "fecha y hora"
                    in cabecera
                    and
                    "nombre del evento"
                    in cabecera
                ):
                    continue

                # ==================================================
                # COLUMNAS
                # ==================================================

                fecha_hora_raw = (
                    _unir_lineas_celda(
                        celdas_raw[0]
                    )
                )

                alcance = (
                    _unir_lineas_celda(
                        celdas_raw[1],
                        reparar_palabras=True
                    )
                    or None
                )

                nombre = (
                    _unir_lineas_celda(
                        celdas_raw[2]
                    )
                    or None
                )

                plataforma = (
                    _unir_lineas_celda(
                        celdas_raw[3]
                    )
                    or None
                )

                contacto = (
                    _unir_lineas_celda(
                        celdas_raw[4]
                    )
                    or None
                )

                entidad = (
                    _unir_lineas_celda(
                        celdas_raw[5]
                    )
                    or None
                )

                # Debe existir título de evento.
                if not nombre:
                    continue

                filas_fuente += 1

                # ==================================================
                # FECHA
                # ==================================================

                (
                    fecha_info,
                    consumidos,
                    notas_fecha
                ) = (
                    _parsear_fecha_expresion(
                        fecha_hora_raw
                    )
                )

                notas = [
                    (
                        "Extraído por columnas de la tabla oficial "
                        "MIDAGRI mediante pdfplumber."
                    ),
                    (
                        f"Página PDF: "
                        f"{numero_pagina}."
                    ),
                ]

                notas.extend(
                    notas_fecha
                )

                if not fecha_info:

                    fechas = [
                        (
                            None,
                            None
                        )
                    ]

                    resto_hora = ""

                    notas.append(
                        (
                            "Fecha no interpretable automáticamente: "
                            f"'{fecha_hora_raw}'."
                        )
                    )

                else:

                    fechas = (
                        fecha_info[
                            "fechas"
                        ]
                    )

                    resto_hora = (
                        fecha_hora_raw[
                            consumidos:
                        ]
                        .strip(
                            " ;"
                        )
                    )

                    if (
                        fecha_info[
                            "tipo"
                        ]
                        ==
                        "multiples"
                    ):

                        notas.append(
                            (
                                "Fila expandida desde fechas múltiples: "
                                f"'{fecha_hora_raw[:consumidos].strip()}'."
                            )
                        )

                # ==================================================
                # HORAS
                # ==================================================

                horas = (
                    _parsear_horas(
                        resto_hora,
                        len(fechas)
                    )
                )

                if horas.get(
                    "observacion"
                ):

                    notas.append(
                        horas[
                            "observacion"
                        ]
                    )

                # ==================================================
                # CONSTRUIR EVENTOS
                # ==================================================

                for (
                    indice_fecha,
                    (
                        fecha_inicio,
                        fecha_fin
                    )
                ) in enumerate(
                    fechas
                ):

                    hora_inicio = (
                        horas[
                            "hora_inicio"
                        ]
                    )

                    hora_fin = (
                        horas[
                            "hora_fin"
                        ]
                    )

                    if horas.get(
                        "horas_por_fecha"
                    ):

                        lista_horas = (
                            horas[
                                "horas_por_fecha"
                            ]
                        )

                        if (
                            indice_fecha
                            <
                            len(
                                lista_horas
                            )
                        ):

                            hora_inicio = (
                                lista_horas[
                                    indice_fecha
                                ]
                            )

                            hora_fin = None

                    if fecha_inicio:

                        anio = int(
                            fecha_inicio[
                                :4
                            ]
                        )

                        mes = int(
                            fecha_inicio[
                                5:7
                            ]
                        )

                    else:

                        anio = None

                        mes = (
                            mes_solicitado
                        )

                    evento = {

                        "anio":
                            anio,

                        "mes":
                            mes,

                        "mes_nombre":
                            MESES.get(
                                mes
                            ),

                        "departamento":
                            departamento_actual,

                        "fecha_hora_texto":
                            (
                                fecha_hora_raw
                                or None
                            ),

                        "fecha_inicio":
                            fecha_inicio,

                        "fecha_fin":
                            fecha_fin,

                        "hora_inicio":
                            hora_inicio,

                        "hora_fin":
                            hora_fin,

                        "distrito_provincia_alcance":
                            alcance,

                        "nombre_evento":
                            nombre,

                        "plataforma_direccion":
                            plataforma,

                        "contacto":
                            contacto,

                        "entidad_organizadora":
                            entidad,

                        "modalidad":
                            _modalidad(
                                plataforma
                                or ""
                            ),

                        "fuente_archivo":
                            fuente_archivo,

                        "fecha_actualizacion":
                            fecha_actualizacion,

                        "observaciones_calidad":
                            " ".join(
                                notas
                            ),
                    }

                    evento[
                        "hash_evento"
                    ] = (
                        _hash_evento(
                            evento
                        )
                    )

                    eventos.append(
                        evento
                    )

    # ==========================================================
    # DEDUPLICACIÓN POR HASH
    # ==========================================================

    unicos: dict[
        str,
        dict[str, Any]
    ] = {}

    for evento in eventos:

        unicos.setdefault(
            evento[
                "hash_evento"
            ],
            evento
        )

    eventos = list(
        unicos.values()
    )

    return {
        "ok":
            True,

        "fuente_archivo":
            fuente_archivo,

        "filas_fuente":
            filas_fuente,

        "total_eventos":
            len(
                eventos
            ),

        "paginas_sin_tabla":
            paginas_sin_tabla,

        "eventos":
            eventos,
    }