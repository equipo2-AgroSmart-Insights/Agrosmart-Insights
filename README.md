# AgroSmart Insights - Optimización de Mercados y Precios Agrícolas (Caso 2)

## 📌 Descripción
AgroSmart Insights permite a comerciantes y agricultores tomar decisiones de venta 
informadas mediante consultas en lenguaje natural (NLQ), combinando datos abiertos 
del Ministerio de Agricultura con análisis predictivo por IA.

## 📌 Arquitectura del Sistema
- **Frontend:** Microfrontend NLQ (Natural Language Query)
- **Orquestación:** n8n Self-Hosted (Docker Compose)
- **Base de Datos:** PostgreSQL + pgvector
- **IA Ops:** Observabilidad con Langfuse y Pruebas Unitarias de Prompts

## 🚀 Despliegue Local de Infraestructura
```bash
cd infrastructure
docker-compose up -d
