<img src="media/image1.png" style="width:5.90556in;height:1.63333in" />

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
**FECHA: **6/11/2026   \
   \
**LIMA – PERÚ**

## Contenido

[TOC]

## 1. INTRODUCCIÓN Y OBJETIVOS

### 1.1. Visión general

AgroSmart-Insights es una plataforma tecnológica orientada al análisis y
seguimiento de información agrícola. Su propósito es integrar diferentes
fuentes de datos, automatizar procesos y proporcionar herramientas que
permitan a los usuarios consultar información relevante para la toma de
decisiones dentro del sector agrícola.

La solución está desarrollada mediante una arquitectura que separa la
interfaz de usuario, los procesos de automatización, el almacenamiento
de información y los servicios de inteligencia artificial.

El sistema cuenta actualmente con cinco microfrontends y seis workflows
desarrollados en n8n, los cuales permiten organizar las funcionalidades
de la plataforma y facilitar la comunicación entre sus diferentes
componentes.

La arquitectura utiliza tecnologías como React, Vite, PostgreSQL,
pgvector, n8n, Render, Vercel y Langfuse. Asimismo, incorpora servicios
externos como MIDAGRI, Open-Meteo y OpenRouter para obtener información
y procesar consultas mediante modelos de inteligencia artificial.

### 1.2. Objetivos del sistema

Los principales objetivos de AgroSmart-Insights son:

- Integrar información agrícola procedente de diferentes fuentes
  externas.

- Proporcionar información sobre precios y mercados agrícolas.

- Facilitar el monitoreo satelital mediante herramientas de
  visualización geográfica.

- Permitir consultas en lenguaje natural mediante un asistente
  inteligente.

- Proporcionar información sobre campañas y eventos agrícolas mediante
  un calendario.

- Generar y presentar alertas relacionadas con riesgos agrícolas.

- Automatizar los procesos de ingesta, procesamiento y consulta mediante
  workflows.

- Utilizar técnicas RAG para recuperar información relevante y mejorar
  las respuestas del asistente.

- Facilitar el seguimiento del rendimiento y comportamiento de los
  modelos de inteligencia artificial.

### 1.3. Actores y partes interesadas

| **Actor** | **Responsabilidad** |
|:--:|:--:|
| Usuarios de la plataforma | Consultar información y utilizar las funcionalidades disponibles. |
| Equipo de desarrollo | Implementar y mantener los componentes del sistema. |
| Arquitecto de Software | Definir, documentar y supervisar la estructura de la arquitectura. |
| DevOps | Gestionar infraestructura, despliegues y configuración de servicios. |
| QA | Verificar el funcionamiento de las funcionalidades y validar los procesos de recuperación. |

### 1.4. Alcance de la documentación

Este documento describe la arquitectura actual de AgroSmart-Insights,
incluyendo sus componentes principales, organización de microfrontends,
workflows, integración con servicios externos, almacenamiento de
información, mecanismos de inteligencia artificial, infraestructura y
decisiones arquitectónicas.

El documento también identifica los riesgos técnicos y las mejoras
necesarias para mantener la estabilidad, seguridad y evolución del
sistema.

## 2. RESTRICCIONES ARQUITECTÓNICAS

### 2.1. Restricciones tecnológicas

La arquitectura del proyecto está condicionada por las siguientes
tecnologías:

| **Componente** | **Tecnología** | **Descripción** |
|:--:|:--:|:--:|
| Frontend | React | Biblioteca utilizada para desarrollar la interfaz. |
| Herramienta frontend | Vite | Herramienta de desarrollo y construcción de la aplicación. |
| Lenguaje | JavaScript | Lenguaje utilizado en el desarrollo frontend. |
| Automatización | n8n | Plataforma encargada de ejecutar los workflows. |
| Infraestructura backend | Render | Servicio donde se ejecutan los procesos de automatización. |
| Base de datos | PostgreSQL | Sistema encargado del almacenamiento de información. |
| Búsqueda vectorial | pgvector | Extensión que permite almacenar y consultar embeddings. |
| Despliegue frontend | Vercel | Plataforma utilizada para publicar la aplicación web. |
| Observabilidad | Langfuse | Herramienta para supervisar las ejecuciones de inteligencia artificial. |
| Modelos generativos | OpenRouter | Servicio utilizado para acceder a los modelos de inteligencia artificial. |

### 2.2. Restricciones de integración

El sistema depende de diferentes servicios externos para obtener
información y ejecutar determinadas funcionalidades.

Entre las principales restricciones se encuentran:

- La disponibilidad de las API externas.

- Los límites de solicitudes establecidos por los proveedores.

- Las restricciones de acceso a determinados documentos de MIDAGRI.

- La disponibilidad de los modelos de inteligencia artificial.

- La correcta configuración de las credenciales y variables de entorno.

