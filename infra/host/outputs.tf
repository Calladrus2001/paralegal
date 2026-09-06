output "server_ipv4" {
  description = "Public IPv4 of the Hetzner server"
  value       = hcloud_server.paralegal.ipv4_address
}

output "server_id" {
  description = "Hetzner Server ID"
  value       = hcloud_server.paralegal.id
}

output "state_bucket_name" {
  description = "Terraform State S3 Bucket"
  value       = aws_s3_bucket.terraform_state.bucket
}
