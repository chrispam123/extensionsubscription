# infra/modules/secrets/main.tf

resource "aws_secretsmanager_secret" "google_creds" {
  name        = "youtube-subs-google-creds-${var.env}"
  description = "Credenciales de Google OAuth2 para la extensión"
}

# Nota: No ponemos el valor aquí. 
# Lo pondremos una vez manualmente en la consola de AWS 
# o vía CLI para que no quede rastro en el código.
