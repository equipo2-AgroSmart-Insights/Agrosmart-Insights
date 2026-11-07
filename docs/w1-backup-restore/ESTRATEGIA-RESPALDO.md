# Estrategia de respaldo y restauración — AgroSmart Insights (W1)

Propuesta del rol DevSecOps para aprobar en la reunión de equipo del
06/11/2026. Lo marcado con ☐ lo decide el equipo.

## Objetivo

Que una persona que no participó en el proyecto pueda reconstruirlo
completo, **en cuentas nuevas y propias**, usando solo el respaldo y el
[manual de restauración](MANUAL-RESTAURACION.md). Si no se puede restaurar
siguiendo el manual, el respaldo no sirve.

## Qué se respalda

| Componente | Cómo | Dónde queda en el respaldo |
|---|---|---|
| Código fuente (frontend, scripts, migraciones, CI/CD) | Copia del commit respaldado | `codigo/` |
| Datos de la aplicación (precios, clima, productos, alertas, calendario, documentos del chat) | `pg_dump` de todas las tablas de `public` que no son internas de n8n; se detectan solas en cada respaldo | `bd/` |
| Funciones y vistas creadas a mano (ej. `resolver_producto_mmf2`, que usan WF0 y WF1) | Definiciones exportadas de la base | `bd/funciones.sql`, `bd/vistas.sql` |
| Workflows de n8n (7) | JSON versionados en git | `n8n/` |
| Infraestructura como código | `render.yaml` (base + n8n) y `vercel.json` de cada frontend | Dentro de `codigo/` |
| Procedimiento | Manual + manifiesto con filas por tabla | Raíz del paquete |

**Qué no se respalda, a propósito:**

| Qué | Por qué | Cómo se recupera |
|---|---|---|
| Claves y contraseñas | No deben viajar en un respaldo | Se crean de nuevo (manual, paso 2) |
| Tablas internas de n8n (usuarios, credenciales, historial de ejecuciones) | Datos personales y secretos que no hacen falta para restaurar | Los workflows se importan desde git |
| Puente MIDAGRI en ejecución (WF0, WF1, WF4) | Corre en una computadora, no en la nube; su código sí viaja en `codigo/` (`src/midagri-bridge/`, desde el 07/11) | Se levanta con el paso 5.3 del manual (Python + ngrok) |

## Frecuencia, retención y almacenamiento

- **Automático:** cada lunes 03:00 (hora de Lima), workflow `respaldo-proyecto.yml`.
- **Manual:** antes de cada entrega o cambio grande (Actions → Respaldo del proyecto → Run workflow).
- **Retención:** 30 días en GitHub (4 respaldos semanales).
- **Copia fuera de GitHub:** el último respaldo antes de cada entrega se guarda en ☐ OneDrive del líder DevSecOps ☐ Drive del equipo. Va cifrado, así que puede guardarse en la nube.

## Seguridad

- Paquete `.7z` cifrado con AES-256, nombres de archivo incluidos.
- La frase (`BACKUP_PASSPHRASE`) es un secret de GitHub. La custodia el líder DevSecOps y se entrega **solo por canal privado** a quien vaya a restaurar.
- Minimización: solo se respalda lo necesario para reconstruir.

## Verificación

Un respaldo que nunca se restauró no está probado. Por eso:

1. **Cada respaldo** se restaura solo en una base vacía y se comprueba que: las filas de cada tabla coincidan con las del origen, estén todas las funciones y vistas, no se haya colado ninguna tabla interna de n8n y el cálculo de alertas responda sobre los datos restaurados. Si algo no coincide, se abre un Issue `backup-failure`. Si aparece una tabla nueva o desaparece una conocida, el respaldo la incluye igual y avisa.
2. **Cada cambio** a los scripts de respaldo se prueba en su PR con una base sintética.
3. **La restauración completa** (nube nueva + manual) la ejecuta el QA, como se describe abajo.

## Objetivos de recuperación

| Métrica | Valor | Nota |
|---|---|---|
| Pérdida máxima de datos (RPO) | 7 días | Precios y clima se pueden volver a cargar desde las fuentes públicas (MIDAGRI, Open-Meteo) con WF0/WF1, mientras el puente MIDAGRI esté encendido. |
| Tiempo de restauración (RTO) | 2 a 3 horas | Siguiendo el manual. La mayor parte es crear cuentas y esperar despliegues. |

## Dónde se restaura

☐ **Mismos proveedores, cuentas nuevas** (GitHub + Render + Vercel) — *recomendado*:
`render.yaml` crea la base y n8n automáticamente (Blueprint), es gratuito y
es lo que el manual describe paso a paso.

☐ **Otra nube** (por ejemplo, Azure): solo cambian los pasos 5.1 y 7 del
manual; hay que escribirlos antes de que el QA restaure.

## Costos

| Servicio | Costo |
|---|---|
| GitHub, Render (plan free), Vercel (Hobby), Langfuse, Jina, Copernicus, MapTiler | Gratis en su plan básico |
| OpenRouter: `inclusionai/ling-3.0-flash` y `qwen/qwen3.6-plus` (chat) | **De pago**: US$ 0.021–0.325 por millón de tokens de entrada; exige cargar crédito |

Decisión: ☐ cargar crédito en OpenRouter ☐ restaurar con modelos `:free` (las respuestas del chat pueden variar).

## Roles (según lo indicado por el asesor, 03/11)

| Rol | Responsabilidad en W1 |
|---|---|
| DevSecOps (DevOps) | Respaldo automático y cifrado, manual de restauración, esta estrategia, entregar el respaldo y la frase al QA |
| Arquitecto | Revisar que el manual sea coherente con la arquitectura documentada |
| Técnico (Backend/IA) | Puente MIDAGRI versionado (#191, 07/11); rotar su token; decidir qué modelos usar si no se paga |
| QA | Restaurar **solo con el manual**, en cuentas propias; validar en privado y luego grabar el video haciéndolo desde cero. Reportar cada paso que no funcionó tal como está escrito. |

Quien restaura no debe ser quien escribió el manual: si lo hace el mismo
autor, completa sin darse cuenta lo que el manual no dice.

## Riesgos conocidos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El puente MIDAGRI corre en una computadora (no en la nube) | Si está apagado, la ingesta diaria y el calendario no traen datos nuevos | Código versionado desde el 07/11 (#191) y paso 5.3 del manual. Mejora a futuro: desplegarlo en la nube junto a n8n. |
| Versión de n8n en `render.yaml` distinta de producción | Los workflows no se importan bien | Corregido en el PR #178. Regla: todo cambio de versión en Render se refleja en `render.yaml`. |
| Al sincronizar el Blueprint, la base queda sin acceso externo (`ipAllowList: []`) | Fallan respaldo, migraciones y evaluaciones | Volver a habilitar el acceso en Render → Networking tras cada sincronización. ☐ Declararlo en `render.yaml`. |
| Plan gratuito de Render (512 MB) | n8n se reinicia si consume de más | No subir de versión de n8n sin medir memoria. |

## Entrega al QA

- [ ] Último respaldo en verde descargado (`.7z` + `.sha256`) y copia guardada fuera de GitHub.
- [ ] Frase entregada por canal privado.
- [ ] Enlace al manual y a esta estrategia.
- [ ] Decisiones de esta página marcadas (nube y costos).
- [ ] Fecha de la prueba privada del QA y fecha de grabación del video.
