<img src="media/media/image1.png"
style="width:5.90556in;height:1.63333in" />

**ESCUELA PROFESIONAL DE INGENIERÍA DE COMPUTACIÓN Y SISTEMAS**   \
   \
 

**PROYECTO:**   \
AGROSMART INSIGHTS – OPTIMIZACIÓN DE MERCADOS Y PRECIOS AGRÍCOLAS   \
   \
**CURSO:**   \
TALLER DE PROYECTOS   \
   \
**PROFESOR:**   \
ING. NORMA VIRGINIA LEÓN LESCANO   \
**Marco de documentación:** arc42

   \
**INTEGRANTE:**   \
Cristhian Raul Pimentel Tovar   \
Arquitecto de Software   \
   \
**FECHA: **26/10/2026   \
   \
**LIMA – PERÚ**

1.  **Introducción y objetivos**

    1.  **Propósito del documento**

El propósito de este informe es para poder documentar la arquitectura de
software de AgroSmart Insights utilizando la estructura de arc42.

Se escribirá sobre los objetivos del sistema, restricciones, el contexto
de negocio y técnico, tecnologías usadas, componentes, el flujo de
ejecución, el despliegue, las decisiones de la arquitectura, requisitos
de calidad y principales riesgos que se fueron encontrando durante el
desarrollo del software.

También proporcionara una visión general del sistema, para así poder
facilitar la comprensión de las decisiones técnicas que se fueron
tomando para el desarrollo, las pruebas, el mantenimiento y la como fue
evolucionando la solución planteada.

2.  **Descripción general del sistema**

    La plataforma AgroSmart Insights es una inteligencia agrícola que
    proporciona y utiliza datos de precios de los productos, información
    meteorológica y documentos para poder proporcionar consultas
    informativas y análisis para la toma de decisiones.

    Nuestra solución combina una interfaz web, flujos automatizados de
    ingesta de datos, servicios de inteligencia artificial y una base de
    datos con la capacidad de búsqueda vectorial. El propósito de la
    interfaz web es facilitar el acceso a la información agrícola
    proporcionada por MIGRADI.

    Esta plataforma posee módulos funcionales relacionados con el
    monitoreo, las consultas en lenguaje natural (NLQ), el análisis del
    mercado comparativo.

    La información se procesa mediante workflows de n8n, que coordinan
    la adquisición de datos, el almacenamiento y la atención de
    consultas.

3.  **Requisitos funcionales**

| **N °** | **Requisitos funcionales** | **Descripción** |
|:--:|:--:|:--:|
| RF-01 | Consulta de lenguaje natural | Permite que el usuario formule preguntas sobre precios, periodos y condiciones agrícolas |
| RF-03 | Consulta de precios | Proporcionar información sobre los precios almacenados y responder preguntas sobre valores específicos e históricos |
| RF-04 | Análisis predictivos | procesar consultas relacionadas con las tendencias, posibles escenarios futuros, según las capacidades desarrolladas |
| RF-05 | Información meteorológica | Integrar datos para proporcionar contexto sobre las condiciones climáticas |
| RF-06 | Ingesta automatizada | Ejecutar procesos programados para obtener datos y poder transformarlo y almacenarlos |
| RF-07 | Monitoreo | Presentar información visual relevante para observar las condiciones del dominio |
| RF-08 | Análisis de mercados | Facilita la consulta y el análisis de precios y las tendencias del producto |
| RF-09 | Recuperación de conocimientos | **Co**nsultar documentos, mediante técnicas de recuperación de información y la búsqueda vectorial |

**1.4. Objetivos de calidad**

El sistema busca alcanzar los siguientes objetivos de calidad:

- **Precisión:** proporcionar respuestas numéricas que coincidan con los
  valores de referencia de los datos agrícolas.

- **Rendimiento:** mantener tiempos de respuesta adecuados para las
  consultas interactivas.

- **Trazabilidad:** registrar información suficiente para analizar el
  comportamiento de las consultas y detectar errores.

- **Mantenibilidad:** separar responsabilidades entre la interfaz, la
  automatización, el almacenamiento y los servicios de IA.

- **Escalabilidad:** permitir que los componentes puedan evolucionar sin
  necesidad de reconstruir toda la solución.

- **Seguridad:** proteger credenciales, conexiones, endpoints y datos de
  acceso.

- **Eficiencia económica:** controlar el consumo de tokens, las llamadas
  a APIs y los recursos de infraestructura.

- **Disponibilidad de información:** automatizar la actualización de los
  datos cuando las fuentes y la infraestructura lo permitan.

**Metas de calidad del Sprint 2**

Se han definido los siguientes objetivos para evaluar el comportamiento
de las consultas:

| **Indicador** | **Meta planteada** | **Método de evaluación** |
|:---|:---|:---|
| Precisión numérica | 100 % en el conjunto de referencia de 50 preguntas | Comparar las respuestas con los valores de Ground Truth de PostgreSQL. |
| Latencia p95 | Menor de 4 segundos | Medir el percentil 95 de los tiempos de respuesta. |
| Consumo de tokens | Medición del promedio por interacción | Registrar el consumo por consulta y analizar su evolución. |
| Trazabilidad | Registrar las interacciones evaluadas | Verificar la disponibilidad de los registros y métricas en Langfuse. |

Estas metas constituyen criterios de evaluación del proyecto; no deben
interpretarse como resultados ya alcanzados sin disponer de las pruebas
correspondientes. La latencia también debe medirse bajo condiciones
documentadas y con una definición clara de qué etapas incluye.

**1.5. Stakeholders**

Los principales interesados en el sistema son:

<table>
<colgroup>
<col style="width: 40%" />
<col style="width: 59%" />
</colgroup>
<thead>
<tr>
<th><blockquote>
<p><strong>Stakeholder</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>Interés principal</strong></p>
</blockquote></th>
</tr>
</thead>
<tbody>
<tr>
<td><blockquote>
<p>Usuarios de la plataforma</p>
</blockquote></td>
<td><blockquote>
<p>Consultar información agrícola de forma sencilla y obtener respuestas
útiles.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Equipo de desarrollo</p>
</blockquote></td>
<td><blockquote>
<p>Implementar, mantener y ampliar los módulos funcionales.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Arquitectura de Software</p>
</blockquote></td>
<td><blockquote>
<p>Garantizar coherencia arquitectónica, documentar decisiones y
controlar las dependencias técnicas.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>QA y pruebas</p>
</blockquote></td>
<td><blockquote>
<p>Validar requisitos, precisión numérica, latencia y comportamiento
ante errores.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Responsable de infraestructura y despliegue</p>
</blockquote></td>
<td><blockquote>
<p>Mantener configuraciones, servicios, conexiones y procesos de
publicación.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Docente evaluador</p>
</blockquote></td>
<td><blockquote>
<p>Verificar que el diseño, las decisiones y los resultados técnicos
estén justificados.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Proveedores de datos y servicios externos</p>
</blockquote></td>
<td><blockquote>
<p>Proporcionar información agrícola, meteorológica, modelos y servicios
de infraestructura.</p>
</blockquote></td>
</tr>
</tbody>
</table>

**2. Restricciones**

**2.1. Restricciones técnicas**

La arquitectura se encuentra condicionada por las tecnologías y los
servicios utilizados durante el desarrollo:

1.  **Frontend:** React y Vite para la construcción de la aplicación
    web.

2.  **Automatización:** n8n para orquestar los procesos de ingesta y las
    consultas.

3.  **Almacenamiento:** PostgreSQL con pgvector para los datos
    estructurados y la recuperación vectorial.

4.  **Infraestructura cloud:** Vercel para el frontend y Render para los
    servicios y la base de datos previstos en el despliegue.

5.  **Fuentes de datos:** MIDAGRI para información agrícola y Open-Meteo
    para datos meteorológicos.

