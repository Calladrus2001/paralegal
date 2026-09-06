variable "aws_region" {
  description = "AWS region for S3 state backend"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "paralegal"
}

variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "server_type" {
  description = "Hetzner server type"
  type        = string
  default     = "cx23"
}

variable "location" {
  description = "Hetzner datacenter location"
  type        = string
  default     = "fsn1"
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
  default     = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDfffSWbXeqd4jAD26flRoVNrh0gJjRYCAH7bwLEOTjr9d6vL7GT2K1OZXI6ExhQQoy68pITjo/Z+ooerfn5DQd9QkyDDPJnd4MWC4zom2jIGU2JmlV+FO9swL5gRv/wOBIzyts8Ipce0DIJfLLRS/DtqiZgjOoZhOWP5pBjZPAJG+LYTzq5l2UxYf842GItZfzxT/7kYrzQS+HC0H/VE8pq9v63uTMjU3JYA+7w2a8MdxxIOnnjOHY5wlH1McBHHE5a7Y1W5Lcdu+5j8I4EbuusXOmwfrzdM4KJEsZ6PAv4nHjmzj90uW+q4WBdDSM2PdLsr/SBI05nSA+aN9hHebP"
}

variable "state_bucket_name" {
  description = "Name for the S3 bucket storing remote terraform state"
  type        = string
  default     = "paralegal-tf-state"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token for updating DNS records"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
  sensitive   = true
}
