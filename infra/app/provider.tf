terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "ap-south-1"

  skip_credentials_validation = local.use_localstack
  skip_requesting_account_id  = local.use_localstack
  skip_metadata_api_check     = local.use_localstack
  s3_use_path_style           = local.use_localstack

  dynamic "endpoints" {
    for_each = local.use_localstack ? [1] : []
    content {
      s3       = "http://localhost:4566"
      sqs      = "http://localhost:4566"
      sts      = "http://localhost:4566"
      iam      = "http://localhost:4566"
      lambda   = "http://localhost:4566"
      dynamodb = "http://localhost:4566"
    }
  }
}
