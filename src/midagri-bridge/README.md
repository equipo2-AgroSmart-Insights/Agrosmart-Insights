# MIDAGRI Bridge — Guía de activación de túneles y workflows

> **¿Qué es esto?**  
> El Bridge es un servidor HTTP local escrito en Python que actúa como intermediario entre los workflows de n8n y los PDFs del sitio MIDAGRI. Los workflows **no pueden** llamar directamente a MIDAGRI (bloqueo CORS / agente de usuario); el Bridge lo hace por ellos y expone los datos vía HTTP local. ngrok convierte ese servidor local en una URL pública que n8n puede alcanzar desde la nube.

---

## Estructura de archivos

```
src/midagri-bridge/
├── midagri_bridge.py      # Servidor HTTP del bridge (endpoints /pdf, /calendario, /calendario-json)
├── calendario_parser.py   # Parser de PDFs del Calendario Agrario MIDAGRI
├── requirements.txt       # Dependencias Python
├── iniciar_bridge.ps1     # Script de inicio rápido (Bridge + ngrok)
└── README.md              # Este archivo
```

---

## Requisitos previos

| Herramienta | Mínimo | Verificar con |
|---|---|---|
| Python | 3.11 | `py --version` |
| pip / venv | — | `py -m pip --version` |
| ngrok | v3 | `ngrok version` |

### Instalar dependencias Python (una sola vez)

```powershell
cd "src\midagri-bridge"
py -m pip install -r requirements.txt
```

### Instalar ngrok (si no lo tienes)

Descarga el ZIP desde <https://ngrok.com/download>, descomprímelo y anota la ruta del ejecutable `ngrok.exe`.

---

## Activación — paso a paso

### Ventana 1 — Bridge local

```powershell
cd C:\AgroSmart\midagri-bridge          # o la ruta dentro del repo
$env:BRIDGE_TOKEN = "TU_TOKEN"       # cambia por tu token real
py .\midagri_bridge.py
```

> **No cierres esta ventana.** El servidor queda escuchando en `http://localhost:8080`.

---

### Ventana 2 — Túnel ngrok

```powershell
# Si ngrok está en PATH:
ngrok http 8080

# Si usas la ruta directa del ZIP descargado:
& "C:\Users\Fiorella\AppData\Local\Temp\<carpeta-ngrok>\ngrok.exe" http 8080
```

Espera hasta ver la línea:

```
Session Status   online
Forwarding       https://XXXX-XXX.ngrok-free.app -> http://localhost:8080
```

Copia esa URL `https://...ngrok-free.app` — la necesitas en n8n.

---

### Script de inicio rápido (alternativa a las dos ventanas)

El script `iniciar_bridge.ps1` abre automáticamente las dos ventanas:

```powershell
cd "src\midagri-bridge"
.\iniciar_bridge.ps1 -Token "TU_TOKEN"

# Si ngrok NO está en PATH, pasa la ruta completa:
.\iniciar_bridge.ps1 -Token "TU_TOKEN" -NgrokPath "C:\ruta\a\ngrok.exe"
```

---

### Verificar que el bridge está activo

```powershell
Invoke-RestMethod "http://localhost:8080/health"
```

Respuesta esperada:

```json
{
  "ok": true,
  "servicio": "AgroSmart MIDAGRI Bridge",
  "estado": "activo",
  "endpoints": ["/pdf", "/calendario", "/calendario-json"]
}
```

### Reiniciar el servidor

Desde la **Ventana 1** (donde corre el bridge): `Ctrl + C` → vuelve a ejecutar `py .\midagri_bridge.py`.

---

## Configurar la URL del bridge en n8n

Una vez que ngrok muestre la URL pública, ve a n8n y actualiza la variable/credencial `BRIDGE_URL` en cada workflow que la use:

| Workflow | Qué actualizar |
|---|---|
| `wf1-ingesta-diaria-precios` | Variable `BRIDGE_URL` → `https://TU-URL.ngrok-free.app` |
| `wf0-ingesta-historica` | Variable `BRIDGE_URL` → `https://TU-URL.ngrok-free.app` |
| `wf4-calendario-eventos` | Variable `BRIDGE_URL` → `https://TU-URL.ngrok-free.app` |

> [!IMPORTANT]
> La URL de ngrok **cambia cada vez** que reinicias el túnel (en el plan gratuito). Deberás actualizarla en n8n cada vez.  
> Para una URL fija, configura un dominio estático en ngrok con `ngrok http --domain=tu-dominio.ngrok-free.app 8080`.

---

## Endpoints disponibles

### `GET /health`
Sin autenticación. Verifica que el servidor está vivo.

### `GET /pdf?date=YYYY-MM-DD&mercado=GMML`
Devuelve el PDF del boletín diario de precios.  
- `mercado`: `GMML` (Mercado Mayorista de Lima) o `MMF2` (Mercado Mayorista Frigorífico N°2).  
- Header requerido: `X-Bridge-Token: <tu-token>`

### `GET /calendario?month=11`
Devuelve el PDF del Calendario Agrario del mes indicado.  
- `month`: número `1`–`12` o nombre en español (`noviembre`).  
- Header requerido: `X-Bridge-Token: <tu-token>`

### `GET /calendario-json?month=11`
Devuelve el calendario parseado en JSON estructurado por columnas (fecha, hora, actividad, institución, lugar, departamento).  
- Header requerido: `X-Bridge-Token: <tu-token>`

---

## Qué workflow usa cada endpoint

| Workflow | Endpoints consumidos | Frecuencia |
|---|---|---|
| `wf1-ingesta-diaria-precios` | `/pdf` (GMML y MMF2) | Diaria (automática) |
| `wf0-ingesta-historica` | `/pdf` (GMML y MMF2) | Manual / mensual |
| `wf4-calendario-eventos` | `/calendario-json` | Mensual |

---

## Notas de seguridad

- El token (`BRIDGE_TOKEN`) nunca debe quedar en el código. Siempre pásalo como variable de entorno.
- No expongas el bridge sin el token configurado; el servidor lo rechazará con error al iniciar.
- Si compartes la URL de ngrok, cualquiera con el token puede consultar los endpoints. Usa un token robusto en producción.

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Configure BRIDGE_TOKEN antes de iniciar` | No se seteó la env var | `$env:BRIDGE_TOKEN = "tu-token"` |
| `401 Token invalido` | El header no coincide con `BRIDGE_TOKEN` | Verifica el token en n8n y en el bridge |
| `404 BOLETIN_NO_DISPONIBLE` | MIDAGRI no publicó el boletín para esa fecha | Espera o prueba con una fecha anterior |
| `502 ERROR_FUENTE_MIDAGRI` | MIDAGRI está caído o cambió la URL | Verifica manualmente `siea.midagri.gob.pe` |
| ngrok dice `ERR_NGROK_108` | Sesión duplicada | Cierra otras instancias de ngrok |
| La URL de n8n no llega al bridge | URL de ngrok desactualizada | Reinicia ngrok y actualiza `BRIDGE_URL` en n8n |

