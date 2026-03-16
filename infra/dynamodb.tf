# ───────────────────────────────────────────
# Chats table
# PK: userId  SK: chatId
# Access: fetch all chats for a user
# ───────────────────────────────────────────
resource "aws_dynamodb_table" "paralegal_chats" {
  name         = "${local.prefix}-paralegal-chats"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "chatId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "chatId"
    type = "S"
  }
}

# ───────────────────────────────────────────
# Messages table
# PK: chatId  SK: createdAt
# Access: fetch all messages for a chat (chronological)
# GSI: lookup message by responseId (for feedback attribution)
# ───────────────────────────────────────────
resource "aws_dynamodb_table" "paralegal_messages" {
  name         = "${local.prefix}-paralegal-messages"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "chatId"
  range_key    = "createdAt"

  attribute {
    name = "chatId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "responseId"
    type = "S"
  }

  global_secondary_index {
    name            = "responseId-index"
    hash_key        = "responseId"
    projection_type = "ALL"
  }
}

# ───────────────────────────────────────────
# Feedbacks table
# PK: responseId  SK: createdAt
# Access: fetch feedback for a response
# GSI: query all feedbacks by status (human queue)
# ───────────────────────────────────────────
resource "aws_dynamodb_table" "paralegal_feedbacks" {
  name             = "${local.prefix}-paralegal-feedbacks"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "responseId"
  range_key        = "createdAt"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "responseId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
}
