output "secret_arn" {
  value = aws_secretsmanager_secret.google_creds.arn
}