- La conectividad entre los servicios desplegados en diferentes
  plataformas.

### 2.3. Restricciones operativas

El funcionamiento de la plataforma depende de la correcta configuración
de Vercel, Render, n8n, PostgreSQL y los servicios externos.

Los cambios realizados directamente en los servicios cloud o en la base
de datos deben quedar documentados y registrados para evitar diferencias
entre la infraestructura desplegada y la configuración almacenada en el
repositorio Git.

## 3. CONTEXTO Y ALCANCE

### 3.1. Contexto de negocio

AgroSmart-Insights busca proporcionar una plataforma centralizada para
consultar y analizar información relacionada con el sector agrícola.

La solución permite trabajar con información de precios, condiciones
climáticas, monitoreo satelital, campañas agrícolas y alertas de riesgo.

Mediante la integración de fuentes externas y herramientas de
inteligencia artificial, el sistema facilita el acceso a información que
puede apoyar la planificación y toma de decisiones.

### 3.2. Sistemas externos

La plataforma interactúa con los siguientes servicios:

| **Sistema externo** | **Función dentro del proyecto** |
|:--:|:--:|
| MIDAGRI | Proporciona información agrícola, especialmente precios y documentos en formato PDF. |
| Open-Meteo | Proporciona información meteorológica para los procesos relacionados con el clima. |
| OpenRouter | Permite acceder a los modelos generativos utilizados por el asistente. |
| MapTiler | Proporciona servicios cartográficos para la visualización de mapas en el frontend. |
| Copernicus | Fuente relacionada con información e imágenes satelitales. |

### 3.3. Límites del sistema

Dentro del alcance de AgroSmart-Insights se encuentran:

- La aplicación web.

- Los cinco microfrontends.

- Los seis workflows de n8n.

- La base de datos PostgreSQL.

- La extensión pgvector.

- La integración con modelos generativos.

- La implementación del enfoque RAG.

- La herramienta de observabilidad Langfuse.

Los servicios externos, como MIDAGRI, Open-Meteo, OpenRouter, MapTiler y
Copernicus, se consideran dependencias externas del sistema.

### 3.4. Usuarios y canales de acceso

El principal canal de acceso es la aplicación web, desarrollada con
React y Vite y desplegada mediante Vercel.

Desde esta interfaz, los usuarios pueden ingresar a los diferentes
módulos y utilizar las funcionalidades disponibles.

La comunicación con los procesos backend se realiza mediante endpoints y
webhooks que permiten ejecutar los workflows correspondientes en n8n.

## 4. ESTRATEGIA DE SOLUCIÓN

### 4.1. Separación por responsabilidades

La arquitectura de AgroSmart-Insights se organiza en diferentes capas
que permiten distribuir las responsabilidades del sistema.

Capa de presentación

Está desarrollada con React y Vite. Organiza la interfaz mediante cinco
microfrontends especializados.

Capa de automatización

Utiliza n8n para ejecutar seis workflows encargados de gestionar
procesos de ingesta, consultas y funcionalidades específicas.

Capa de almacenamiento

Utiliza PostgreSQL para almacenar información estructurada y pgvector
para almacenar y consultar representaciones vectoriales.

Capa de inteligencia artificial

Implementa un enfoque RAG que permite recuperar información relevante
desde la base de datos y utilizarla como contexto para generar
respuestas.

Capa de observabilidad

Utiliza Langfuse para supervisar las ejecuciones de inteligencia
artificial, incluyendo trazas, latencia, consumo de tokens y errores.

### 4.2. Organización de los microfrontends

La aplicación está organizada en cinco microfrontends:

| **Microfrontend** | **Función** |
|:--:|:--:|
| Monitoreo Satelital | Permite visualizar información geográfica y funcionalidades relacionadas con el monitoreo satelital. |
| Mercados | Presenta información relacionada con precios y mercados agrícolas. |
| Chat | Permite realizar consultas en lenguaje natural mediante un asistente inteligente. |
| Calendario | Presenta campañas, eventos y actividades agrícolas. |
| Alertas | Permite consultar alertas relacionadas con riesgos y condiciones agrícolas. |

Esta organización permite separar las funcionalidades de la interfaz y
facilitar su mantenimiento y evolución.

### 4.3. Estrategia de automatización mediante n8n

El backend utiliza seis workflows para organizar los procesos
principales de la plataforma.

Cada workflow tiene una responsabilidad funcional específica y permite
conectar diferentes servicios, consultar información y ejecutar
operaciones sobre la base de datos.

La distribución es la siguiente:

| **Workflow** |          **Función principal**           |
|:------------:|:----------------------------------------:|
|     WF0      |      Ingesta documental de MIDAGRI.      |
|     WF1      |    Ingesta diaria de precios y clima.    |
|     WF2      |    API de Chat y análisis predictivo.    |
|     WF3      | Procesos backend de Monitoreo Satelital. |
|     WF4      |  Procesos relacionados con Calendario.   |
|     WF5      |    Procesos relacionados con Alertas.    |

