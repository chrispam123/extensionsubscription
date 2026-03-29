# infra/modules/api-gateway/outputs.tf

output "api_endpoint" {
  description = "URL base del API Gateway"
  value       = aws_apigatewayv2_api.this.api_endpoint
}
