// secrets.service.ts — abstracción sobre el origen de los secretos
//
// CONCEPTO: este servicio implementa el patrón Adapter.
// La pregunta que responde es: ¿de dónde vienen los secretos?
//
// En local (NODE_ENV=development):
//   → lee de variables de entorno (.env via docker-compose)
//
// En producción (NODE_ENV=production):
//   → leerá de AWS Secrets Manager vía SDK de AWS
//
// El resto del código no sabe ni le importa de dónde vienen.
// Solo llama a getSecret('GOOGLE_CLIENT_ID') y recibe el valor.
//
// REEMPLAZA: el acceso directo a process.env disperso por todo el código.
// Si mañana cambias de Secrets Manager a Parameter Store o Vault,
// solo cambias este archivo. Nada más.

export interface SecretsService {
  getSecret(key: string): Promise<string>
}

class LocalSecretsService implements SecretsService {
  // En local los secretos vienen de variables de entorno
  // inyectadas por Docker Compose desde el archivo .env
  async getSecret(key: string): Promise<string> {
    const value = process.env[key]

    if (!value) {
      throw new Error(
        `Secret "${key}" not found in environment variables. ` +
        `Did you copy .env.example to .env and fill in the values?`
      )
    }

    return value
  }
}

class AwsSecretsService implements SecretsService {
  // TODO: implementar cuando lleguemos al pipeline de CD
  // Usará @aws-sdk/client-secrets-manager
  // El ARN del secret vendrá de una variable de entorno
  // que Terraform inyecta en la función Lambda
  async getSecret(key: string): Promise<string> {
    throw new Error(`AWS Secrets Service not yet implemented for key: ${key}`)
  }
}

// CONCEPTO: factory function que decide qué implementación usar
// basándose en el entorno. El resto del código importa esta función
// y nunca sabe qué implementación está usando.
export const createSecretsService = (): SecretsService => {
  if (process.env.NODE_ENV === 'production') {
    return new AwsSecretsService()
  }
  return new LocalSecretsService()
}