### 4.4. Estrategia de inteligencia artificial

El sistema utiliza el enfoque RAG (Retrieval-Augmented Generation),
también conocido como generación aumentada por recuperación.

Esta técnica permite que el asistente no dependa únicamente del
conocimiento interno del modelo generativo, sino que también pueda
consultar información almacenada en la base de datos.

El proceso consiste en preparar documentos, dividirlos en fragmentos,
generar embeddings y almacenarlos en PostgreSQL mediante pgvector.

Cuando el usuario realiza una consulta, el sistema recupera los
fragmentos más relevantes y los utiliza como contexto para generar una
respuesta.

Para la generación de respuestas, el proyecto utiliza OpenRouter como
plataforma de acceso a modelos de inteligencia artificial.

La configuración comunicada contempla:

- Ling 3.0 Flash: modelo principal.

- Qwen 3.6 Plus: modelo alternativo de respaldo (failover).

El mecanismo de failover permite utilizar un modelo alternativo cuando
el principal presenta problemas de disponibilidad o ejecución, siempre
que esta lógica esté correctamente configurada en el backend.

### 4.5. Estrategia de despliegue

La arquitectura utiliza diferentes plataformas para desplegar y ejecutar
sus componentes.

El frontend se publica mediante Vercel, mientras que los workflows de
n8n se ejecutan en Render.

PostgreSQL se utiliza como sistema de almacenamiento y Langfuse como
herramienta de observabilidad.

La configuración de infraestructura debe mantenerse documentada y
sincronizada con el repositorio para facilitar la administración y
recuperación del sistema.

## 5. VISTA DE BLOQUES DE CONSTRUCCIÓN

### 5.1. Nivel 1: sistema completo

AgroSmart-Insights se compone de una aplicación web que permite a los
usuarios acceder a sus funcionalidades mediante cinco microfrontends.

La aplicación se comunica con una capa backend desarrollada mediante
workflows de n8n, encargada de coordinar las operaciones y conexiones
con servicios externos.

Los resultados y la información procesada se almacenan en PostgreSQL,
mientras que pgvector permite realizar búsquedas vectoriales utilizadas
por el sistema RAG.

Además, OpenRouter proporciona acceso a los modelos generativos y
Langfuse permite supervisar las ejecuciones de inteligencia artificial.

### 5.2. Nivel 2: componentes principales

| **Componente** | **Tecnología** | **Responsabilidad** |
|:--:|:--:|:--:|
| Aplicación web | React + Vite | Presentación y navegación principal. |
| Monitoreo Satelital | Microfrontend | Visualización geográfica y funciones de monitoreo. |
| Mercados | Microfrontend | Consulta de información de precios. |
| Chat | Microfrontend | Consultas mediante lenguaje natural. |
| Calendario | Microfrontend | Consulta de campañas y eventos. |
| Alertas | Microfrontend | Presentación de alertas agrícolas. |
| Automatización | n8n | Ejecución de workflows. |
| Base de datos | PostgreSQL | Almacenamiento de información. |
| Búsqueda vectorial | pgvector | Almacenamiento y recuperación de embeddings. |
| Observabilidad | Langfuse | Seguimiento de ejecuciones de IA. |
| Modelos generativos | OpenRouter | Acceso a modelos de lenguaje. |

La aplicación web es un contenedor (**Shell**, `src/frontend/agrosmart-frontend`)
construido con React 19, Vite 8 y `@originjs/vite-plugin-federation` (Module
Federation). Carga los cinco microfrontends, desplegados por separado en
Vercel, y aísla sus fallas mediante `MicrofrontendErrorBoundary`. El Shell
resuelve la URL del `remoteEntry.js` de cada microfrontend con las variables
`VITE_*_REMOTE_URL`.

### 5.3. Nivel 3: descripción de los workflows

**WF0 – Ingesta documental MIDAGRI**

Este workflow se encarga de obtener y procesar documentos provenientes
de MIDAGRI.

Su finalidad es preparar la información documental para que pueda
utilizarse posteriormente en el sistema RAG.

El proceso contempla la obtención de documentos, extracción de
contenido, división en fragmentos, generación de embeddings y
almacenamiento de la información en PostgreSQL con pgvector.

**WF1 – Ingesta diaria de precios y clima**

Este workflow se encarga de actualizar información relacionada con
precios agrícolas y condiciones climáticas.

Utiliza MIDAGRI como fuente de información de precios y Open-Meteo como
fuente de información meteorológica.

Los datos obtenidos se procesan y almacenan en la base de datos para que
puedan ser utilizados por los diferentes módulos de la plataforma.

**WF2 – API de Chat y análisis predictivo**

