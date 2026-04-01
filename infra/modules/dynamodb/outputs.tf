output "users_table_name" {
  description = "Nombre de la tabla de usuarios"
  value       = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  description = "ARN de la tabla de usuarios"
  value       = aws_dynamodb_table.users.arn
}
