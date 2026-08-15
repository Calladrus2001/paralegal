resource "aws_s3_bucket" "paralegal_bucket" {
  bucket = "${local.prefix}-paralegal-bucket"
}

resource "aws_s3_bucket_cors_configuration" "paralegal_bucket_cors" {
  bucket = aws_s3_bucket.paralegal_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = local.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
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
