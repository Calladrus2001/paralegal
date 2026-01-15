resource "aws_s3_bucket" "paralegal_bucket" {
  bucket = "${local.prefix}-paralegal-bucket"
}

resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "${local.prefix}-paralegal-lambda-bucket"
}

resource "aws_s3_bucket_notification" "bucket_notifications" {
  bucket = aws_s3_bucket.paralegal_bucket.id

  queue {
    queue_arn = aws_sqs_queue.paralegal_queue.arn
    events    = ["s3:ObjectCreated:*"]
  }
}
