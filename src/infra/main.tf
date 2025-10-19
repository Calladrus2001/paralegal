resource "aws_s3_bucket" "paralegal_bucket" {
  bucket = "local-paralegal-bucket"
}

resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "local-paralegal-lambda-bucket"
}

resource "aws_sqs_queue" "paralegal_queue" {
  name = "local-paralegal-upload-queue"

  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 5
}

resource "aws_sqs_queue_policy" "allow_s3" {
  queue_url = aws_sqs_queue.paralegal_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Allow-S3-SendMessage"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.paralegal_queue.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = aws_s3_bucket.paralegal_bucket.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_notification" "bucket_notifications" {
  bucket = aws_s3_bucket.paralegal_bucket.id

  queue {
    queue_arn = aws_sqs_queue.paralegal_queue.arn
    events    = ["s3:ObjectCreated:*"]
  }
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda_execution_role" {
  name               = "lambda_execution_role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "archive_file" "process_file_lambda_code" {
  type        = "zip"
  source_file = "${path.module}/../../dist/processFileLambda/index.js"
  output_path = "${path.module}/../../dist/processFileLambda.zip"
}

resource "aws_lambda_function" "process_file_lambda" {
  filename         = data.archive_file.process_file_lambda_code.output_path
  function_name    = "local_process_file_lambda"
  role             = aws_iam_role.lambda_execution_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.process_file_lambda_code.output_base64sha256

  runtime = "nodejs20.x"

  environment {
    variables = {
      LOG_LEVEL = "info"
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs_to_process_file" {
  event_source_arn = aws_sqs_queue.paralegal_queue.arn
  function_name    = aws_lambda_function.process_file_lambda.arn
  enabled          = true
  batch_size       = 1
}
