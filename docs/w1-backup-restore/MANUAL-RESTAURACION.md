# Manual de restauración de AgroSmart Insights

Este manual es para alguien que **nunca trabajó en el proyecto** y tiene que
levantarlo completo en **cuentas propias y nuevas**, usando solo el respaldo y
este documento. Si un paso no funciona tal como está escrito, el manual está
mal: anótalo y avísale al equipo, no lo resuelvas por tu cuenta.

Tiempo estimado la primera vez: 2 a 3 horas (la mayor parte es crear cuentas
y esperar despliegues). Qué se respalda, qué no y por qué:
[ESTRATEGIA-RESPALDO.md](ESTRATEGIA-RESPALDO.md).

## Qué vas a tener al final

| Pieza | Dónde corre | Qué hace |
|---|---|---|
| Base de datos PostgreSQL + pgvector | Render | Precios, clima, productos, alertas, calendario, documentos del chat |
| n8n (orquestador) | Render | 7 workflows: ingesta (WF0, WF1), chat (WF2), NDVI (WF3), calendario (WF4), alertas (WF5) |
| Frontend: 1 shell + 5 microfrontends | Vercel | La web que usa el agricultor |
| Puente MIDAGRI | Tu computadora + ngrok | Descarga los PDFs de precios y el calendario de MIDAGRI para WF0, WF1 y WF4 |
| Código y CI/CD | GitHub | Repositorio y pipelines |

## 0. Lo que te tiene que pasar el equipo

- [ ] El archivo `agrosmart-respaldo-AAAAMMDD-HHMM.7z` (y su `.7z.sha256`).
      Sale de GitHub → Actions → **Respaldo del proyecto** → última corrida
      verde → Artifacts.
- [ ] La **frase del respaldo** (`BACKUP_PASSPHRASE`). El líder DevSecOps te
      la da por un canal privado. Sin ella el `.7z` no se abre.

## 1. Herramientas en tu computadora

| Herramienta | Para qué | Cómo comprobar |
|---|---|---|
| 7-Zip | Abrir el respaldo | Abre el `.7z` con doble clic |
| Git | Subir el código | `git --version` |
| Node.js 24 | Probar el frontend (opcional) | `node --version` |
| Cliente de PostgreSQL 18 (`psql`, `pg_restore`) | Restaurar la base | `pg_restore --version` debe decir 18 |
| Git Bash (Windows) o una terminal (Linux/macOS) | Correr `restaurar-bd.sh` | — |
| Python 3.11 o superior | Correr el puente MIDAGRI (paso 5.3) | `py --version` |
| ngrok v3 | Darle URL pública al puente | `ngrok version` |

## 2. Cuentas y claves que vas a crear

Anótalas en un gestor de contraseñas, **nunca en un archivo del
repositorio**. Todas tienen plan gratuito **menos los modelos de IA del
chat**:

> **Costo — revisa esto antes de empezar.** WF2 (el chat) usa dos modelos de
> OpenRouter que son de pago (precios de OpenRouter al 06/11/2026, en US$
> por millón de tokens):
> - `inclusionai/ling-3.0-flash`: 0.021 de entrada y 0.063 de salida.
> - `qwen/qwen3.6-plus`: 0.325 de entrada y 1.95 de salida.
>
> Hay que cargar crédito en OpenRouter. Si el equipo decide no pagar, en el
> paso 6 se cambian esos nodos por modelos con sufijo `:free`. El chat
> funcionará, pero sus respuestas pueden variar respecto de producción. Esa
> decisión es del equipo, no tuya.