6.  **Inteligencia artificial:** integración con proveedores y modelos
    externos, entre ellos Gemini, Grok y servicios conectados mediante
    OpenRouter.

7.  **Observabilidad:** Langfuse como plataforma de seguimiento de las
    interacciones con modelos de IA.

8.  **Control de versiones:** Git y GitHub para gestionar el código
    fuente y la colaboración.

La disponibilidad efectiva de cada integración debe verificarse en la
configuración vigente del repositorio y de los servicios desplegados.

**2.2. Restricciones de infraestructura**

Durante el desarrollo se identificaron dificultades para ejecutar la
ingesta de documentos de MIDAGRI desde un entorno completamente alojado
en la nube.

Como respuesta, se trabajó con una arquitectura híbrida temporal:
algunos procesos de ingesta se ejecutan en una instancia local de n8n,
mientras que PostgreSQL puede permanecer alojado en Render y recibir los
datos mediante una conexión externa.

Esta decisión introduce dependencias respecto al equipo local, la
conectividad, las credenciales y la disponibilidad del proceso de
ejecución.

También se evaluó la ejecución completamente local para las pruebas de
desarrollo. En ese escenario, Docker Compose permite levantar los
servicios necesarios en el equipo del desarrollador sin depender de
Render para cada prueba.

Estos escenarios corresponden a distintos modos de operación y deben
documentarse por separado para evitar confundir el entorno local de
pruebas con el despliegue de referencia.

**2.3. Restricciones económicas**

El proyecto depende de servicios que pueden tener límites de uso o
costes asociados, como proveedores de modelos de lenguaje, APIs
externas, alojamiento cloud y almacenamiento.

Por ello, la arquitectura debe considerar:

- El consumo de tokens por consulta.

- El número de llamadas a proveedores externos.

- El tamaño de los documentos procesados.

- El almacenamiento y la recuperación de vectores.

- Los recursos asignados a los servicios de n8n y PostgreSQL.

- El volumen de registros generados por la observabilidad.

La optimización debe considerar el coste total del flujo y no solamente
el precio de cada modelo.

**2.4. Restricciones organizativas y académicas**

El desarrollo se realiza en el contexto de un proyecto universitario con
entregables por sprint, historias de usuario y revisiones docentes.

Las decisiones arquitectónicas deben ser explicables y estar vinculadas
con los requisitos del proyecto. La incorporación de nuevas tecnologías
debe justificarse por su utilidad, complejidad y coste de mantenimiento.

Se considera relevante documentar las decisiones mediante ADRs y
mantener una separación clara entre desarrollo, pruebas y despliegue.

**2.5. Restricciones legales y de seguridad**

No se dispone de evidencia suficiente para afirmar que el proyecto esté
sujeto a una certificación específica o que haya completado una
auditoría formal de cumplimiento normativo.

Sin embargo, deben contemplarse las buenas prácticas de protección de
datos y seguridad aplicables al entorno de uso:

- No exponer claves de APIs ni credenciales de bases de datos en el
  código fuente.

- Gestionar secretos mediante variables de entorno o mecanismos seguros
  del proveedor.

- Limitar el acceso a endpoints y servicios administrativos.

- Validar las entradas recibidas por los webhooks.

- Proteger las conexiones externas a PostgreSQL.

- Revisar las políticas de retención de los registros enviados a
  herramientas de observabilidad.

- Verificar los términos de uso de las APIs y las fuentes de datos
  externas.

**3. Context & Scope — Contexto y alcance**

**3.1. Contexto de negocio**

La información agrícola se distribuye entre boletines, bases de datos y
servicios meteorológicos. Consultar y relacionar estos datos manualmente
puede dificultar la obtención de información oportuna para analizar
precios y condiciones del mercado.

AgroSmart Insights busca reducir esa fragmentación mediante una interfaz
que permite formular consultas y obtener respuestas apoyadas en
información almacenada y servicios externos.

La plataforma no reemplaza las fuentes oficiales ni garantiza por sí
misma que una predicción sea correcta. Su utilidad depende de la
actualización de los datos, la calidad del procesamiento y la validación
de las respuestas.

**3.2. Contexto técnico**

El sistema se relaciona con los siguientes actores y servicios externos:

- Usuarios que interactúan con la aplicación web.

- MIDAGRI, como fuente de información agrícola y boletines de precios.

- Open-Meteo, como proveedor de información meteorológica.

- Proveedores de modelos de lenguaje y servicios de IA.

- OpenRouter, utilizado como punto de integración con modelos
  disponibles mediante su API.

- Langfuse, para la observabilidad de las interacciones con modelos.

- Vercel y Render, para el alojamiento de los componentes
  correspondientes.

**3.3. Alcance del sistema**

El alcance comprende:

- Aplicación web y sus módulos funcionales.

- Automatización de la ingesta y procesamiento de datos.

- API de consulta y clasificación de preguntas.

- Recuperación de información desde PostgreSQL y pgvector.

- Integración con modelos de IA.

- Integración con fuentes meteorológicas y agrícolas.

- Registro de métricas y evaluación de calidad.

- Infraestructura necesaria para ejecutar los componentes.

Quedan fuera del alcance garantizado aquellas capacidades que no estén
implementadas o verificadas, como una predicción de precisión
certificada, una disponibilidad contractual del 99,9 %, un sistema
formal de autenticación empresarial o un calendario alimentado
automáticamente por fuentes que todavía no hayan sido integradas.

**4. Estrategia de solución**

**4.1. Estrategia arquitectónica general**

La solución utiliza una arquitectura distribuida e híbrida que separa la
interfaz web, la orquestación de procesos, el almacenamiento y los
servicios externos de inteligencia artificial.

La elección responde a la necesidad de integrar fuentes heterogéneas,
automatizar tareas periódicas y permitir que la interfaz consuma
servicios de procesamiento sin concentrar toda la lógica en el frontend.

La arquitectura puede describirse como una combinación de:

- Aplicación web basada en componentes.

- Módulos funcionales en el frontend.

- Workflows de automatización.

- Persistencia relacional y recuperación vectorial.

- Integraciones mediante APIs.

- Observabilidad especializada para modelos de IA.

La organización modular del frontend no implica necesariamente que cada
módulo sea un microfrontend desplegado de forma independiente. De igual
manera, dividir los workflows de n8n no significa automáticamente que
cada uno constituya un microservicio independiente.

**4.2. Tecnologías seleccionadas**

<table>
<colgroup>
<col style="width: 30%" />
<col style="width: 69%" />
</colgroup>
<thead>
<tr>
<th><blockquote>
<p><strong>Tecnología</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>Responsabilidad arquitectónica</strong></p>
</blockquote></th>
</tr>
</thead>
<tbody>
<tr>
<td><blockquote>
<p>React</p>
</blockquote></td>
<td><blockquote>
<p>Construcción de la interfaz de usuario.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Vite</p>
</blockquote></td>
<td><blockquote>
<p>Desarrollo y compilación del frontend.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>n8n</p>
</blockquote></td>
<td><blockquote>
<p>Orquestación de ingesta, clasificación y procesamiento de
consultas.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>PostgreSQL</p>
</blockquote></td>
<td><blockquote>
<p>Almacenamiento persistente de información estructurada.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>pgvector</p>
</blockquote></td>
<td><blockquote>
<p>Almacenamiento y recuperación de representaciones vectoriales.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>MIDAGRI</p>
</blockquote></td>
<td><blockquote>
<p>Fuente de datos agrícolas y boletines de precios.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Open-Meteo</p>
</blockquote></td>
<td><blockquote>
<p>Fuente de información meteorológica.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Gemini y Grok</p>
</blockquote></td>
<td><blockquote>
<p>Integraciones con proveedores de IA mencionados durante el
desarrollo; la función y ruta activas deben verificarse.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>OpenRouter</p>
</blockquote></td>
<td><blockquote>
<p>Acceso a modelos a través de una API unificada, cuando está
configurado en el flujo.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Jina Embeddings v3</p>
</blockquote></td>
<td><blockquote>
<p>Modelo de embeddings mencionado en la actualización más reciente para
representar semánticamente el contenido.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Langfuse</p>
</blockquote></td>
<td><blockquote>
<p>Seguimiento y análisis de interacciones con modelos de IA.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Docker Compose</p>
</blockquote></td>
<td><blockquote>
<p>Ejecución coordinada de servicios locales durante el desarrollo.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>GitHub</p>
</blockquote></td>
<td><blockquote>
<p>Control de versiones, colaboración y gestión del código.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Vercel</p>
</blockquote></td>
<td><blockquote>
<p>Alojamiento previsto para el frontend.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Render</p>
</blockquote></td>
<td><blockquote>
<p>Alojamiento previsto para servicios y base de datos cloud.</p>
</blockquote></td>
</tr>
</tbody>
</table>

