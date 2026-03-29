variable "api_name" {
  description = "Nombre del API Gateway"
  type        = string
}

variable "lambda_function_arn" {
  description = "ARN de la función Lambda para la integración"
  type        = string
}

variable "lambda_function_name" {
  description = "Nombre de la función Lambda para los permisos"
  type        = string
}
