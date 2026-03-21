data "archive_file" "attribution_lambda_code" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/attributionLambda"
  output_path = "${path.module}/../dist/attributionLambda.zip"
}

resource "aws_s3_object" "attribution_lambda_zip" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "attributionLambda.zip"
  source = data.archive_file.attribution_lambda_code.output_path
  etag   = filemd5(data.archive_file.attribution_lambda_code.output_path)
}

resource "aws_lambda_function" "attribution_lambda" {
  s3_bucket        = aws_s3_bucket.lambda_bucket.id
  s3_key           = aws_s3_object.attribution_lambda_zip.key
  function_name    = "${local.prefix}_attribution_lambda"
  role             = aws_iam_role.lambda_execution_role.arn
  memory_size      = 256
  timeout          = 30
  handler          = "index.handler"
  source_code_hash = data.archive_file.attribution_lambda_code.output_base64sha256

  runtime = "nodejs20.x"

  environment {
    variables = {
      LOG_LEVEL                         = "info"
      WEAVIATE_HOST                     = local.use_localstack ? "weaviate" : "localhost"
      DYNAMODB_CHATS_TABLE              = aws_dynamodb_table.paralegal_chats.name
      DYNAMODB_MESSAGES_TABLE           = aws_dynamodb_table.paralegal_messages.name
      DYNAMODB_FEEDBACKS_TABLE          = aws_dynamodb_table.paralegal_feedbacks.name
      DYNAMODB_CHUNK_ATTRIBUTIONS_TABLE = aws_dynamodb_table.paralegal_chunk_attributions.name
      SQS_ATTRIBUTION_QUEUE_URL         = aws_sqs_queue.paralegal_attribution_queue.url
      SQS_SCORING_QUEUE_URL             = aws_sqs_queue.paralegal_scoring_queue.url
      REDIS_HOST                        = local.use_localstack ? "redis" : "localhost"
      OPENAI_API_KEY                    = var.openai_api_key
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs_to_attribution" {
  event_source_arn = aws_sqs_queue.paralegal_attribution_queue.arn
  function_name    = aws_lambda_function.attribution_lambda.arn
  enabled          = true
  batch_size       = 1
}
