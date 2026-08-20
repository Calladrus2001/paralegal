variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "paralegal"
}

variable "instance_type" {
  description = "EC2 instance hardware type"
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "EC2 Key Pair name for SSH access"
  type        = string
  default     = "paralegal"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 30
}

variable "state_bucket_name" {
  description = "Name for the S3 bucket storing remote terraform state"
  type        = string
  default     = "paralegal-tf-state"
}