La lista refleja las tecnologías identificadas en el proceso. La versión
exacta de cada dependencia, su estado de producción y la configuración
efectiva deben confirmarse en los archivos y servicios actuales.

**4.3. Estrategia de ingesta de datos**

Se separan los procesos de ingesta de conocimiento documental y de
actualización de datos operativos.

**WF0 — Ingesta de conocimiento para RAG**

Está orientado a incorporar documentos de referencia, especialmente
boletines y materiales agrícolas, para habilitar su recuperación durante
las consultas. El proceso debe contemplar extracción, transformación,
generación de embeddings y persistencia de la información procesada.

**WF1 — Ingesta diaria de precios y clima**

Está orientado a actualizar datos agrícolas y meteorológicos mediante
procesos programados. Se ha trabajado con consultas a MIDAGRI y
Open-Meteo, verificación de fechas y procesamiento por lotes de regiones
meteorológicas.

**WF2 — API de chat, mercados y análisis predictivo**

Es el flujo central de atención de consultas (`POST /webhook/v1/query`). Recibe las solicitudes de los microfrontends de Chat NLQ, Mercados MIDAGRI y el respaldo agroclimático de Monitoreo, clasifica la intención, ejecuta las ramas correspondientes, consulta datos y herramientas y devuelve una respuesta.

**WF3 — Servicio de monitoreo satelital NDVI**

Gestiona la consulta de capas espectrales raster NDVI obtenidas desde Copernicus Sentinel-2 (CDSE) mediante `POST /webhook/v1/satelital/ndvi` para el microfrontend de Monitoreo Satelital.

**WF4 — API de calendario agrícola MIDAGRI**

Expone el endpoint `GET /webhook/v1/calendario` para filtrar y consultar ferias, eventos y campañas agrícolas por rango de fechas, departamento, modalidad y entidad organizadora desde el microfrontend de Calendario Agrícola.

**WF5 — Motor y API de alertas de riesgo agrícola**

Combina una ejecución programada (Cron lunes a sábado a las 14:00 `America/Lima`) que evalúa reglas configurables en PostgreSQL (`alertas_riesgo_evaluar`) con el webhook `POST /webhook/v1/alertas` para listar alertas, consultar su evidencia histórica y actualizar su estado (`pending`, `read`, `attended`) desde el microfrontend de Alertas de Riesgo.

La separación permite actualizar la información con independencia de las
consultas interactivas y facilita identificar en qué etapa se produce un
error.

**4.4. Estrategia de observabilidad**

Langfuse se considera el componente principal de observabilidad para las
interacciones de IA. Su función es permitir el análisis de las
consultas, los modelos empleados, las latencias y el consumo de tokens,
en la medida en que la instrumentación y los datos disponibles lo
permitan.

Durante el proceso se evaluó Arize Phoenix, pero la decisión posterior
fue retirarlo y mantener Langfuse como plataforma de observabilidad,
evitando mantener dos herramientas para una misma finalidad sin una
justificación suficiente.

**4.5. Organización del desarrollo**

La arquitectura debe coordinarse con las responsabilidades de frontend,
backend, automatización y QA.

El rol de Arquitectura de Software se centra en:

- Mantener la visión general de los componentes.

- Documentar las decisiones y sus consecuencias.

- Revisar las dependencias y los contratos de comunicación.

- Asegurar que los requisitos de calidad se traduzcan en mediciones.

- Coordinar la integración entre módulos.

- Identificar riesgos técnicos antes de que se conviertan en problemas
  de implementación.

Las pruebas funcionales, la revisión del código y las validaciones de
seguridad deben integrarse al flujo de trabajo del repositorio.

**5. Building Block View — Vista de bloques de construcción**

**5.1. Nivel 1: bloques principales**

El primer nivel presenta los grandes componentes de la solución.

<table style="width:99%;">
<colgroup>
<col style="width: 38%" />
<col style="width: 61%" />
</colgroup>
<thead>
<tr>
<th><blockquote>
<p><strong>Bloque</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>Responsabilidad</strong></p>
</blockquote></th>
</tr>
</thead>
<tbody>
<tr>
<td><blockquote>
<p>Frontend web</p>
</blockquote></td>
<td><blockquote>
<p>Interfaz que recibe preguntas y presenta resultados.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Capa de API y automatización</p>
</blockquote></td>
<td><blockquote>
<p>Gestiona las solicitudes y coordina la ejecución de los procesos.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Ingesta de datos</p>
</blockquote></td>
<td><blockquote>
<p>Obtiene y prepara información agrícola y meteorológica.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Persistencia</p>
</blockquote></td>
<td><blockquote>
<p>Almacena precios, documentos y representaciones vectoriales.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Servicios de IA</p>
</blockquote></td>
<td><blockquote>
<p>Clasifican preguntas y generan respuestas mediante modelos
externos.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Observabilidad</p>
</blockquote></td>
<td><blockquote>
<p>Registra información para analizar latencia, tokens y calidad.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>Infraestructura</p>
</blockquote></td>
<td><blockquote>
<p>Proporciona los entornos de ejecución y comunicación entre
componentes.</p>
</blockquote></td>
</tr>
</tbody>
</table>

**5.2. Nivel 2: componentes internos**

**5.2.1. Frontend (Arquitectura de Microfrontends con Module Federation)**

El frontend está construido con React 19, Vite 8 y `@originjs/vite-plugin-federation`. Consta de una aplicación contenedora (**Shell**: `src/frontend/agrosmart-frontend`) que orquesta y aísla mediante `MicrofrontendErrorBoundary` cinco microfrontends independientes desplegados en Vercel:

1.  **Chat NLQ (`chat-microfrontend`):** interfaz para consultas en lenguaje natural sobre precios, tendencias y boletines RAG, conectada a **WF2** (`POST /webhook/v1/query`).

2.  **Mercados MIDAGRI (`mercados-microfrontend`):** comparativa analítica e histórica entre GMML y MMF2 con validación de homologación por ID maestro y unidades equivalentes, conectada a **WF2** (`POST /webhook/v1/query`, `action: "get_market_prices"`).

3.  **Monitoreo Satelital (`monitoreo-microfrontend`):** visor cartográfico e indicadores agroclimáticos (sequía, humedad y vigor vegetativo NDVI), conectado a **WF3** (`POST /webhook/v1/satelital/ndvi`), **WF2** (`analisis_satelital_riesgo`), **Open-Meteo** y **MapTiler**.

4.  **Alertas de Riesgo (`alertas-microfrontend`):** panel de monitoreo de alertas por caída de volumen ingresado o anomalías climáticas, con consulta de evidencia histórica y gestión de estados (`Pendiente`, `Leída`, `Atendida`), conectado a **WF5** (`POST /webhook/v1/alertas`).

