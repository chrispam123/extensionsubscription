# extensionsubscription

Chrome extension para exportar e importar suscripciones de YouTube.

## Stack
- **Extension:** TypeScript · Manifest V3 · Vite
- **Backend:** Node.js · Fastify · TypeScript
- **Infra:** Terraform · AWS Lambda · API Gateway

## Requisitos
- Node.js >= 20
- Docker y Docker Compose
- Terraform >= 1.11.0

## Levantar entorno local
```bash
cp .env.example .env
docker compose up
