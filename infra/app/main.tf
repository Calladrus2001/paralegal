locals {
  env = terraform.workspace

  config = {
    local = {
      use_localstack = true
      prefix         = "local"
      cors_allowed_origins = [
        "http://localhost:5173",
        "https://*.vishesh-dugar.me",
        "https://vishesh-dugar.me"
      ]
    }
    live = {
      use_localstack = false
      prefix         = "live"
      cors_allowed_origins = [
        "https://*.vishesh-dugar.me",
        "https://vishesh-dugar.me"
      ]
    }
  }

  current_config       = lookup(local.config, local.env, local.config["live"])
  use_localstack       = local.current_config.use_localstack
  prefix               = local.current_config.prefix
  cors_allowed_origins = local.current_config.cors_allowed_origins
}

variable "openai_api_key" {
  description = "OpenAI API Key for LLM-based attribution"
  type        = string
  sensitive   = true
  default     = "" // Default is empty for LocalStack or local development
}