5.  **Calendario Agrícola (`calendario-microfrontend`):** calendario mensual e interactivo de ferias, campañas y eventos oficiales de MIDAGRI con filtros por departamento, modalidad, entidad y búsqueda textual, conectado a **WF4** (`GET /webhook/v1/calendario`).

> La comunicación entre cada microfrontend y n8n se realiza mediante solicitudes HTTP configuradas por variables de entorno (`VITE_N8N_WEBHOOK_URL`, `VITE_WF3_NDVI_URL`, `VITE_ALERTS_WEBHOOK_URL` y `VITE_CALENDARIO_API_URL`), mientras que el Shell resuelve las URLs remotas (`VITE_*_REMOTE_URL`) de cada `remoteEntry.js`.

**5.2.2. WF0: ingesta de conocimiento documental**

Responsabilidades principales:

- Obtener documentos de referencia.

- Procesar el contenido textual.

- Preparar los fragmentos documentales.

- Generar embeddings mediante el modelo configurado.

- Guardar la información necesaria para su recuperación posterior.

El almacenamiento vectorial se ha asociado con PostgreSQL y pgvector. La
tabla documentos_rag fue identificada como parte del diseño de
recuperación de conocimiento.

**5.2.3. WF1: ingesta diaria de precios y clima**

Responsabilidades principales:

- Ejecutar tareas de actualización programadas.

- Comprobar las fechas de los datos disponibles.

- Obtener información agrícola desde las fuentes configuradas.

- Consultar datos meteorológicos para las regiones contempladas.

- Procesar la información por lotes.

- Persistir los resultados en PostgreSQL.

Se trabajó con un esquema de ejecución de lunes a viernes en varias
horas del día y con la consulta de 14 regiones meteorológicas,
procesadas en lotes de cinco, cinco y cuatro regiones. Estos valores
corresponden al diseño de ingesta trabajado y deben cotejarse con el
workflow activo.

**5.2.4. WF2: API de chat y análisis predictivo**

WF2 es el componente central de procesamiento interactivo.

Entre sus responsabilidades se encuentran:

- Recibir solicitudes mediante un webhook HTTP.

- Validar la existencia de body.session_id.

- Clasificar la intención de la consulta.

- Seleccionar una rama de procesamiento.

- Consultar datos estructurados o documentos recuperados.

- Invocar las herramientas y los modelos configurados.

- Construir y devolver una respuesta.

- Registrar métricas de observabilidad cuando la instrumentación está
  activa.

Se identificó que el webhook utiliza el método POST y la ruta v1/query.
El flujo contempla una respuesta de error cuando falta el identificador
de sesión, con el mensaje Sesión inválida o ausente y código 401. La
semántica exacta del código y la validación de sesiones deben revisarse
con la implementación vigente.

La clasificación de consultas distingue las siguientes categorías:

<table>
<colgroup>
<col style="width: 41%" />
<col style="width: 58%" />
</colgroup>
<thead>
<tr>
<th><blockquote>
<p><strong>Tipo</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>Propósito</strong></p>
</blockquote></th>
</tr>
</thead>
<tbody>
<tr>
<td><blockquote>
<p>precio_puntual</p>
</blockquote></td>
<td><blockquote>
<p>Consulta de precios específicos.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>tendencia_prediccion</p>
</blockquote></td>
<td><blockquote>
<p>Consultas sobre tendencias o escenarios futuros.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>clima</p>
</blockquote></td>
<td><blockquote>
<p>Preguntas relacionadas con condiciones meteorológicas.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>analisis_satelital_riesgo</p>
</blockquote></td>
<td><blockquote>
<p>Consultas explícitas sobre mapas, imágenes satelitales o análisis
espacial.</p>
</blockquote></td>
</tr>
<tr>
<td><blockquote>
<p>general</p>
</blockquote></td>
<td><blockquote>
<p>Preguntas que no corresponden a las categorías anteriores.</p>
</blockquote></td>
</tr>
</tbody>
</table>

También se contemplan valores de período como hoy, historico, futuro o
null, junto con atributos como producto y lugar.

La clasificación determina qué herramientas o ramas se ejecutan. Esto
permite evitar que todas las preguntas se procesen mediante un único
camino indiferenciado.

**5.2.5. PostgreSQL y pgvector**

La base de datos proporciona persistencia para los datos estructurados y
los documentos empleados en la recuperación de conocimiento.

Las tablas relacionadas con precios, como precios_diarios, forman parte
del contexto de evaluación numérica. La tabla documentos_rag se ha
identificado para la recuperación de documentos.

Las responsabilidades de almacenamiento deben mantenerse separadas
conceptualmente:

- Datos estructurados para consultas numéricas y filtros.

- Documentos y metadatos para el conocimiento documental.

- Embeddings para recuperación semántica.

- Registros de evaluación para comparar respuestas contra datos de
  referencia, cuando se implementen.

El uso de pgvector permite almacenar y consultar vectores dentro de
PostgreSQL, evitando introducir necesariamente una base de datos
vectorial separada.

**5.2.6. Servicios de inteligencia artificial**

La arquitectura contempla modelos para interpretar preguntas y generar
respuestas, así como un modelo de embeddings para la recuperación
semántica.

Se ha trabajado con integraciones relacionadas con Gemini, Grok, Hugging
Face y OpenRouter. En las actualizaciones más recientes se mencionó Jina
Embeddings v3 para embeddings y un modelo denominado por el usuario como
“Link 3.0 Flash” conectado mediante OpenRouter.

Dado que los proveedores y modelos han cambiado durante el desarrollo,
la configuración exacta de cada nodo debe verificarse antes de fijar sus
nombres y responsabilidades definitivas en la documentación de
producción.

Es importante distinguir dos funciones diferentes:

- **Modelo de lenguaje:** interpreta instrucciones, clasifica o genera
  texto.

- **Modelo de embeddings:** transforma textos en vectores que permiten
  recuperar información semánticamente relacionada.

Cambiar el modelo de embeddings no determina automáticamente el número
de tokens de contexto del modelo de lenguaje. El límite de contexto
depende del modelo de lenguaje configurado.

**5.3. Nivel 3: implementación y repositorio**

El código se mantiene en el repositorio de GitHub del proyecto. La
estructura de trabajo identificada incluye directorios de
infraestructura, documentación y código fuente, además de archivos de
configuración y scripts auxiliares.

El frontend se encuentra dentro de la estructura
src/frontend/agrosmart-frontend. La infraestructura local contempla
Docker Compose para coordinar servicios durante las pruebas.

En este nivel deben documentarse, según el estado real del repositorio:

- Archivos de configuración del frontend.

- Definición y exportación de workflows de n8n.

- Esquemas SQL y scripts de inicialización.

- Configuración de variables de entorno.

- Pruebas automatizadas.

- Scripts de evaluación de precisión y rendimiento.

- Archivos de despliegue y configuración de CI/CD.

La documentación no debe asumir que todos estos elementos se encuentran
completos o actualizados sin una revisión del código.

**6. Vista de ejecución**

Esta sección describe cómo colaboran los componentes durante las
operaciones principales del sistema.

**6.1. Flujo de consulta en lenguaje natural**

El flujo lógico de una consulta es el siguiente:

1.  El usuario formula una pregunta desde el frontend.

2.  El frontend construye una solicitud HTTP y la envía al webhook de
    WF2.

3.  WF2 valida los datos requeridos, incluido el identificador de
    sesión.

4.  El clasificador identifica el producto, el período, el lugar y el
    tipo de consulta.

5.  El flujo selecciona la rama adecuada.

6.  La rama consulta las herramientas disponibles, la base de datos o el
    sistema de recuperación documental.

