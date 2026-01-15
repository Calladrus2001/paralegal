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
