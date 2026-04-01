output "users_table_name" {
  description = "Nombre de la tabla de usuarios"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "ARN de la tabla de usuarios"
  value       = aws_dynamodb_table.users.arn
}
output "jobs_table_name" {
  description = "Nombre de la tabla de jobs"
  value       = aws_dynamodb_table.jobs.name
}

output "jobs_table_arn" {
  description = "ARN de la tabla de jobs"
  value       = aws_dynamodb_table.jobs.arn
}

output "job_items_table_name" {
  description = "Nombre de la tabla de job items (progreso por canal)"
  value       = aws_dynamodb_table.job_items.name
}

output "job_items_table_arn" {
  description = "ARN de la tabla de job items (progreso por canal)"
  value       = aws_dynamodb_table.job_items.arn
}

output "quota_ledger_table_name" {
  description = "Nombre de la tabla de quota ledger"
  value       = aws_dynamodb_table.quota_ledger.name
}

output "quota_ledger_table_arn" {
  description = "ARN de la tabla de quota ledger"
  value       = aws_dynamodb_table.quota_ledger.arn
}