Este workflow gestiona las consultas realizadas desde el microfrontend
Chat mediante `POST /webhook/v1/query`. El mismo endpoint atiende también
a Mercados (comparativa GMML/MMF2) y al análisis agroclimático de
Monitoreo.

Recibe las solicitudes del usuario, valida la información de sesión,
identifica el tipo de consulta y determina qué proceso debe ejecutarse.

Dependiendo de la consulta, puede recuperar información documental
mediante RAG, consultar información almacenada en PostgreSQL o utilizar
servicios de inteligencia artificial.

La generación de respuestas utiliza OpenRouter, con Ling 3.0 Flash como
modelo principal y Qwen 3.6 Plus como alternativa de respaldo, de
acuerdo con la configuración comunicada por el equipo.

**WF3 – Monitoreo Satelital**

Este workflow gestiona los procesos backend relacionados con el módulo
de Monitoreo Satelital.

Su función es coordinar las operaciones necesarias para procesar o
consultar información relacionada con el monitoreo: obtiene capas
raster NDVI de Copernicus Sentinel-2 (CDSE) a través de
`POST /webhook/v1/satelital/ndvi`, protegido con la cabecera
`X-AgroSmart-Key`.

La visualización cartográfica se realiza directamente desde el frontend
mediante MapTiler. Por lo tanto, MapTiler no debe considerarse un
proceso de ingesta o procesamiento ejecutado dentro de n8n.

**WF4 – Calendario**

Este workflow gestiona los procesos relacionados con el módulo
Calendario.

Permite organizar y proporcionar información relacionada con campañas,
eventos y actividades agrícolas para su presentación en la aplicación
web. Expone `GET /webhook/v1/calendario`, que filtra por rango de fechas,
departamento, modalidad y entidad organizadora.

**WF5 – Alertas**

Este workflow gestiona los procesos relacionados con el módulo de
Alertas.

Su responsabilidad es procesar y administrar información utilizada para
identificar y presentar alertas de riesgo.

De acuerdo con la información proporcionada por el equipo, este workflow
utiliza estructuras de datos relacionadas con alertas_riesgo.

Combina una ejecución programada (lunes a sábado a las 14:00,
`America/Lima`) que evalúa las reglas configurables con
`alertas_riesgo_evaluar`, y el webhook `POST /webhook/v1/alertas`, que
lista alertas, muestra su evidencia histórica y actualiza su estado
(`pending`, `read`, `attended`).

### 5.4. Persistencia y estructuras de datos

La plataforma utiliza PostgreSQL como sistema principal de
almacenamiento.

La extensión pgvector permite almacenar embeddings y realizar búsquedas
por similitud, facilitando la recuperación de información utilizada por
el sistema RAG.

Entre las estructuras identificadas se encuentra documentos_rag,
utilizada para almacenar información documental destinada a la
recuperación.

En el módulo de alertas se utilizan tablas relacionadas con
alertas_riesgo.

También se han identificado las siguientes tablas:

- alert_rules

- risk_alerts

- alert_status_history

Estas tablas fueron creadas manualmente y su utilización desde el
repositorio no está confirmada. Por ello, su conservación o eliminación
debe ser evaluada por el equipo de desarrollo y DevOps antes de realizar
cualquier modificación.

### 5.5. Interfaces entre componentes

Los principales mecanismos de comunicación son:

- El frontend se comunica con los workflows mediante solicitudes HTTP y
  webhooks: Chat y Mercados con WF2 (`/v1/query`), Monitoreo con WF3
  (`/v1/satelital/ndvi`) y WF2, Alertas con WF5 (`/v1/alertas`) y
  Calendario con WF4 (`/v1/calendario`). Las URLs se configuran con
  `VITE_N8N_WEBHOOK_URL`, `VITE_WF3_NDVI_URL`, `VITE_ALERTS_WEBHOOK_URL` y
  `VITE_CALENDARIO_API_URL`.

- Los workflows consultan y actualizan información en PostgreSQL.

- Los procesos de ingesta consumen información de servicios externos.

- El sistema RAG recupera información mediante pgvector.

- OpenRouter proporciona acceso a los modelos generativos.

- Langfuse recibe información de observabilidad de las ejecuciones de
  inteligencia artificial.

## 6. VISTA DE EJECUCIÓN

### 6.1. Flujo general de una interacción

El funcionamiento general de la plataforma sigue el siguiente proceso:

1.  El usuario ingresa a AgroSmart-Insights desde la aplicación web.

2.  Selecciona uno de los cinco microfrontends disponibles.

3.  El frontend envía una solicitud al endpoint o webhook
    correspondiente.

4.  n8n recibe la solicitud y ejecuta el workflow asociado.

5.  El workflow realiza las operaciones necesarias, como consultar la
    base de datos o consumir servicios externos.

6.  PostgreSQL almacena o proporciona la información requerida.

