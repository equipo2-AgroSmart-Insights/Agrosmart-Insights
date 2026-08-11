import re


def validate_nlq_security(user_input: str) -> bool:
    """
    Filtro estático de seguridad para consultas NLQ.
    Retorna False si detecta intentos de Prompt Injection o SQL Injection.
    """
    forbidden_patterns = [
        r"ignora\s+todas\s+las\s+instrucciones",
        r"system\s*:",
        r"drop\s+table",
        r"select\s+.*\s+from",
        r"exec\s*\(",
        r"system\s+prompt",
    ]
    for pattern in forbidden_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            return False
    return True
