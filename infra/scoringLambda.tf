# ───────────────────────────────────────────
# Scoring Lambda (Real-time Penalty Increment)
# Triggers: Scoring SQS Queue
# ───────────────────────────────────────────

data "archive_file" "scoring_lambda_code" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/scoringLambda"
  output_path = "${path.module}/../dist/scoringLambda.zip"
}

resource "aws_s3_object" "scoring_lambda_zip" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "scoringLambda.zip"
  source = data.archive_file.scoring_lambda_code.output_path
  etag   = filemd5(data.archive_file.scoring_lambda_code.output_path)
}

resource "aws_lambda_function" "scoring_lambda" {
  s3_bucket        = aws_s3_bucket.lambda_bucket.id
  s3_key           = aws_s3_object.scoring_lambda_zip.key
  function_name    = "${local.prefix}_scoring_lambda"
  role             = aws_iam_role.lambda_execution_role.arn
  memory_size      = 256
  timeout          = 30
  handler          = "index.handler"
  source_code_hash = data.archive_file.scoring_lambda_code.output_base64sha256

  runtime = "nodejs20.x"

  environment {
    variables = {
      LOG_LEVEL                = "info"
      REDIS_HOST               = local.use_localstack ? "redis" : "localhost"
      DYNAMODB_FEEDBACKS_TABLE = aws_dynamodb_table.paralegal_feedbacks.name
      DYNAMODB_CHUNK_STATS_TABLE = aws_dynamodb_table.paralegal_chunk_stats.name
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs_to_scoring" {
  event_source_arn = aws_sqs_queue.paralegal_scoring_queue.arn
  function_name    = aws_lambda_function.scoring_lambda.arn
  enabled          = true
  batch_size       = 1
}

# ───────────────────────────────────────────
# Flush Lambda (Periodic Reputation Update)
# Triggers: EventBridge Cron (30 mins)
# ───────────────────────────────────────────

data "archive_file" "flush_lambda_code" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/flushLambda"
  output_path = "${path.module}/../dist/flushLambda.zip"
}

resource "aws_s3_object" "flush_lambda_zip" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "flushLambda.zip"
  source = data.archive_file.flush_lambda_code.output_path
  etag   = filemd5(data.archive_file.flush_lambda_code.output_path)
}

resource "aws_lambda_function" "flush_lambda" {
  s3_bucket        = aws_s3_bucket.lambda_bucket.id
  s3_key           = aws_s3_object.flush_lambda_zip.key
  function_name    = "${local.prefix}_flush_lambda"
  role             = aws_iam_role.lambda_execution_role.arn
  memory_size      = 512
  timeout          = 300 # Longer timeout for batch processing
  handler          = "index.handler"
  source_code_hash = data.archive_file.flush_lambda_code.output_base64sha256

  runtime = "nodejs20.x"

  environment {
    variables = {
      LOG_LEVEL                  = "info"
      REDIS_HOST                 = local.use_localstack ? "redis" : "localhost"
      WEAVIATE_HOST              = local.use_localstack ? "weaviate" : "localhost"
      DYNAMODB_CHUNK_STATS_TABLE = aws_dynamodb_table.paralegal_chunk_stats.name
    }
  }
}

resource "aws_cloudwatch_event_rule" "every_30_minutes" {
  name                = "${local.prefix}-every-30-minutes"
  description         = "Fires every 30 minutes for chunk reputation flushing"
  schedule_expression = "rate(30 minutes)"
}

resource "aws_cloudwatch_event_target" "flush_every_30_minutes" {
  rule      = aws_cloudwatch_event_rule.every_30_minutes.name
  target_id = "flush_lambda"
  arn       = aws_lambda_function.flush_lambda.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_flush" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.flush_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every_30_minutes.arn
}