7.  El modelo de lenguaje genera o estructura la respuesta utilizando la
    información recuperada.

8.  WF2 devuelve la respuesta al frontend.

9.  El usuario visualiza el resultado.

10. Cuando la instrumentación está habilitada, la interacción se
    registra para su análisis en Langfuse.

El orden exacto de las llamadas al modelo, las herramientas y la base de
datos depende de la rama del workflow.

**6.3. Flujo de ingesta documental mediante WF0**

1.  Se activa el proceso de ingesta documental.

2.  Se obtiene el documento de la fuente configurada.

3.  Se extrae y prepara el texto.

4.  Se divide el contenido en fragmentos apropiados para la
    recuperación.

5.  Se generan embeddings mediante el modelo configurado.

6.  Se almacenan los vectores, el contenido y los metadatos necesarios
    en PostgreSQL con pgvector.

7.  Los documentos quedan disponibles para las consultas de
    recuperación.

La calidad de este proceso depende de la extracción correcta del
documento, la consistencia de los metadatos y la compatibilidad entre el
modelo de embeddings utilizado para indexar y el utilizado para
consultar.

**6.4. Flujo de actualización de precios y clima mediante WF1**

1.  Se activa el workflow según el calendario configurado.

2.  Se verifica si los datos correspondientes a la fecha objetivo ya
    fueron procesados.

3.  Se consulta la fuente agrícola disponible.

4.  Se obtiene la información meteorológica para las regiones
    configuradas.

5.  Se procesan los datos y se normalizan los campos necesarios.

6.  Se insertan o actualizan los registros en PostgreSQL.

7.  Los datos actualizados quedan disponibles para WF2.

La estrategia debe considerar operaciones idempotentes, control de
duplicados y registro de errores para evitar que una ejecución repetida
genere información inconsistente.

**6.5. Manejo de errores**

Se identificaron o deben contemplarse los siguientes escenarios:

- Solicitudes sin identificador de sesión.

- Webhooks mal configurados o rutas inexistentes.

- Fallos de conectividad con proveedores externos.

- Límites de uso de las APIs.

- Errores al descargar o extraer boletines.

- Fallos de autenticación o conexión a PostgreSQL.

- Datos incompletos o fechas no disponibles.

- Respuestas de IA que no coinciden con la información de referencia.

Cada error debe disponer de un tratamiento definido: reintento cuando
corresponda, registro técnico, respuesta controlada al usuario y
mecanismos de recuperación que no dupliquen datos.

**7. Vista de despliegue**

**7.1. Arquitectura de despliegue prevista**

La arquitectura de referencia contempla la separación de la interfaz
web, la automatización y la persistencia.

- **Vercel:** alojamiento del frontend.

- **Render:** alojamiento de PostgreSQL y de los servicios cloud
  previstos.

- **n8n:** ejecución de los workflows de ingesta y consulta.

- **Servicios externos:** proveedores de IA, OpenRouter, MIDAGRI y
  Open-Meteo.

- **Langfuse:** plataforma externa de observabilidad, según la
  configuración desplegada.

La ubicación definitiva de cada workflow debe documentarse a partir de
las instancias efectivamente activas. Durante el desarrollo se han
utilizado tanto ejecuciones locales como configuraciones cloud.

**7.2. Arquitectura híbrida**

Una decisión relevante fue trabajar temporalmente con una arquitectura
híbrida para resolver las dificultades de ingesta desde el entorno
cloud.

En este esquema, WF0 y WF1 pueden ejecutarse en n8n local para acceder a
los documentos y realizar el procesamiento, mientras PostgreSQL
permanece en Render y recibe los datos mediante una conexión externa.

La ventaja es que permite continuar el desarrollo sin bloquear la
ingesta por las limitaciones del entorno cloud.

Las principales desventajas son:

- Dependencia de que el equipo local esté encendido.

- Dependencia de la conexión a Internet.

- Mayor complejidad para monitorizar ejecuciones.

- Necesidad de proteger las conexiones externas a la base de datos.

- Menor autonomía operativa respecto a un despliegue totalmente cloud.

Por tanto, la arquitectura híbrida debe entenderse como una decisión
operativa documentada, cuyo alcance exacto depende del entorno que se
encuentre activo.

**7.3. Entorno local de desarrollo**

Se ha trabajado con Docker Compose para ejecutar servicios localmente.
El entorno identificado contempla PostgreSQL con pgvector y n8n;
anteriormente también se utilizó Arize Phoenix, que posteriormente se
decidió retirar.

Durante las pruebas se identificó un error de autenticación de
PostgreSQL relacionado con el usuario postgres y la configuración de las
variables DB_POSTGRESDB\_\*. Este problema provocaba reinicios del
contenedor de n8n y hacía que la interfaz local dejara de responder.

La incidencia muestra la importancia de mantener sincronizadas las
credenciales, la configuración de los contenedores y las variables de
entorno.

**7.4. Variables de entorno y configuración**

La configuración debe separarse por entorno para evitar mezclar valores
locales con valores de producción.

Entre los elementos que deben gestionarse se encuentran:

- URL del webhook de n8n.

- Credenciales de PostgreSQL.

- Claves de los proveedores de IA.

- Configuración de OpenRouter.

- Parámetros de conexión a Langfuse.

- Direcciones de los servicios y puertos.

- Parámetros de seguridad y autenticación.

El error VITE_N8N_WEBHOOK_URL no está configurada detectado en el
frontend confirma que la configuración del entorno es un requisito
operativo importante.

Las claves y contraseñas no deben almacenarse en el repositorio ni
incorporarse a los diagramas de arquitectura.

**7.5. Consideraciones para producción**

Antes de considerar estable el despliegue, deben verificarse:

1.  La ubicación efectiva de WF0, WF1 y WF2.

2.  La conectividad entre los workflows y PostgreSQL.

3.  La protección de las conexiones externas.

4.  La disponibilidad de los endpoints requeridos.

5.  La configuración de las variables de entorno.

6.  La persistencia de los datos ante reinicios.

7.  La política de respaldos y recuperación.

8.  Los límites de recursos y el consumo de memoria.

9.  La monitorización de errores y latencias.

10. La posibilidad de desplegar y actualizar los servicios de forma
    controlada.

**8. Crosscutting Concepts — Conceptos transversales**

**8.1. Gestión de sesiones**

Las consultas de WF2 utilizan un identificador de sesión para distinguir
las interacciones y asociar el contexto correspondiente.

El flujo valida la presencia de body.session_id. La gestión de sesiones
debe garantizar que el contexto de un usuario no se mezcle con el de
otro.

Se identificó una configuración de memoria conversacional mediante una
clave de sesión. La implementación definitiva debe comprobar que la
clave se derive correctamente de la solicitud y no utilice un
identificador fijo compartido por todos los usuarios.

**8.2. Recuperación aumentada por generación (RAG)**

La recuperación aumentada por generación permite que el modelo de
lenguaje utilice información recuperada desde una base documental.

En AgroSmart Insights, el proceso combina:

1.  Preparación y fragmentación de documentos.

2.  Generación de embeddings.

3.  Almacenamiento vectorial en PostgreSQL con pgvector.

4.  Recuperación de fragmentos relevantes.

5.  Construcción del contexto para el modelo de lenguaje.

6.  Generación de la respuesta.

El objetivo es mejorar la pertinencia de las respuestas mediante
información relacionada con la consulta, sin asumir que la recuperación
elimina por completo las alucinaciones.

**8.3. Clasificación de consultas**

El clasificador permite seleccionar la rama de ejecución en función de
la intención del usuario.

La salida debe mantener una estructura predecible, con campos como
producto, período, tipo de consulta y lugar. Se ha trabajado con una
salida JSON estricta para facilitar el procesamiento posterior en n8n.

