variable "users_table_name" {
  description = "Nombre de la tabla DynamoDB para usuarios"
  type        = string
}

variable "jobs_table_name" {
  description = "Nombre de la tabla DynamoDB para jobs"
  type        = string
}

variable "job_payloads_table_name" {
  description = "Nombre de la tabla DynamoDB para payloads (chunks) de jobs"
  type        = string
}

variable "quota_ledger_table_name" {
  description = "Nombre de la tabla DynamoDB para ledger de cuota (global y por usuario)"
  type        = string
}

variable "global_quota_limit_units" {
  description = "Cuota global diaria del proyecto (units)"
  type        = number
  default     = 10000
}

variable "global_quota_safety_margin_units" {
  description = "Margen de seguridad para no agotar la cuota global (units)"
  type        = number
  default     = 500
}

variable "user_daily_soft_cap_units" {
  description = "Soft cap diario por usuario (units)"
  type        = number
  default     = 1000
}

variable "tags" {
  description = "Tags comunes para recursos"
  type        = map(string)
  default     = {}
}
