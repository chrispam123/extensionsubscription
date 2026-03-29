
# 1. Crear el API HTTP
resource "aws_apigatewayv2_api" "this" {
  name          = var.api_name
  protocol_type = "HTTP"
  
  # CORS: Permitimos que nuestra extensión hable con el API
  cors_configuration {
    allow_origins = ["*"] # En producción podrías restringirlo al ID de la extensión
    allow_methods = ["GET", "POST", "OPTIONS", "DELETE", "PUT"]
    allow_headers = ["content-type", "authorization"]
  }
}

# 2. Crear el Stage (el entorno, por defecto $default)
resource "aws_apigatewayv2_stage" "this" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
}

# 3. Integración con la Lambda
resource "aws_apigatewayv2_integration" "this" {
  api_id           = aws_apigatewayv2_api.this.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.lambda_function_arn
  payload_format_version = "2.0"
}

# 4. Ruta (Catch-all): Todo lo que llegue va a la integración
resource "aws_apigatewayv2_route" "this" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.this.id}"
}

# 5. Permiso para que API Gateway pueda llamar a la Lambda
# PRINCIPIO DE SEGURIDAD: La Lambda no acepta llamadas de nadie por defecto.
resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/*/*"
}
