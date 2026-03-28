// app.ts — factory de la aplicación Fastify
// conceptos
// CONCEPTO: este archivo NO sabe nada de Lambda ni de Docker.
// Es Fastify puro. Esa ignorancia es deliberada: es el principio
// de inversión de dependencias aplicado al runtime.
// En local, Docker lo ejecuta directamente con tsx watch.
// En AWS, lambda.ts lo envuelve y lo adapta al handler de Lambda.
// El código de negocio no cambia. Solo cambia quién lo invoca.

import Fastify from 'fastify'

const app = Fastify({
  logger: {
    // CONCEPTO: logs estructurados en JSON.
    // En local los ves formateados en la terminal.
    // En AWS Lambda, CloudWatch los indexa como JSON y puedes
    // hacer queries sobre campos específicos (level, msg, etc).
    // Si usaras console.log, en CloudWatch sería texto plano sin estructura.
    transport: process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined
  }
})

// Health check — el primer endpoint de cualquier servicio profesional
// CONCEPTO: API Gateway, load balancers y sistemas de monitorización
// llaman a este endpoint constantemente para saber si el servicio
// está vivo. Si no responde 200, el sistema lo considera caído.
// En Lambda, este endpoint también sirve para hacer warm-up
// y evitar cold starts en invocaciones críticas.
app.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  }
})

// Arranque del servidor
// CONCEPTO: en Lambda este bloque NO se ejecuta. Lambda no "arranca"
// un servidor, invoca el handler directamente. Este bloque solo
// corre cuando el proceso es de larga duración (local con Docker,
// o si algún día migramos a ECS/Fargate).
const start = async () => {
  try {
    await app.listen({
      port: Number(process.env.PORT) || 3000,
      // '0.0.0.0' es crítico en Docker.
      // 'localhost' o '127.0.0.1' solo escucha dentro del container.
      // '0.0.0.0' escucha en todas las interfaces de red del container,
      // lo que permite que el port mapping de Docker Compose funcione.
      host: '0.0.0.0'
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

export default app
start()