La validación debe incluir preguntas ambiguas, errores ortográficos,
entradas incompletas y consultas que no correspondan a las capacidades
disponibles.

**8.4. Integración de servicios externos**

Las APIs de proveedores externos deben tratarse como dependencias que
pueden fallar, responder lentamente o imponer límites de uso.

Se recomienda:

- Definir tiempos de espera.

- Registrar los errores relevantes.

- Limitar los reintentos.

- Evitar reintentos que dupliquen operaciones de escritura.

- Validar la estructura de las respuestas.

- Medir el coste y la latencia de cada proveedor.

- Mantener las credenciales fuera del código.

Si se utiliza OpenRouter para acceder a un modelo, la documentación debe
identificar tanto el proveedor de acceso como el modelo final invocado.
No deben confundirse ambos conceptos.

**8.5. Seguridad**

La seguridad debe aplicarse a toda la arquitectura, no solo al frontend.

Las principales áreas de control son:

- Validación de solicitudes entrantes.

- Protección de webhooks.

- Gestión de sesiones.

- Gestión segura de credenciales.

- Restricción de conexiones a PostgreSQL.

- Revisión de dependencias.

- Control de permisos en el repositorio.

- Protección de datos sensibles en los registros.

- Validación de las entradas y salidas de los modelos.

El hecho de que un endpoint esté desplegado no significa que se
encuentre protegido. Los mecanismos de autenticación y autorización
deben documentarse a partir de su implementación efectiva.

**8.6. Observabilidad**

Langfuse es la plataforma seleccionada para centralizar la
observabilidad de las interacciones de IA.

El diseño de medición debe permitir analizar:

- Latencia por interacción.

- Consumo de tokens de entrada y salida.

- Modelo utilizado.

- Errores de generación o recuperación.

- Calidad de la respuesta frente a datos de referencia.

- Coste estimado de las llamadas, cuando el proveedor proporcione
  información suficiente.

La latencia total debe distinguirse de la latencia del modelo. Una
consulta puede consumir tiempo en el frontend, el webhook, la base de
datos, la recuperación vectorial y el proveedor de IA.

**9. Decisiones arquitectónicas**

Las decisiones más relevantes se resumen en la siguiente tabla. Los
registros constituyen una consolidación del proceso conocido; no todos
corresponden necesariamente a ADRs formales ya creados en el
repositorio.

<table style="width:99%;">
<colgroup>
<col style="width: 11%" />
<col style="width: 22%" />
<col style="width: 26%" />
<col style="width: 39%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><p><strong>ID</strong></p></th>
<th style="text-align: left;"><p><strong>Decisión</strong></p></th>
<th style="text-align: left;"><p><strong>Justificación</strong></p></th>
<th style="text-align: left;"><blockquote>
<p><strong>Consecuencia principal</strong></p>
</blockquote></th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align: left;"><p>ADR-01</p></td>
<td style="text-align: left;"><p>Utilizar React y Vite en el
frontend</p></td>
<td style="text-align: left;"><p>Facilitar la construcción y evolución
de la interfaz.</p></td>
<td style="text-align: left;"><p>Requiere gestionar correctamente las
variables de entorno y la integración con los webhooks.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-02</p></td>
<td style="text-align: left;"><p>Utilizar n8n para orquestar los
procesos</p></td>
<td style="text-align: left;"><p>Permitir la automatización y
visualización de flujos complejos.</p></td>
<td style="text-align: left;"><p>La lógica debe mantenerse ordenada y
los workflows deben versionarse y probarse.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-03</p></td>
<td style="text-align: left;"><p>Utilizar PostgreSQL con
pgvector</p></td>
<td style="text-align: left;"><p>Unificar datos estructurados y
recuperación vectorial.</p></td>
<td style="text-align: left;"><p>Simplifica la infraestructura, pero
exige administrar índices, esquemas y rendimiento.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-04</p></td>
<td style="text-align: left;"><p>Separar WF0, WF1 y WF2</p></td>
<td style="text-align: left;"><p>Diferenciar ingesta documental,
actualización diaria y consultas interactivas.</p></td>
<td style="text-align: left;"><p>Facilita el mantenimiento, pero
requiere coordinar contratos y dependencias.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-05</p></td>
<td style="text-align: left;"><p>Mantener una arquitectura híbrida
durante la ingesta</p></td>
<td style="text-align: left;"><p>Superar dificultades de acceso y
procesamiento de documentos desde el entorno cloud.</p></td>
<td style="text-align: left;"><p>Permite continuar el desarrollo, aunque
introduce dependencia del equipo local.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-06</p></td>
<td style="text-align: left;"><p>Utilizar Vercel y Render en la
estrategia cloud</p></td>
<td style="text-align: left;"><p>Separar el alojamiento del frontend y
los servicios de datos e infraestructura.</p></td>
<td style="text-align: left;"><p>Exige administrar conectividad,
configuración y despliegues entre servicios.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-07</p></td>
<td style="text-align: left;"><p>Incorporar un mecanismo RAG</p></td>
<td style="text-align: left;"><p>Recuperar información documental
relevante para las consultas.</p></td>
<td style="text-align: left;"><p>La calidad depende de la ingesta, los
embeddings y la recuperación.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-08</p></td>
<td style="text-align: left;"><p>Incorporar Langfuse y retirar
Phoenix</p></td>
<td style="text-align: left;"><p>Concentrar la observabilidad de las
interacciones de IA.</p></td>
<td style="text-align: left;"><p>Reduce la duplicidad de herramientas,
pero requiere una instrumentación consistente.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-09</p></td>
<td style="text-align: left;"><p>Evaluar y ajustar los modelos de IA y
embeddings</p></td>
<td style="text-align: left;"><p>Mejorar el procesamiento de consultas y
la recuperación semántica.</p></td>
<td style="text-align: left;"><p>Obliga a validar compatibilidad,
calidad, coste y rendimiento ante cambios de modelos.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR-10</p></td>
<td style="text-align: left;"><p>Medir precisión y rendimiento con un
conjunto de referencia</p></td>
<td style="text-align: left;"><p>Evitar evaluar la calidad únicamente
por impresiones subjetivas.</p></td>
<td style="text-align: left;"><p>Requiere datos de referencia confiables
y pruebas reproducibles.</p></td>
</tr>
</tbody>
</table>

**9.1. Registro detallado de decisiones**

**ADR-04 — Separación de workflows**

**Contexto:** la ingesta de datos y la atención de consultas tienen
necesidades diferentes. La ingesta es periódica y depende de fuentes
externas; las consultas requieren una respuesta interactiva.

**Decisión:** dividir las responsabilidades entre WF0, WF1 y WF2.

**Consecuencias positivas:**

- Mayor claridad de responsabilidades.

- Posibilidad de ejecutar y depurar procesos por separado.

- Menor dependencia entre la actualización de datos y la consulta
  interactiva.

**Consecuencias negativas:**

- Más componentes que mantener.

- Necesidad de controlar la consistencia de los datos.

- Dependencia de contratos claros entre los procesos.

**ADR-05 — Arquitectura híbrida para la ingesta**

**Contexto:** durante el desarrollo se presentaron dificultades para
procesar y obtener documentos de MIDAGRI desde el entorno cloud.

**Decisión:** ejecutar determinados procesos de ingesta localmente y
mantener la posibilidad de escribir los resultados en PostgreSQL alojado
en Render.

**Consecuencias positivas:**

- Permite continuar las pruebas.

- Aprovecha el entorno local para procesos que presentan dificultades en
  la nube.

**Consecuencias negativas:**

- La ingesta puede detenerse si el equipo local no está disponible.

- Aumenta la complejidad operativa.

- Es necesario proteger la conexión externa a la base de datos.

