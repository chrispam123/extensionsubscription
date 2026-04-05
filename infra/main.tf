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

  }
}

provider "aws" {
  region = "eu-west-1"
}

module "dynamodb" {
  source = "./modules/dynamodb"

  users_table_name        = "youtube-subs-app-users-${var.env}"
  jobs_table_name         = "youtube-subs-app-jobs-${var.env}"
  job_payloads_table_name = "youtube-subs-app-jobitems-${var.env}"
  quota_ledger_table_name = "youtube-subs-app-quota-ledger-${var.env}"

  tags = {
    project = "youtube-subs"
    env     = var.env
  }
}

# --- RECURSOS DEL BUCKET (Ya deberían estar creados) ---

resource "aws_s3_bucket" "terraform_state" {
  count  = var.env == "prod" ? 1 : 0
  bucket = "nocturne-tfstate-chrispam-2026"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "enabled" {
  count  = var.env == "prod" ? 1 : 0
  bucket = aws_s3_bucket.terraform_state[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "default" {
  count  = var.env == "prod" ? 1 : 0
  bucket = aws_s3_bucket.terraform_state[0].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
# infra/main.tf (continuación)
module "secrets" {
  source = "./modules/secrets"
  env    = var.env

  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
  google_redirect_uri  = var.google_redirect_uri
}

module "youtube_backend_lambda" {
  source        = "./modules/lambda"
  function_name = "youtube-subs-backend-${var.env}"
  source_dir    = "../backend/build_lambda"
  # 2. IMPORTANTE: Indicamos que el archivo está dentro de dist/
  handler = "dist/lambda.handler"
  # PASAMOS EL ARN AQUÍ
  google_secret_arn = module.secrets.secret_arn

  environment_variables = {
    NODE_ENV                = var.env == "prod" ? "production" : "development"
    GOOGLE_SECRET_ARN       = module.secrets.secret_arn
    USERS_TABLE_NAME        = module.dynamodb.users_table_name
    JOBS_TABLE_NAME         = module.dynamodb.jobs_table_name
    JOBITEMS_TABLE_NAME     = module.dynamodb.job_items_table_name
    QUOTA_LEDGER_TABLE_NAME = module.dynamodb.quota_ledger_table_name

    GLOBAL_QUOTA_LIMIT_UNITS         = tostring(10000)
    GLOBAL_QUOTA_SAFETY_MARGIN_UNITS = tostring(500)
    USER_DAILY_SOFT_CAP_UNITS        = tostring(1000)

  }

  dynamodb_table_arns = [
    module.dynamodb.users_table_arn,
    module.dynamodb.jobs_table_arn,
    module.dynamodb.job_items_table_arn,
    module.dynamodb.quota_ledger_table_arn,
  ]
}
module "api_gateway" {
  source               = "./modules/api-gateway"
  api_name             = "youtube-subs-api-${var.env}"
  lambda_function_arn  = module.youtube_backend_lambda.function_arn
  lambda_function_name = module.youtube_backend_lambda.function_name
}
# Output final para ver la URL en la consola
output "backend_url" {
  value = module.api_gateway.api_endpoint
}
