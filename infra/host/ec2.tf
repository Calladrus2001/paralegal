data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

resource "aws_security_group" "ec2_sg" {
  name        = "${var.project_name}-ec2-sg"
  description = "Security group for Paralegal EC2 host"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP (Caddy SSL verification & web traffic)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

resource "aws_instance" "paralegal_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  instance_market_options {
    market_type = "spot"
    spot_options {
      spot_instance_type             = "persistent"
      instance_interruption_behavior = "stop"
    }
  }

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    delete_on_termination = true
  }

  tags = {
    Name = "${var.project_name}-server"
  }
}

resource "cloudflare_record" "paralegal_ui" {
  zone_id = var.cloudflare_zone_id
  name    = "paralegal"
  value   = aws_instance.paralegal_server.public_ip
  type    = "A"
  proxied = false
  ttl     = 60
}

resource "cloudflare_record" "paralegal_api" {
  zone_id = var.cloudflare_zone_id
  name    = "api.paralegal"
  value   = aws_instance.paralegal_server.public_ip
  type    = "A"
  proxied = false
  ttl     = 60
}

resource "cloudflare_record" "paralegal_aws" {
  zone_id = var.cloudflare_zone_id
  name    = "aws.paralegal"
  value   = aws_instance.paralegal_server.public_ip
  type    = "A"
  proxied = false
  ttl     = 60
}