> **Evolución futura:** evaluar una alternativa de ejecución gestionada
> en la nube que elimine la dependencia del equipo local.
>
> **ADR-08 — Langfuse como plataforma de observabilidad**
>
> **Contexto:** se había considerado Arize Phoenix y posteriormente se
> decidió retirarlo.
>
> **Decisión:** mantener Langfuse como plataforma principal de
> observabilidad de las interacciones con IA.
>
> **Consecuencias positivas:**

- Centralización de las métricas de IA.

- Menor duplicidad de herramientas.

- Facilita relacionar el rendimiento con el comportamiento de los
  modelos.

> **Consecuencias negativas:**

- La utilidad de las métricas depende de la instrumentación.

- Deben controlarse el coste y la retención de los registros.

- Los datos registrados deben protegerse adecuadamente.

**ADR-09 — Evolución de modelos de IA y embeddings**

**Contexto:** durante el desarrollo se han revisado las integraciones
con proveedores de modelos y la estrategia de embeddings. La
actualización más reciente menciona Jina Embeddings v3 y el acceso a un
modelo de lenguaje mediante OpenRouter.

**Decisión:** mantener una arquitectura que permita configurar y cambiar
modelos sin rediseñar toda la aplicación.

**Consecuencias positivas:**

- Mayor flexibilidad para evaluar alternativas.

- Posibilidad de comparar calidad, latencia y consumo.

- Menor acoplamiento de la arquitectura a un único proveedor.

**Consecuencias negativas:**

- Las APIs y los modelos pueden tener comportamientos diferentes.

- Los cambios de embeddings pueden requerir regenerar los vectores
  existentes.

- Los cambios de modelo pueden modificar la calidad, el coste y la
  latencia.

- La configuración debe mantenerse sincronizada con la documentación.

**Control requerido:** cada cambio de modelo debe registrarse con el
identificador exacto, fecha, motivo, pruebas realizadas y resultado de
la comparación.

**10. Requisitos de calidad**

**10.1. Rendimiento**

El objetivo de rendimiento definido para el Sprint 2 es mantener el
percentil 95 de latencia por debajo de cuatro segundos.

Para evaluar este requisito, se debe establecer un protocolo
reproducible que contemple:

- Un conjunto representativo de consultas.

- El número de ejecuciones.

- La latencia total observada por el usuario.

- La latencia por etapa, cuando esté disponible.

- Las condiciones de concurrencia.

- Los errores y los tiempos de espera.

El percentil 95 significa que el 95 % de las observaciones está en o por
debajo del valor medido. No equivale al tiempo promedio ni garantiza que
todas las consultas terminen en menos de cuatro segundos.

**10.2. Precisión numérica**

Se ha definido un conjunto de 50 preguntas sobre precios agrícolas para
comparar las respuestas del sistema con datos de referencia almacenados
en PostgreSQL.

El objetivo es obtener una precisión numérica del 100 % en ese conjunto.

La evaluación debe definir previamente:

- El producto consultado.

- El mercado o lugar cuando corresponda.

- La fecha de referencia.

- La unidad de medida.

- La moneda.

- El valor esperado.

- Las reglas para aceptar formatos equivalentes.

Una respuesta que utiliza el producto correcto pero la fecha equivocada
no debe considerarse correcta. De igual manera, las unidades deben
compararse de forma consistente.

La evaluación debe distinguir la exactitud numérica de la utilidad
general de una respuesta generada por IA.

**10.3. Consumo de tokens**

Se debe medir el promedio de tokens utilizados por interacción,
diferenciando cuando sea posible:

- Tokens de entrada.

- Tokens de salida.

- Consumo por modelo.

- Número de llamadas por consulta.

- Coste estimado.

- Consultas con consumo anormalmente elevado.

El cambio de un modelo de lenguaje o de embeddings no garantiza por sí
solo una reducción del consumo. Para comparar alternativas, deben
utilizarse las mismas preguntas y condiciones de prueba.

**10.4. Escenarios de calidad**

| **Escenario** | **Estímulo** | **Respuesta esperada** | **Métrica** |
|----|----|----|----|
| Consulta de precio | El usuario pregunta el precio de un producto para una fecha determinada. | Se devuelve el valor correspondiente a los datos disponibles. | Precisión numérica. |
| Consulta meteorológica | El usuario pregunta por las condiciones climáticas de una región. | Se devuelve información meteorológica disponible y pertinente. | Exactitud de la fuente y latencia. |
| Consulta documental | El usuario pregunta sobre un tema tratado en los documentos indexados. | Se recuperan fragmentos relevantes y se genera una respuesta basada en ellos. | Relevancia de recuperación y calidad de respuesta. |
| Sesión inválida | Se envía una solicitud sin el identificador de sesión requerido. | La solicitud se rechaza de forma controlada. | Comportamiento de validación. |
| Proveedor no disponible | La API del modelo no responde o devuelve un error. | El sistema registra el fallo y devuelve un error controlado o utiliza una alternativa si está configurada. | Tasa de errores y tiempo de recuperación. |
| Ingesta repetida | El mismo conjunto de datos se procesa nuevamente. | No se generan duplicados ni inconsistencias. | Integridad de los registros. |
| Consulta de alta latencia | Una consulta tarda más de lo esperado. | Se registra información que permite identificar la etapa problemática. | Latencia por etapa y trazabilidad. |

**10.5. Mantenibilidad y escalabilidad**

La arquitectura debe facilitar que las mejoras de un componente no
obliguen a modificar todos los demás.

Para ello, se recomienda mantener contratos de comunicación estables,
separar las variables de entorno, versionar los workflows y documentar
las dependencias externas.

La escalabilidad debe evaluarse mediante pruebas de carga y mediciones
del consumo de recursos. No puede deducirse únicamente del uso de
servicios cloud o de la separación en workflows.

**10.6. Seguridad y confiabilidad**

Los criterios de calidad deben incluir pruebas de validación de
entradas, protección de credenciales, gestión de errores y recuperación
de servicios.

También se debe verificar que las respuestas de IA no sustituyan
silenciosamente valores ausentes por números inventados y que el sistema
pueda reconocer cuándo no dispone de datos suficientes.

**11. Riesgos y deuda técnica**

**11.1. Matriz de riesgos**

La siguiente matriz representa una evaluación cualitativa inicial. Las
probabilidades y los impactos son estimaciones de trabajo, no resultados
de un análisis formal de incidentes.

| **ID** | **Riesgo** | **Probabilidad** | **Impacto** | **Mitigación** |
|:---|:---|:---|:---|:---|
| R-01 | Dependencia de n8n local para la ingesta | Alta en el esquema híbrido | Alto | Planificar una ejecución cloud estable y monitorizar las tareas programadas. |
| R-02 | Fallos en la extracción de boletines de MIDAGRI | Media-alta | Alto | Validar el contenido extraído, registrar errores y mantener pruebas con documentos reales. |
| R-03 | Respuestas numéricas incorrectas | Media | Alto | Utilizar Ground Truth, consultas de referencia y pruebas automatizadas. |
| R-04 | Cambios o límites en proveedores de IA | Media | Alto | Medir errores y latencia, controlar versiones y documentar alternativas configuradas. |
| R-05 | Incremento del consumo de tokens | Media | Medio-alto | Medir consumo por interacción, revisar prompts y optimizar las llamadas. |
| R-06 | Inconsistencias en embeddings tras un cambio de modelo | Media | Alto | Versionar el modelo de embeddings y planificar la reindexación cuando sea necesaria. |
| R-07 | Configuración incorrecta de variables de entorno | Media | Alto | Validar la configuración antes del despliegue y mantener plantillas de ejemplo sin secretos. |
| R-08 | Errores de autenticación o conectividad de PostgreSQL | Media | Alto | Revisar credenciales, SSL, permisos y pruebas de conexión. |
| R-09 | Falta de observabilidad en algunas ramas | Media | Medio-alto | Instrumentar las rutas de ejecución y comprobar que los registros lleguen a Langfuse. |
| R-10 | Confusión entre estado planificado e implementado | Media | Medio | Mantener una matriz de trazabilidad de requisitos, componentes y pruebas. |

