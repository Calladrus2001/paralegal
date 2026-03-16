data "archive_file" "switch_lambda_code" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/switchLambda"
  output_path = "${path.module}/../dist/switchLambda.zip"
}

resource "aws_s3_object" "switch_lambda_zip" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "switchLambda.zip"
  source = data.archive_file.switch_lambda_code.output_path
  etag   = filemd5(data.archive_file.switch_lambda_code.output_path)
}

resource "aws_lambda_function" "switch_lambda" {
  s3_bucket        = aws_s3_bucket.lambda_bucket.id
  s3_key           = aws_s3_object.switch_lambda_zip.key
  function_name    = "${local.prefix}_switch_lambda"
  role             = aws_iam_role.lambda_execution_role.arn
  memory_size      = 256
  timeout          = 30
  handler          = "index.handler"
  source_code_hash = data.archive_file.switch_lambda_code.output_base64sha256

  runtime = "nodejs20.x"

  environment {
    variables = {
      LOG_LEVEL                 = "info"
      DYNAMODB_CHATS_TABLE      = aws_dynamodb_table.paralegal_chats.name
      DYNAMODB_MESSAGES_TABLE   = aws_dynamodb_table.paralegal_messages.name
      DYNAMODB_FEEDBACKS_TABLE  = aws_dynamodb_table.paralegal_feedbacks.name
      SQS_ATTRIBUTION_QUEUE_URL = aws_sqs_queue.paralegal_attribution_queue.url
      SQS_SCORING_QUEUE_URL     = aws_sqs_queue.paralegal_scoring_queue.url
    }
  }
}

resource "aws_lambda_event_source_mapping" "dynamodb_to_switch" {
  event_source_arn  = aws_dynamodb_table.paralegal_feedbacks.stream_arn
  function_name     = aws_lambda_function.switch_lambda.arn
  starting_position = "LATEST"
  batch_size        = 10

  # Bonus optimization: Only invoke the lambda if the event is an INSERT or MODIFY,
  # and only if there's a status field present in the new image.
  filter_criteria {
    filter {
      pattern = jsonencode({
        eventName = ["INSERT", "MODIFY"]
        dynamodb = {
          NewImage = {
            status = {
              S = [{ "exists" : true }]
            }
          }
        }
      })
    }
  }
}
