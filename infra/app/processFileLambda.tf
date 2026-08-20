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
  name               = "${local.prefix}_lambda_execution_role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda_permissions" {
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:BatchWriteItem",
      "dynamodb:BatchGetItem",
      "dynamodb:DescribeTable"
    ]
    resources = [
      aws_dynamodb_table.paralegal_feedbacks.arn,
      "${aws_dynamodb_table.paralegal_feedbacks.arn}/index/*",
      aws_dynamodb_table.paralegal_messages.arn,
      "${aws_dynamodb_table.paralegal_messages.arn}/index/*",
      aws_dynamodb_table.paralegal_chats.arn,
      "${aws_dynamodb_table.paralegal_chats.arn}/index/*",
      aws_dynamodb_table.paralegal_chunk_stats.arn,
      aws_dynamodb_table.paralegal_chunk_attributions.arn,
      aws_dynamodb_table.paralegal_files.arn
    ]
  }

  statement {
    actions = [
      "dynamodb:DescribeStream",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:ListStreams"
    ]
    resources = [
      aws_dynamodb_table.paralegal_feedbacks.stream_arn
    ]
  }

  statement {
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:SendMessage"
    ]
    resources = [
      aws_sqs_queue.paralegal_queue.arn,
      aws_sqs_queue.paralegal_attribution_queue.arn,
      aws_sqs_queue.paralegal_scoring_queue.arn
    ]
  }

  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.paralegal_bucket.arn}/*"]
  }
}

resource "aws_iam_role_policy" "lambda_custom_policy" {
  name   = "${local.prefix}_lambda_custom_policy"
  role   = aws_iam_role.lambda_execution_role.id
  policy = data.aws_iam_policy_document.lambda_permissions.json
}

data "archive_file" "process_file_lambda_code" {
  type        = "zip"
  source_dir  = "${path.module}/../../dist/server/processFileLambda"
  output_path = "${path.module}/../../dist/server/processFileLambda.zip"
}

resource "aws_s3_object" "process_file_lambda_zip" {
  bucket = aws_s3_bucket.lambda_bucket.id
  key    = "processFileLambda.zip"
  source = data.archive_file.process_file_lambda_code.output_path
  etag   = filemd5(data.archive_file.process_file_lambda_code.output_path)
}

resource "aws_lambda_function" "process_file_lambda" {
  s3_bucket        = aws_s3_bucket.lambda_bucket.id
  s3_key           = aws_s3_object.process_file_lambda_zip.key
  function_name    = "${local.prefix}_process_file_lambda"
  role             = aws_iam_role.lambda_execution_role.arn
  memory_size      = 256
  timeout          = 90
  handler          = "index.handler"
  source_code_hash = data.archive_file.process_file_lambda_code.output_base64sha256

  runtime = "nodejs20.x"

  environment {
    variables = {
      LOG_LEVEL            = "info"
      WEAVIATE_HOST        = local.use_localstack ? "weaviate" : "localhost"
      OPENAI_API_KEY       = var.openai_api_key
      DYNAMODB_FILES_TABLE = aws_dynamodb_table.paralegal_files.name
    }
  }
}

resource "aws_lambda_event_source_mapping" "sqs_to_process_file" {
  event_source_arn = aws_sqs_queue.paralegal_queue.arn
  function_name    = aws_lambda_function.process_file_lambda.arn
  enabled          = true
  batch_size       = 1
}
