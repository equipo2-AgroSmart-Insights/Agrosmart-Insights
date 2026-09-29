import re
import unicodedata

MAX_QUERY_LENGTH = 2000


def normalize_text(user_input: str) -> str:
    """
    Normaliza el texto para facilitar la detección de patrones.
    """
    text = unicodedata.normalize("NFKC", user_input)
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text


def analyze_nlq_security(user_input: str) -> dict:
    """
    Analiza una consulta NLQ y devuelve información de seguridad.
    """

    if not isinstance(user_input, str):
        return {
            "allowed": False,
            "threat_type": "ENTRADA INVÁLIDA",
            "reason": "La entrada no es texto.",
        }

    text = normalize_text(user_input)

    # Validaciones básicas
    if not text:
        return {
            "allowed": False,
            "threat_type": "ENTRADA INVÁLIDA",
            "reason": "La consulta está vacía.",
        }

    if len(text) > MAX_QUERY_LENGTH:
        return {
            "allowed": False,
            "threat_type": "ENTRADA INVÁLIDA",
            "reason": "La consulta supera la longitud permitida.",
        }

    forbidden_patterns = [
        # Prompt Injection
        (
            r"ignora\s+(todas\s+)?las\s+" r"(instrucciones|pol[ií]ticas)",
            "INYECCIÓN DE PROMPT",
            "Intento de ignorar instrucciones o políticas.",
        ),
        (
            r"ignora\s+(temporalmente\s+)?las\s+restricciones",
            "INYECCIÓN DE PROMPT",
            "Intento de evadir las restricciones de seguridad.",
        ),
        (
            r"(responde|act[uú]a)\s+como\s+.*sin\s+restricciones",
            "INYECCIÓN DE PROMPT",
            "Intento de eliminar las restricciones del asistente.",
        ),
        # Manipulación del sistema
        (
            r"\bsystem\s*:",
            "MANIPULACIÓN DEL SISTEMA",
            "Intento de modificar el rol o las instrucciones del sistema.",
        ),
        (
            r"\bsystem\s+prompt\b",
            "INFORMACIÓN SENSIBLE",
            "Intento de obtener las instrucciones internas del sistema.",
        ),
        # Información sensible
        (
            r"\bapi[\s_-]?keys?\b",
            "INFORMACIÓN SENSIBLE",
            "Solicitud de claves de API.",
        ),
        (
            r"\btokens?\b",
            "INFORMACIÓN SENSIBLE",
            "Solicitud de tokens de acceso.",
        ),
        (
            r"\bcontrase(?:ñ|n)as?\b",
            "INFORMACIÓN SENSIBLE",
            "Solicitud de contraseñas.",
        ),
        (
            r"\bvariables\s+de\s+entorno\b",
            "INFORMACIÓN SENSIBLE",
            "Solicitud de variables de entorno.",
        ),
        (
            r"\bcredenciales\b",
            "INFORMACIÓN SENSIBLE",
            "Solicitud de credenciales.",
        ),
        # SQL Injection
        (
            r"\bdrop\s+table\b",
            "INYECCIÓN SQL",
            "Intento de eliminar una tabla mediante SQL.",
        ),
        (
            r"\bselect\s+\*\s+from\b",
            "INYECCIÓN SQL",
            "Intento de extraer registros mediante SQL.",
        ),
        (
            r"\b(delete|update|insert)\s+.*\b(from|into)\b",
            "INYECCIÓN SQL",
            "Intento de modificar datos mediante SQL.",
        ),
        # Ejecución de comandos
        (
            r"\bexec(?:ute)?\s*\(",
            "INYECCIÓN DE COMANDOS",
            "Intento de ejecutar comandos.",
        ),
    ]

    for pattern, threat_type, reason in forbidden_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return {
                "allowed": False,
                "threat_type": threat_type,
                "reason": reason,
            }

    return {
        "allowed": True,
        "threat_type": "NINGUNA",
        "reason": "Consulta permitida.",
    }


def validate_nlq_security(user_input: str) -> bool:
    """
    Mantiene compatibilidad con los tests existentes.
    Retorna False si la consulta debe bloquearse.
    """
    result = analyze_nlq_security(user_input)
    return result["allowed"]
