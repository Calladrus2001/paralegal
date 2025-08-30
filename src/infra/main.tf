resource "aws_s3_bucket" "paralegal_bucket" {
  bucket = "local-paralegal-bucket"
}

resource "aws_sqs_queue" "paralegal_queue" {
  name = "local-paralegal-upload-queue"

  visibility_timeout_seconds     = 30
  receive_wait_time_seconds      = 5
}

resource "aws_sqs_queue_policy" "allow_s3" {
  queue_url = aws_sqs_queue.paralegal_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "Allow-S3-SendMessage"
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
    queue_arn     = aws_sqs_queue.paralegal_queue.arn
    events        = ["s3:ObjectCreated:*"]
  }
}

