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

module "dynamodb" {
  source = "./modules/dynamodb"

  users_table_name        = "youtube-subs-app-users-prod"
  jobs_table_name         = "youtube-subs-app-jobs-prod"
  job_payloads_table_name = "youtube-subs-app-job-payloads-prod"
  quota_ledger_table_name = "youtube-subs-app-quota-ledger-prod"

  tags = {
    project = "youtube-subs"
    env     = "prod"
  }
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
module "secrets" {
  source = "./modules/secrets"
}

module "youtube_backend_lambda" {
  source        = "./modules/lambda"
  function_name = "youtube-subs-backend-prod"
  source_dir    = "../backend"
  # 2. IMPORTANTE: Indicamos que el archivo está dentro de dist/
  handler = "dist/lambda.handler"
  # PASAMOS EL ARN AQUÍ
  google_secret_arn = module.secrets.secret_arn

  environment_variables = {
    NODE_ENV          = "production"
    GOOGLE_SECRET_ARN = module.secrets.secret_arn
  }
}
module "api_gateway" {
  source               = "./modules/api-gateway"
  api_name             = "youtube-subs-api-prod"
  lambda_function_arn  = module.youtube_backend_lambda.function_arn
  lambda_function_name = module.youtube_backend_lambda.function_name
}
# Output final para ver la URL en la consola
output "backend_url" {
  value = module.api_gateway.api_endpoint
}
