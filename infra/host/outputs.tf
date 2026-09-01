output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.paralegal_server.public_ip
}

output "ec2_instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.paralegal_server.id
}

output "state_bucket_name" {
  description = "Terraform State S3 Bucket"
  value       = aws_s3_bucket.terraform_state.bucket
}