| Qué | Dónde se crea | Dónde se usa |
|---|---|---|
| Cuenta de GitHub | github.com | Repositorio nuevo |
| Cuenta de Render | render.com (entra con tu GitHub) | Base de datos y n8n |
| Cuenta de Vercel | vercel.com (entra con tu GitHub) | Frontend |
| API key de OpenRouter (con crédito, ver arriba) | openrouter.ai → Keys | Credencial de n8n "OpenRouter account" (WF2) |
| API key de Jina AI | jina.ai → API | Dentro de WF0 y WF2, en el nodo que llama a `api.jina.ai/v1/embeddings` |
| Proyecto de Langfuse (public + secret key) | cloud.langfuse.com | Credencial de n8n "langfuse credential" (WF2) |
| Cliente OAuth de Copernicus | dataspace.copernicus.eu → Dashboard → User Settings → OAuth clients → Create | Credencial de n8n "Copernicus OAuth2 - AgroSmart" (WF3) |
| API key de MapTiler | cloud.maptiler.com → API keys | Variable `VITE_MAPTILER_API_KEY` del microfrontend de monitoreo |
| Clave del webhook de NDVI | La inventas tú: una cadena larga y aleatoria | Credencial de n8n "Header Auth" (WF3) y `VITE_WF3_NDVI_KEY` |
| Cuenta de ngrok (authtoken) | ngrok.com → panel → Your Authtoken | Túnel del puente MIDAGRI (paso 5.3) |
| Token del puente | Lo inventas tú: una cadena larga y aleatoria | Puente (paso 5.3) y WF0, WF1, WF4 (paso 6) |

## 3. Abrir el respaldo

1. Verifica que el archivo no esté dañado (Git Bash):
   ```bash
   sha256sum -c agrosmart-respaldo-*.7z.sha256
   ```
   Debe decir `OK`.
2. Abre el `.7z` con 7-Zip y escribe la frase. Extrae la carpeta
   `agrosmart-respaldo-AAAAMMDD-HHMM`.
3. Lee `MANIFIESTO.md`: dice de qué fecha y commit es el respaldo y cuántas
   filas tenía cada tabla. Esos números los vas a comparar en el paso 5.

Contenido de la carpeta:

```
MANIFIESTO.md            fecha, commit, filas por tabla
MANUAL-RESTAURACION.md   este documento
restaurar-bd.sh          script que restaura la base (paso 5)
bd/agrosmart_app.dump    tablas y datos de la app
bd/conteos.tsv           filas por tabla al respaldar
bd/migraciones/          scripts SQL del esquema
n8n/                     los 7 workflows en JSON + README
codigo/                  código fuente completo (tar.gz)
```

## 4. Código: tu propio repositorio

1. En GitHub crea un repositorio nuevo y vacío (por ejemplo
   `agrosmart-restaurado`).
2. En Git Bash:
   ```bash
   mkdir agrosmart-restaurado && cd agrosmart-restaurado
   tar -xzf ../agrosmart-respaldo-*/codigo/agrosmart-insights-codigo.tar.gz
   git init -b main && git add . && git commit -m "Restauración desde respaldo"
   git remote add origin https://github.com/<tu-usuario>/agrosmart-restaurado.git
   git push -u origin main
   ```

## 5. Base de datos y n8n en Render

### 5.1 Crear los servicios con el Blueprint

1. Render → **New → Blueprint** → elige tu repositorio. Render lee
   `render.yaml` y propone crear `agrosmart-postgres` (base) y
   `agrosmart-n8n` (n8n). Antes de aceptar, confirma que la imagen de n8n en
   `render.yaml` sea `n8nio/n8n:2.40.7`, la versión que corre producción al
   05/11/2026 (`MANIFIESTO.md` también la muestra). Con una versión más
   antigua los workflows no se importan bien.
2. Te pedirá valores para algunas variables:
   - `N8N_HOST`: `agrosmart-n8n-XXXX.onrender.com` (el dominio que Render le
     asigne; si aún no lo sabes, ponlo después en Environment).
   - `N8N_EDITOR_BASE_URL` y `N8N_WEBHOOK_URL`: `https://` + ese mismo
     dominio + `/`.
   - `GROQ_API_KEY`, `GEMINI_API_KEY`, `HUGGINGFACE_API_KEY`,
     `MAPTILER_API_KEY`: **déjalas vacías**. Son de una versión anterior; los
     workflows actuales usan credenciales de n8n (paso 6).
3. Espera a que ambos queden en verde. Comprueba n8n abriendo
   `https://<tu-dominio-n8n>/healthz` → debe responder `{"status":"ok"}`.

### 5.2 Restaurar los datos

