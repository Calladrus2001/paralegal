resource "hcloud_ssh_key" "paralegal" {
  name       = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

resource "hcloud_firewall" "paralegal" {
  name = "${var.project_name}-fw"

  rule {
    description = "SSH"
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  rule {
    description = "HTTP"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }

  rule {
    description = "HTTPS"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "paralegal" {
  name        = "${var.project_name}-server"
  server_type = var.server_type
  location    = var.location
  image       = "ubuntu-24.04"

  ssh_keys     = [hcloud_ssh_key.paralegal.id]
  firewall_ids = [hcloud_firewall.paralegal.id]

  labels = {
    project = var.project_name
  }
}

# --- Cloudflare DNS Records ---

resource "cloudflare_record" "paralegal_ui" {
  zone_id = var.cloudflare_zone_id
  name    = "paralegal"
  value   = hcloud_server.paralegal.ipv4_address
  type    = "A"
  proxied = false
  ttl     = 60
}

resource "cloudflare_record" "paralegal_api" {
  zone_id = var.cloudflare_zone_id
  name    = "api.paralegal"
  value   = hcloud_server.paralegal.ipv4_address
  type    = "A"
  proxied = false
  ttl     = 60
}

resource "cloudflare_record" "paralegal_aws" {
  zone_id = var.cloudflare_zone_id
  name    = "aws.paralegal"
  value   = hcloud_server.paralegal.ipv4_address
  type    = "A"
  proxied = false
  ttl     = 60
}
