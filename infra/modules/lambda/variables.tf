
variable "function_name" {
  description = "Nombre de la función Lambda"
  type        = string
}

variable "handler" {
  description = "Punto de entrada de la función (ej: index.handler)"
  type        = string
  default     = "lambda.handler"
}

variable "runtime" {
  description = "Runtime de Node.js"
  type        = string
  default     = "nodejs20.x"
}
variable "google_secret_arn" {
  description = "ARN del secreto en Secrets Manager"
  type        = string
  default     = "" # Opcional, por si no hay secretos
}

variable "source_dir" {
  description = "Carpeta donde está el código compilado del backend"
  type        = string
}

variable "environment_variables" {
  description = "Variables de entorno para la Lambda"
  type        = map(string)
  default     = {}
}

variable "timeout" {
  description = "Tiempo máximo de ejecución en segundos"
  type        = number
  default     = 15 # Aumentamos a 15 segundos
}