1. Render → `agrosmart-postgres` → **Networking** → agrega tu IP (o
   `0.0.0.0/0` solo mientras restauras) a **Access Control**.
   > Ojo: el Blueprint deja esta lista vacía cada vez que se sincroniza. Si
   > más adelante no puedes conectarte, revisa esto primero.
2. Copia la **External Database URL** (Render → `agrosmart-postgres` →
   Connect).
3. En Git Bash, desde la carpeta donde extrajiste el respaldo:
   ```bash
   export TARGET_DATABASE_URL='<External Database URL>'
   bash agrosmart-respaldo-*/restaurar-bd.sh agrosmart-respaldo-*
   ```
   Debe terminar con `Base restaurada.` Si dice que la base ya tiene tablas,
   no la estás usando vacía: detente.
4. Comprueba las filas y compáralas con `MANIFIESTO.md`:
   ```bash
   psql "$TARGET_DATABASE_URL" -c "SELECT 'precios_diarios' t, count(*) FROM precios_diarios UNION ALL SELECT 'clima_diario', count(*) FROM clima_diario UNION ALL SELECT 'alertas_riesgo_reglas', count(*) FROM alertas_riesgo_reglas"
   ```
5. Quita `0.0.0.0/0` de Access Control si lo pusiste.

> Este mismo script se prueba solo cada lunes en GitHub Actions
> (job "Restaurar el respaldo en una base vacía"): si ese job está en verde,
> este paso funciona.

### 5.3 Puente MIDAGRI (para WF0, WF1 y WF4)

WF0, WF1 y WF4 no pueden descargar directamente los PDFs de precios ni el
calendario de MIDAGRI: lo hace por ellos un pequeño servidor en Python (el
"puente", en `src/midagri-bridge/`). Corre **en tu computadora** y ngrok le
da una URL pública para que n8n, en la nube, lo alcance.

1. Crea una cuenta gratuita en ngrok (ngrok.com), instálalo y registra tu
   authtoken (lo ves en el panel de ngrok):
   ```powershell
   ngrok config add-authtoken <TU_AUTHTOKEN_DE_NGROK>
   ```
2. Inventa un **token del puente**: una cadena larga y aleatoria. Lo usarás
   aquí y en n8n (paso 6).
3. En PowerShell, desde la carpeta del código restaurado:
   ```powershell
   cd src\midagri-bridge
   py -m pip install -r requirements.txt
   .\iniciar_bridge.ps1 -Token "<tu token del puente>"
   ```
   Se abren dos ventanas: el puente (puerto 8080) y ngrok. **No las
   cierres** mientras uses la app.
4. Comprueba que el puente responde:
   ```powershell
   Invoke-RestMethod "http://localhost:8080/health"
   ```
   Debe responder con `"ok": true`.
5. Copia la URL pública que muestra la ventana de ngrok (línea
   `Forwarding https://….ngrok-free.app`). Si reinicias ngrok, la URL puede
   cambiar: entonces repite el reemplazo del paso 6.

Detalle completo y solución de problemas: `src/midagri-bridge/README.md`.

## 6. n8n: credenciales y workflows

1. Abre `https://<tu-dominio-n8n>/` y crea la cuenta de dueño (owner).
2. **Credentials → Add credential**. Créalas con **exactamente estos
   nombres**, para que los workflows las encuentren al importarlos:

   | Nombre | Tipo | Datos |
   |---|---|---|
   | `Postgres account` | Postgres | Host, base, usuario y contraseña: Render → `agrosmart-postgres` → Connect → **Internal** (n8n y la base están en Render) |
   | `OpenRouter account` | OpenRouter | Tu API key de OpenRouter |
   | `langfuse credential` | Basic Auth | Usuario = public key, contraseña = secret key de Langfuse |
   | `Copernicus OAuth2 - AgroSmart` | OAuth2 API, grant type **Client Credentials** | Client ID y Secret de Copernicus. Access Token URL: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token` |
   | `Header Auth account 2` | Header Auth | Name: `X-AgroSmart-Key` · Value: la clave que inventaste |

3. **Import from File** con cada JSON de la carpeta `n8n/`, en este orden:
   WF5, WF3, WF4, WF2, WF1, WF0 (GMML y MMF2).
4. Reemplaza los marcadores que dejó el respaldo (por seguridad, las claves
   no viajan en el respaldo) y la URL del puente. Lo más rápido es hacerlo
   con **Buscar y reemplazar** en cada archivo JSON *antes* de importarlo;
   también se puede editar cada nodo en n8n.

   | Buscar | Workflows | Reemplazar por |
   |---|---|---|
   | `{{JINA_API_KEY_SE_DEBE_ROTAR_Y_MOVER_A_CREDENCIAL}}` | WF0 (×2), WF2 | Tu API key de Jina |
   | `{{BRIDGE_TOKEN_SE_DEBE_MOVER_A_CREDENCIAL}}` | WF0, WF1, WF4 | Tu token del puente (paso 5.3) |
   | `https://sliding-babied-rendering.ngrok-free.dev` | WF0, WF1, WF4 | Tu URL de ngrok (paso 5.3), sin `/` al final |