7.  El resultado se devuelve al frontend.

8.  La aplicación presenta la información al usuario.

### 6.2. Flujo de consulta del Chat mediante RAG

El flujo de consulta del asistente inteligente funciona de la siguiente
manera:

1.  El usuario ingresa una pregunta desde el microfrontend Chat.

2.  La solicitud llega al WF2 mediante el endpoint correspondiente.

3.  El workflow valida los datos de sesión y procesa la consulta.

4.  El sistema identifica el tipo de consulta y determina qué
    información necesita.

5.  Cuando corresponde utilizar RAG, se realiza una búsqueda de
    fragmentos relevantes en PostgreSQL mediante pgvector.

6.  La información recuperada se incorpora como contexto para el modelo
    generativo.

7.  OpenRouter permite acceder al modelo configurado para generar la
    respuesta.

8.  El resultado se devuelve al usuario.

9.  Langfuse registra las trazas y métricas disponibles de la ejecución.

Es importante señalar que RAG permite proporcionar información de
referencia al modelo, pero no garantiza por sí solo que todas las
respuestas sean correctas. Para evaluar la exactitud se requiere
comparar las respuestas con información de referencia o Ground Truth.

### 6.3. Flujo de ingesta documental

El proceso de ingesta documental se ejecuta mediante WF0.

Su funcionamiento general contempla:

1.  Obtener documentos provenientes de MIDAGRI.

2.  Extraer el contenido de los documentos.

3.  Preparar y dividir la información en fragmentos.

4.  Generar embeddings mediante el modelo de representación vectorial
    configurado.

5.  Almacenar los fragmentos y sus metadatos en PostgreSQL.

6.  Registrar sus representaciones vectoriales mediante pgvector.

De esta manera, la información queda disponible para las consultas
posteriores del sistema RAG.

El modelo de embeddings debe documentarse de manera independiente de los
modelos generativos utilizados por el Chat.

### 6.4. Flujo de ingesta de precios y clima

El WF1 se encarga de obtener y actualizar información procedente de
fuentes externas.

Para ello utiliza:

- MIDAGRI, para obtener información de precios agrícolas.

- Open-Meteo, para obtener información meteorológica.

Una vez obtenida la información, el workflow realiza el procesamiento
correspondiente y almacena los resultados en PostgreSQL.

Esta información puede ser utilizada posteriormente por los módulos de
Mercados, Chat y otras funcionalidades que requieran datos agrícolas.

### 6.5. Flujos de módulos especializados

WF3 – Monitoreo Satelital

Ejecuta los procesos backend relacionados con el monitoreo satelital. La
interfaz utiliza MapTiler directamente para mostrar información
cartográfica.

WF4 – Calendario

Gestiona las operaciones relacionadas con campañas, eventos y
actividades agrícolas.

WF5 – Alertas

Gestiona los procesos de alertas de riesgo y utiliza las estructuras de
almacenamiento correspondientes al módulo.

**6.6. Manejo de errores**

Los workflows deben contemplar mecanismos para identificar errores
durante la ejecución.

Entre los principales escenarios se encuentran:

- Fallas de conexión con servicios externos.

- Errores de comunicación con PostgreSQL.

- Problemas de disponibilidad de modelos generativos.

- Errores durante la descarga o procesamiento de documentos.

- Solicitudes incompletas o inválidas.

- Fallas en la ejecución de los workflows.

El sistema debe registrar los errores y permitir su identificación para
facilitar el mantenimiento y la recuperación de los servicios.

## 7. VISTA DE DESPLIEGUE

### 7.1. Infraestructura principal

La arquitectura de despliegue está distribuida entre diferentes
servicios:

| **Componente** | **Plataforma** | **Función** |
|:--:|:--:|:--:|
| Aplicación frontend | Vercel | Publicación de la aplicación web. |
| Automatización backend | Render | Ejecución de los workflows n8n. |
| Base de datos | PostgreSQL | Almacenamiento de información. |
| Búsqueda vectorial | pgvector | Recuperación de información mediante vectores. |
| Observabilidad | Langfuse | Supervisión de ejecuciones de IA. |
| Modelos generativos | OpenRouter | Acceso a modelos de lenguaje. |

### 7.2. Comunicación entre servicios

La aplicación frontend se comunica con los workflows alojados en Render
mediante endpoints y webhooks.

Los workflows realizan operaciones sobre PostgreSQL y se conectan con
los servicios externos que requieren para obtener información.

Las comunicaciones entre servicios deben utilizar conexiones seguras y
mecanismos adecuados para proteger las credenciales.

### 7.3. Puente de comunicación mediante Ngrok

Durante la integración del proyecto se implementó un mecanismo de
comunicación mediante Ngrok.

Este mecanismo permite exponer temporalmente un servicio que se ejecuta
en un equipo local para que pueda ser utilizado desde un workflow
alojado en Render.

