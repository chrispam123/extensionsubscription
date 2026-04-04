variable "env" {
  description = "Environment name. Example: dev, prod"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env must be one of: dev, prod"
  }
}
