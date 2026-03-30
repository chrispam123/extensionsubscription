// backend/src/local.ts
import app from './app.js'

const start = async () => {
  try {
    await app.listen({
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0'
    })
// eslint-disable-next-line no-console
    console.log("Server listening on port 3000")
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