Su utilización está relacionada con las restricciones de acceso
encontradas durante la descarga de documentos de MIDAGRI desde el
entorno cloud.

Ngrok funciona como un túnel de comunicación que permite conectar ambos
entornos. No realiza directamente la descarga ni el procesamiento de los
documentos.

Esta solución presenta una dependencia operativa, ya que requiere que el
equipo local, el servicio auxiliar, la conexión a Internet y el túnel
permanezcan disponibles.

Además, el código y la configuración de este puente no se encuentran
completamente representados en el repositorio del proyecto, según lo
informado por DevOps.

### 7.4. Configuración y seguridad

Las credenciales, claves API, tokens y URLs de webhooks deben
gestionarse mediante variables de entorno o mecanismos seguros de
configuración.

No se deben almacenar datos sensibles directamente en el código fuente
ni publicarlos en el repositorio.

Los servicios deben utilizar los permisos mínimos necesarios para
realizar sus operaciones.


### 7.5. Consideraciones para producción y respaldos

El proyecto cuenta con una estrategia de respaldo y restauración documentada en el archivo [ESTRATEGIA-RESPALDO.md](https://github.com/equipo2-AgroSmart-Insights/Agrosmart-Insights/blob/main/docs/w1-backup-restore/ESTRATEGIA-RESPALDO.md).

Este documento establece los procedimientos relacionados con la protección y recuperación de la información del sistema.

La estrategia contempla los datos almacenados en PostgreSQL y los recursos necesarios para reconstruir el entorno de trabajo utilizando cuentas nuevas de GitHub, Render y Vercel.

Sin embargo, es importante diferenciar entre tener un procedimiento documentado y haber comprobado que funciona correctamente.

Por ello, el equipo de QA debe ejecutar pruebas de restauración utilizando cuentas y entornos de prueba, verificar la información recuperada y compararla con el archivo MANIFIESTO.md.

Asimismo, se debe controlar que los cambios realizados directamente en Render o PostgreSQL queden registrados y sincronizados con el repositorio.

## 8. CONCEPTOS TRANSVERSALES

### 8.1. Seguridad

La seguridad del sistema se basa en proteger la información y controlar
el acceso a los diferentes componentes.

Se deben considerar las siguientes medidas:

- Protección de credenciales y claves API.

- Validación de solicitudes recibidas por los webhooks.

- Control de sesiones de usuario.

- Protección de las conexiones con la base de datos.

- Gestión adecuada de permisos.

- Evitar la exposición innecesaria de servicios locales.

### 8.2. Observabilidad

AgroSmart-Insights utiliza Langfuse como herramienta de observabilidad
para las funcionalidades relacionadas con inteligencia artificial.

Esta herramienta permite realizar seguimiento de:

- Trazas de ejecución.

- Latencia de las consultas.

- Consumo de tokens.

- Errores durante la generación de respuestas.

- Comportamiento de las ejecuciones instrumentadas.

La medición de alucinaciones requiere un proceso adicional de
evaluación, donde las respuestas del asistente se comparan con
información de referencia.

### 8.3. Gestión de datos

La información obtenida de fuentes externas se procesa y almacena en
PostgreSQL.

Los datos deben mantener información relacionada con su procedencia y
contexto, permitiendo facilitar su consulta y actualización.

Los cambios realizados en las estructuras de la base de datos deben
quedar documentados mediante scripts, migraciones o archivos de
configuración versionados.

### 8.4. Inteligencia artificial y RAG

La arquitectura RAG permite combinar la recuperación de información con
la generación de respuestas mediante modelos de lenguaje.

Su funcionamiento requiere diferenciar tres componentes:

1.  Modelo de embeddings: transforma los documentos en representaciones
    vectoriales.

2.  pgvector: almacena y permite consultar las representaciones
    vectoriales.

3.  Modelo generativo: utiliza la información recuperada para generar
    respuestas.

Estos componentes cumplen funciones diferentes y deben mantenerse
identificados dentro de la documentación técnica.

### 8.5. Configuración de modelos y failover

La configuración comunicada por el equipo utiliza OpenRouter como
plataforma de acceso a modelos generativos.

Los modelos contemplados son:

- Ling 3.0 Flash como modelo principal.

- Qwen 3.6 Plus como modelo alternativo de respaldo.

El mecanismo de failover permite cambiar al modelo alternativo cuando el
modelo principal presenta problemas de disponibilidad o ejecución.

Esta configuración debe mantenerse sincronizada con los parámetros
reales del backend, verificando los identificadores exactos de los
modelos y las condiciones que activan el cambio.

### 8.6. Documentación y control de cambios

La documentación arquitectónica debe actualizarse cada vez que se
incorporen nuevos componentes, se modifiquen los workflows o se realicen
cambios importantes en la infraestructura.

Los cambios deben registrarse en Git mediante ramas y pull requests,
permitiendo revisar y aprobar las modificaciones antes de incorporarlas
a la rama principal.

## 9. DECISIONES ARQUITECTÓNICAS

Esta sección registra las principales decisiones relacionadas con la
estructura y funcionamiento de AgroSmart-Insights.

Las decisiones que todavía requieren aprobación deben mantenerse
identificadas como pendientes hasta que el equipo las confirme.

| **ID** | **Decisión arquitectónica** | **Estado** |
|:--:|:--:|:--:|
| ADR-01 | Organizar la aplicación mediante cinco microfrontends. | Implementada, según la arquitectura actual. |
| ADR-02 | Utilizar seis workflows en n8n para automatizar los procesos del sistema. | Implementada, según la arquitectura actual. |
| ADR-03 | Utilizar PostgreSQL como sistema principal de almacenamiento. | Implementada. |
| ADR-04 | Incorporar pgvector para la recuperación vectorial del sistema RAG. | Implementada. |
| ADR-05 | Utilizar OpenRouter para acceder a los modelos generativos. | Configuración comunicada; verificar identificadores y failover. |
| ADR-06 | Utilizar Langfuse para observabilidad de IA. | Implementada. |
| ADR-07 | Utilizar Ngrok como puente temporal de comunicación con un servicio local. | Implementada como solución operativa; requiere evaluación. |
| ADR-08 | Mantener GitHub, Render y Vercel como proveedores de infraestructura, utilizando cuentas nuevas para reconstruir el sistema ante una contingencia. |  Acordada por el equipo el 06/11/2026; restauración pendiente de validación.  |
| ADR-09 | Determinar si se conservan las tablas de alertas en inglés. | Pendiente de revisión. |

### 9.1. Decisión sobre infraestructura cloud

En la reunión del 06/11/2026, el equipo acordó mantener GitHub, Render y Vercel como proveedores de infraestructura para la reconstrucción de AgroSmart-Insights ante una contingencia.

Se eligió la alternativa de utilizar cuentas nuevas en los mismos proveedores, en lugar de migrar el sistema a una plataforma cloud diferente, como Azure.

La decisión considera los siguientes aspectos:

- Costos de alojamiento.

- Disponibilidad de los servicios.

- Capacidad de procesamiento.

- Facilidad de mantenimiento.

- Seguridad.

- Escalabilidad.

- Estrategia de respaldo y recuperación.

La reconstrucción se realizará utilizando el código fuente, los respaldos de PostgreSQL, los workflows y los procedimientos documentados en la estrategia de respaldo y restauración.

Estado: Decisión acordada por el equipo el 06/11/2026. La ejecución y validación del procedimiento de restauración permanecen pendientes.

### 9.2. Decisión sobre el uso de OpenRouter

El uso de OpenRouter requiere evaluar los costos asociados al consumo de
modelos generativos.

La evaluación debe considerar:

- Consumo de tokens.

- Disponibilidad de los modelos.

- Calidad de las respuestas.

- Latencia.

- Límites de uso.

- Costos de los modelos.

- Funcionamiento del mecanismo de failover.

La decisión de contratar un plan o asumir costos recurrentes debe ser
aprobada por el equipo y documentada formalmente.

### 9.3. Decisión sobre las tablas de alertas

Se han identificado dos grupos de estructuras relacionadas con alertas.

Por un lado, WF5 utiliza las estructuras correspondientes a
alertas_riesgo.

Por otro lado, existen las tablas alert_rules, risk_alerts y
alert_status_history, cuya utilización desde el repositorio no está
confirmada.

Antes de eliminar o modificar estas estructuras, el equipo debe revisar
sus dependencias, información almacenada y relación con los procesos
desplegados.

## 10. REQUISITOS DE CALIDAD

### 10.1. Rendimiento

El sistema debe proporcionar respuestas dentro de tiempos adecuados para
mantener una experiencia de usuario satisfactoria.

Para las consultas del asistente se ha establecido como referencia de
evaluación una latencia p95 inferior a cuatro segundos.

Este objetivo debe comprobarse mediante pruebas de rendimiento y no debe
considerarse una garantía hasta contar con resultados medidos.

### 10.2. Exactitud de las respuestas

Las respuestas generadas por el asistente deben mantener coherencia con
la información almacenada y las fuentes utilizadas.

Para evaluar la exactitud se requiere utilizar un conjunto de preguntas
y respuestas de referencia denominado Ground Truth.

Las pruebas deben permitir identificar errores numéricos, respuestas
incorrectas y posibles alucinaciones.

### 10.3. Disponibilidad

La plataforma depende de la disponibilidad de sus servicios principales
y externos.

Por ello, deben considerarse mecanismos para gestionar errores de
conexión, indisponibilidad de proveedores y fallas durante la ejecución
de los workflows.

El uso de un modelo alternativo mediante failover también forma parte de
las medidas de continuidad del servicio de inteligencia artificial.

### 10.4. Mantenibilidad

La separación de funcionalidades mediante microfrontends y workflows
permite organizar el sistema por responsabilidades.

Para mantener esta ventaja, cada componente debe contar con una función
definida y una documentación actualizada.

### 10.5. Recuperabilidad

La información del sistema debe contar con mecanismos de respaldo y
procedimientos de restauración.

La recuperación debe validarse mediante pruebas que permitan comprobar
que los datos y configuraciones pueden reconstruirse correctamente.

### 10.6. Seguridad

La plataforma debe proteger sus credenciales, controlar el acceso a los
servicios y evitar la exposición innecesaria de información sensible.

También debe garantizar que las solicitudes recibidas por los endpoints
y webhooks sean validadas antes de ejecutar operaciones.

## 11. RIESGOS Y DEUDA TÉCNICA

La arquitectura actual presenta algunos riesgos que deben ser
considerados para garantizar la estabilidad y evolución del proyecto.

| **Riesgo identificado** | **Posible impacto** | **Tratamiento recomendado** |
|:--:|:--:|:--:|
| Código del puente de comunicación mediante Ngrok no versionado en el repositorio Git. | Dificultad para reconstruir el servicio de ingesta ante una contingencia, debido a que el código necesario no está disponible en el repositorio. | Incorporar el código fuente al repositorio y documentar su configuración y procedimiento de despliegue. |
| Configuraciones y cambios manuales en PostgreSQL y Render no registrados en Git. | Diferencias entre los entornos desplegados y los archivos disponibles para reconstruir el sistema, lo que puede provocar fallos durante la recuperación. | Versionar configuraciones, scripts y migraciones, y mantener sincronizados los cambios realizados en los servicios cloud. |
| Procedimiento de respaldo sin validación integral. | Riesgo de no poder recuperar correctamente la información. | Realizar pruebas de restauración con QA. |
| Configuración de failover no contrastada con el entorno desplegado. | La documentación puede no representar el comportamiento real del backend. | Verificar los modelos y las condiciones de conmutación. |
| Tablas de alertas duplicadas o sin uso confirmado. | Riesgo de mantener estructuras innecesarias o eliminar información requerida. | Revisar dependencias antes de modificarlas. |
| Dependencia de servicios externos. | Una interrupción o cambio en las API puede afectar las funcionalidades. | Implementar mecanismos de control de errores y monitoreo. |
| Modelo de embeddings no confirmado en esta versión documental. | La documentación del flujo RAG puede quedar incompleta. | Revisar la configuración actual de WF0 y WF2. |

### 11.1. Deuda técnica prioritaria

Las principales actividades de mejora identificadas son:

1.  Documentar completamente el funcionamiento del puente Ngrok.

2.  Evaluar una alternativa estable para reemplazar la dependencia de un
    equipo local.

3.  Registrar los cambios manuales realizados en Render y PostgreSQL.

4.  Validar la estrategia de respaldo mediante pruebas reales de
    restauración.

5.  Confirmar los identificadores exactos de los modelos generativos.

6.  Verificar el modelo de embeddings utilizado actualmente.

7.  Formalizar las decisiones relacionadas con infraestructura cloud y
    costos de OpenRouter.

8.  Resolver la situación de las tablas de alertas que no presentan
    referencias confirmadas en el repositorio.

## 12. GLOSARIO

| **Término** | **Definición** |
|:---|:---|
| arc42 | Plantilla utilizada para documentar la arquitectura de un sistema de software. |
| Microfrontend | Módulo independiente de la interfaz web que representa una funcionalidad específica. |
| Workflow | Secuencia de pasos automatizados que ejecuta un proceso. |
| n8n | Plataforma utilizada para automatizar procesos e integrar servicios. |
| PostgreSQL | Sistema gestor de bases de datos relacional. |
| pgvector | Extensión de PostgreSQL que permite almacenar y consultar vectores. |
| Embedding | Representación numérica de un texto utilizada para realizar búsquedas por similitud. |
| RAG | Técnica que combina recuperación de información y generación de respuestas. |
| OpenRouter | Plataforma que permite acceder a diferentes modelos de inteligencia artificial. |
| Failover | Mecanismo que permite cambiar a un servicio alternativo cuando el principal falla. |
| Langfuse | Herramienta para observar y analizar ejecuciones de aplicaciones basadas en IA. |
| Ngrok | Servicio que permite crear túneles de comunicación hacia servicios locales. |
| ADR | Registro formal de una decisión arquitectónica. |
| Ground Truth | Conjunto de información de referencia utilizado para evaluar la exactitud de un sistema. |
| Manifiesto de respaldo | Documento que enumera los elementos que deben incluirse y verificarse durante un respaldo o restauración. |




