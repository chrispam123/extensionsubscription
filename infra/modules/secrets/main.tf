# infra/modules/secrets/main.tf

resource "aws_secretsmanager_secret" "google_creds" {
  name        = "youtube-subs-google-creds-${var.env}"
  description = "Credenciales de Google OAuth2 para la extensión (${var.env})"
}

resource "aws_secretsmanager_secret_version" "google_creds" {
  secret_id     = aws_secretsmanager_secret.google_creds.id
  secret_string = jsonencode({
    GOOGLE_CLIENT_ID     = var.google_client_id
    GOOGLE_CLIENT_SECRET = var.google_client_secret
    GOOGLE_REDIRECT_URI  = var.google_redirect_uri
  })
}
# Nota: No ponemos el valor aquí. 
# Lo pondremos una vez manualmente en la consola de AWS 
# o vía CLI para que no quede rastro en el código.