5. Abre cada nodo con credencial y confirma que tomó la tuya (si sale en
   rojo, elígela de la lista).
   - Solo si el equipo decidió no pagar los modelos (ver el recuadro de
     costo del paso 2): en WF2, abre los 8 nodos de OpenRouter y cambia el
     modelo por uno con sufijo `:free`. Anota cuáles usaste.
6. Activa los workflows que tienen trigger: **WF2, WF3, WF4, WF5** y WF1.
   WF0 es de carga histórica: se corre a mano solo si la base viniera vacía.
7. Prueba el chat:
   ```bash
   curl -s -X POST https://<tu-dominio-n8n>/webhook/v1/query \
     -H "Content-Type: application/json" \
     -d '{"pregunta":"¿Cuál es el precio de la papa amarilla en GMML?","session_id":"prueba"}'
   ```
   Debe responder un JSON con un precio.

## 7. Frontend en Vercel

Se despliegan primero los 5 microfrontends y al final el shell, porque el
shell necesita las URLs de los otros cinco.

En Vercel → **Add New → Project** → importa tu repositorio, y repite por
cada fila. En **Root Directory** pon la carpeta indicada; Vercel detecta Vite.

| Proyecto | Root Directory | Environment Variables |
|---|---|---|
| chat | `src/frontend/chat-microfrontend` | `VITE_N8N_WEBHOOK_URL` = `https://<n8n>/webhook/v1/query` |
| monitoreo | `src/frontend/monitoreo-microfrontend` | `VITE_N8N_WEBHOOK_URL` (igual), `VITE_WF3_NDVI_URL` = `https://<n8n>/webhook/v1/satelital/ndvi`, `VITE_WF3_NDVI_KEY` = tu clave de NDVI, `VITE_MAPTILER_API_KEY` |
| mercados | `src/frontend/mercados-microfrontend` | `VITE_N8N_WEBHOOK_URL` (igual) |
| alertas | `src/frontend/alertas-microfrontend` | `VITE_ALERTS_WEBHOOK_URL` = `https://<n8n>/webhook/v1/alertas` |
| calendario | `src/frontend/calendario-microfrontend` | `VITE_CALENDARIO_API_URL` = `https://<n8n>/webhook/v1/calendario` |
| **shell** (al final) | `src/frontend/agrosmart-frontend` | `VITE_N8N_WEBHOOK_URL` (igual) y, por cada microfrontend, `VITE_<NOMBRE>_REMOTE_URL` = `https://<proyecto>.vercel.app/assets/remoteEntry.js` (`CHAT`, `MONITOREO`, `MERCADOS`, `ALERTAS`, `CALENDARIO`) |

Comprueba cada microfrontend abriendo
`https://<proyecto>.vercel.app/assets/remoteEntry.js`: debe descargar un
archivo JavaScript, no una página de error.

## 8. CI/CD en tu repositorio (para replicar el pipeline)

La app ya funciona sin este paso. Hazlo si también hay que demostrar los
pipelines. En GitHub → Settings → Secrets and variables → Actions:

