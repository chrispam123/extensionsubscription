terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # EL BLOQUE BACKEND VA AQUÍ DENTRO
  backend "s3" {
    bucket       = "nocturne-tfstate-chrispam-2026"
    key          = "global/s3/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "eu-west-1"
}

# --- RECURSOS DEL BUCKET (Ya deberían estar creados) ---

resource "aws_s3_bucket" "terraform_state" {
  bucket = "nocturne-tfstate-chrispam-2026"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "enabled" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "default" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
# infra/main.tf (continuación)

module "youtube_backend_lambda" {
  source        = "./modules/lambda"
  function_name = "youtube-subs-backend-prod"

  # Apuntamos a la carpeta dist que acabamos de generar
  source_dir = "../backend/dist"

  # El handler en Fastify suele ser el nombre del archivo.nombre_del_handler
  handler = "lambda.handler"

  environment_variables = {
    NODE_ENV = "production"
    # Por ahora usamos placeholders, luego usaremos Secrets Manager
    GOOGLE_CLIENT_ID     = "placeholder-id"
    GOOGLE_CLIENT_SECRET = "placeholder-secret"

  }
}
