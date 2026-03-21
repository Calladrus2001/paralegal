locals {
  env = terraform.workspace

  config = {
    local = {
      use_localstack = true
      prefix         = "local"
    }
    live = {
      use_localstack = false
      prefix         = "live"
    }
  }

  current_config = lookup(local.config, local.env, local.config["live"])
  use_localstack = local.current_config.use_localstack
  prefix         = local.current_config.prefix
}

variable "openai_api_key" {
  description = "OpenAI API Key for LLM-based attribution"
  type        = string
  sensitive   = true
  default     = "" // Default is empty for LocalStack or local development
}
