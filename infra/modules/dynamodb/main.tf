resource "aws_dynamodb_table" "users" {
  name         = var.users_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  deletion_protection_enabled = true

  tags = var.tags
}
resource "aws_dynamodb_table" "jobs" {
  name         = var.jobs_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "jobId"

  attribute {
    name = "jobId"
    type = "S"
  }

  # GSI-1: listar jobs de un user
  attribute {
    name = "userId"
    type = "S"
  }

  # GSI-2: query por status + createdAt (scheduler/worker)
  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "gsi1_userId"
    hash_key        = "userId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "gsi2_status_createdAt"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  deletion_protection_enabled = true

  tags = var.tags
}

resource "aws_dynamodb_table" "job_items" {
  name         = var.job_payloads_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "jobId"
  range_key = "channelId"

  attribute {
    name = "jobId"
    type = "S"
  }

  attribute {
    name = "channelId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  deletion_protection_enabled = true

  tags = var.tags
}

resource "aws_dynamodb_table" "quota_ledger" {
  name         = var.quota_ledger_table_name
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "date"
  range_key = "userId"

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  deletion_protection_enabled = true

  tags = var.tags
}
