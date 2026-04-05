variable "env" {
  description = "Environment name. Example: dev, prod"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env must be one of: dev, prod"
  }
}

# AÑADIMOS estas tres para el Secreto de Google
variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "google_redirect_uri" {
  description = "Google OAuth Redirect URI"
  type        = string
  sensitive   = true
}
