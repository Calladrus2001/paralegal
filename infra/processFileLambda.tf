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

data "archive_file" "process_file_lambda_code" {
  type        = "zip"
  source_file = "${path.module}/../dist/processFileLambda/index.js"
  output_path = "${path.module}/../dist/processFileLambda.zip"
}

resource "aws_lambda_function" "process_file_lambda" {
  filename         = data.archive_file.process_file_lambda_code.output_path
  function_name    = "${local.prefix}_process_file_lambda"
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