**11.2. Deuda técnica identificada o potencial**

**DT-01. Dependencia del entorno local**

La ejecución local de la ingesta permite superar obstáculos temporales,
pero dificulta garantizar continuidad operativa.

**Acción recomendada:** definir una estrategia de migración a un entorno
cloud gestionado y documentar los requisitos de red, recursos y
permisos.

**DT-02. Evolución de modelos sin registro centralizado**

Los cambios de proveedores y modelos pueden hacer que la documentación
deje de representar el comportamiento real del sistema.

**Acción recomendada:** mantener un registro de modelos y
configuraciones que incluya identificador exacto, proveedor, finalidad,
fecha de cambio y resultados de pruebas.

**DT-03. Instrumentación incompleta**

La existencia de Langfuse no garantiza que todas las ramas estén
instrumentadas ni que las métricas sean comparables.

**Acción recomendada:** establecer un esquema común de trazas y
verificar la captura de latencia, tokens y errores.

**DT-04. Contratos de integración**

Los cambios en la estructura de solicitudes, las variables de entorno o
los nodos de n8n pueden afectar al frontend.

**Acción recomendada:** documentar el contrato de la API, validar las
entradas y mantener pruebas de integración.

**DT-05. Calendario agrícola**

El módulo Calendario necesita una fuente de fechas fiable y una
definición clara de qué constituye una campaña o evento agrícola.

**Acción recomendada:** identificar la fuente de datos, validar su
periodicidad y establecer cómo se extraen, normalizan y actualizan las
fechas antes de dar el módulo por terminado.

**DT-06. Evaluación reproducible**

Una evaluación de 50 preguntas puede resultar insuficiente si las
preguntas, los datos de referencia o las condiciones de ejecución
cambian sin control.

**Acción recomendada:** versionar el conjunto de preguntas, los valores
de referencia y los resultados de cada ejecución.

**12. Glosario**

<table style="width:99%;">
<colgroup>
<col style="width: 19%" />
<col style="width: 80%" />
</colgroup>
<thead>
<tr>
<th style="text-align: left;"><p><strong>Término</strong></p></th>
<th style="text-align: left;"><blockquote>
<p><strong>Definición</strong></p>
</blockquote></th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align: left;"><p>arc42</p></td>
<td style="text-align: left;"><p>Plantilla para estructurar la
documentación de arquitectura de software.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>API</p></td>
<td style="text-align: left;"><p>Interfaz que permite la comunicación
entre componentes o sistemas.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>ADR</p></td>
<td style="text-align: left;"><p>Architecture Decision Record; registro
de una decisión arquitectónica y sus consecuencias.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Backend</p></td>
<td style="text-align: left;"><p>Componentes que procesan solicitudes,
ejecutan lógica y acceden a los datos.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Embedding</p></td>
<td style="text-align: left;"><p>Representación numérica de un contenido
que permite comparar su similitud semántica.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Ground Truth</p></td>
<td style="text-align: left;"><p>Conjunto de valores de referencia
utilizados para verificar la corrección de una respuesta.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Hugging Face</p></td>
<td style="text-align: left;"><p>Plataforma y ecosistema de modelos,
herramientas y servicios de inteligencia artificial.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Jina Embeddings v3</p></td>
<td style="text-align: left;"><p>Modelo de embeddings mencionado en las
actualizaciones del proyecto para representar semánticamente el
contenido.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Langfuse</p></td>
<td style="text-align: left;"><p>Plataforma de observabilidad y
evaluación de aplicaciones que utilizan modelos de lenguaje.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>LLM</p></td>
<td style="text-align: left;"><p>Large Language Model; modelo de
lenguaje de gran tamaño capaz de interpretar y generar texto.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>MIDAGRI</p></td>
<td style="text-align: left;"><p>Ministerio de Desarrollo Agrario y
Riego del Perú, fuente relevante para información agrícola.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>n8n</p></td>
<td style="text-align: left;"><p>Plataforma de automatización basada en
workflows.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Open-Meteo</p></td>
<td style="text-align: left;"><p>Servicio que proporciona datos y
pronósticos meteorológicos mediante API.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>OpenRouter</p></td>
<td style="text-align: left;"><p>Servicio de acceso a modelos de IA
mediante una interfaz de API unificada.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>pgvector</p></td>
<td style="text-align: left;"><p>Extensión de PostgreSQL para almacenar
y consultar vectores.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>PostgreSQL</p></td>
<td style="text-align: left;"><p>Sistema gestor de bases de datos
relacional.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>p95</p></td>
<td style="text-align: left;"><p>Percentil 95; valor por debajo del cual
se encuentra el 95 % de las mediciones.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>RAG</p></td>
<td style="text-align: left;"><p>Retrieval-Augmented Generation; técnica
que combina recuperación de información con generación mediante un
modelo de lenguaje.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Render</p></td>
<td style="text-align: left;"><p>Plataforma de alojamiento de
aplicaciones y servicios.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>React</p></td>
<td style="text-align: left;"><p>Biblioteca de JavaScript para construir
interfaces de usuario.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Token</p></td>
<td style="text-align: left;"><p>Unidad de texto procesada por un modelo
de lenguaje; no equivale necesariamente a una palabra.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Vercel</p></td>
<td style="text-align: left;"><p>Plataforma de alojamiento y despliegue
de aplicaciones web.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>WF0</p></td>
<td style="text-align: left;"><p>Workflow de ingesta de conocimiento
documental para recuperación RAG.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>WF1</p></td>
<td style="text-align: left;"><p>Workflow de actualización de precios
agrícolas y datos meteorológicos.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>WF2</p></td>
<td style="text-align: left;"><p>Workflow que recibe y procesa las
consultas del usuario mediante una API de chat y análisis.</p></td>
</tr>
<tr>
<td style="text-align: left;"><p>Workflow</p></td>
<td style="text-align: left;"><p>Secuencia de nodos o tareas conectadas
para ejecutar un proceso.</p></td>
</tr>
</tbody>
</table>

**Conclusiones**

La arquitectura de AgroSmart Insights se ha orientado a integrar datos
agrícolas, información meteorológica y modelos de inteligencia
artificial mediante una plataforma web y procesos automatizados.

La separación entre WF0, WF1 y WF2 permite distinguir la ingesta
documental, la actualización de información operativa y la atención de
consultas. PostgreSQL con pgvector proporciona una base común para la
persistencia estructurada y la recuperación semántica. La incorporación
de Langfuse responde a la necesidad de observar y evaluar el
comportamiento de los modelos de IA.

Uno de los principales aprendizajes arquitectónicos del proyecto ha sido
la necesidad de adaptar el despliegue a las dificultades reales de las
fuentes de datos. La arquitectura híbrida permitió continuar el trabajo
de ingesta, aunque introduce dependencias que deben resolverse antes de
considerar la operación completamente autónoma.

Asimismo, la evolución de los proveedores y modelos demuestra la
importancia de mantener las decisiones documentadas y de evaluar los
cambios mediante pruebas reproducibles. La selección de una tecnología
no debe basarse exclusivamente en su disponibilidad, sino también en su
rendimiento, coste, compatibilidad y facilidad de mantenimiento.

Finalmente, los objetivos de precisión numérica del 100 % sobre el
conjunto de referencia de 50 preguntas y de latencia p95 inferior a
cuatro segundos ofrecen criterios concretos para evaluar el Sprint 2. Su
cumplimiento deberá demostrarse con resultados medidos y trazables.
