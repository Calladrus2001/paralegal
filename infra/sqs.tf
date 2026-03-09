resource "aws_sqs_queue" "paralegal_queue" {
  name = "${local.prefix}-paralegal-upload-queue"

  visibility_timeout_seconds = 90
  receive_wait_time_seconds  = 5

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.paralegal_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue" "paralegal_dlq" {
  name = "${local.prefix}-paralegal-upload-dlq"
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
