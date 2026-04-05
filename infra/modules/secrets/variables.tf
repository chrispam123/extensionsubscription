variable "env" {
  description = "Entorno (dev/prod)"
  type        = string
}

variable "google_client_id" {
  description = "ID de cliente de Google OAuth"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Secret de cliente de Google OAuth"
  type        = string
  sensitive   = true
}

variable "google_redirect_uri" {
  description = "URI de redirección configurada en Google Console"
  type        = string
}