| Secret | Valor |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` y `VERCEL_PROJECT_ID_CHAT/_MONITOREO/_MERCADOS/_ALERTAS/_CALENDARIO` | Vercel → cada proyecto → Settings → General (Project ID) y Team/Account ID |
| `VITE_N8N_WEBHOOK_URL`, `VITE_*_REMOTE_URL` | Los mismos valores del paso 7 |
| `RENDER_DEPLOY_HOOK_N8N` | Render → `agrosmart-n8n` → Settings → Deploy Hook |
| `RENDER_DATABASE_URL` | External Database URL de Render (para respaldos y migraciones) |
| `FRONTEND_HEALTH_URL`, `N8N_HEALTH_URL` | URL del shell y `https://<n8n>/healthz` |
| `AGROSMART_WF2_URL` | `https://<n8n>/webhook/v1/query` (evaluaciones de IA) |
| `BACKUP_PASSPHRASE` | Una frase nueva y larga (para tus propios respaldos) |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` | Opcional: costos en las evaluaciones de IA |

Luego en **Actions** corre a mano **Respaldo del proyecto**: si termina en
verde, tu copia ya se respalda y se verifica sola cada semana.

## 9. Verificación final

Abre la URL del shell y marca:

- [ ] La página carga sin errores.
- [ ] **Chat**: preguntar "¿Cuál es el precio de la papa amarilla en GMML?" → responde con un precio.
- [ ] **Mercados**: buscar un producto → aparecen precios y la comparativa GMML/MMF2.
- [ ] **Monitoreo**: el mapa carga y la consulta NDVI devuelve una imagen.
- [ ] **Alertas**: se listan alertas (o el mensaje de que no hay).
- [ ] **Calendario**: carga los eventos que vinieron en el respaldo.
- [ ] **Puente MIDAGRI**: `http://localhost:8080/health` responde `"ok": true` y la ventana de ngrok está en `online`.
- [ ] Las filas de las tablas coinciden con `MANIFIESTO.md`.

Para la presentación: valida todo una vez, y después **graba el video
haciéndolo otra vez desde cero**, siguiendo este manual paso a paso.

## Limitaciones conocidas (no son errores tuyos)

1. **El puente MIDAGRI corre en una computadora, no en la nube.** Desde el
   07/11 su código está en el repositorio y se restaura con el paso 5.3,
   pero tiene que estar encendido (con su ventana de ngrok) para que WF1
   traiga precios nuevos y WF4 actualice el calendario. Con el puente
   apagado, la app funciona igual con los datos restaurados.
2. **Lo que no viaja en el respaldo:** claves y contraseñas (se crean de
   nuevo en el paso 2), usuarios de n8n e historial de ejecuciones.
3. **Plan gratuito de Render:** n8n tiene 512 MB de RAM y se duerme tras un
   rato sin uso; la primera llamada puede tardar ~1 minuto.

## Si el equipo elige otra nube (por ejemplo, Azure)

Solo cambian los pasos 5.1 y 7: crea un PostgreSQL que permita las
extensiones de `bd/extensiones.txt` (al 06/11: `vector` y `unaccent`), un
contenedor con la misma imagen de n8n y un hosting
estático para Vite. El script `restaurar-bd.sh` y los pasos 6, 8 y 9 son
idénticos: solo necesitan la cadena de conexión de la base nueva.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `restaurar-bd.sh`: "connection refused" o "timeout" | Tu IP no está en Access Control de la base (paso 5.2.1) |
| `pg_restore: unsupported version` | Tu `pg_restore` no es la versión 18 |
| `type "vector" does not exist` o `function unaccent(text) does not exist` | Falta una extensión: el script crea las de `bd/extensiones.txt`, pero el proveedor debe permitirlas |
| n8n se reinicia solo en Render | Falta de memoria del plan gratuito (512 MB) |
| Al importar un workflow, nodos con "?" o "Install this node" | La versión de n8n es más antigua que la de producción: revisa la imagen en `render.yaml` |
| Un nodo de n8n sale en rojo al importar | La credencial no tiene exactamente el nombre de la tabla del paso 6 |
| El shell muestra un módulo en blanco | La `VITE_*_REMOTE_URL` de ese módulo está mal o el microfrontend no terminó de desplegar |
