import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, CHATS_TABLE, MESSAGES_TABLE } from "../clients/aws";

import type { ChatRecord, MessageRecord } from "../types/chat";

export class ChatService {
  /**
   * Fetch all chats for a given user.
   */
  static async getChatsForUser(userId: string): Promise<ChatRecord[]> {
    const command = new QueryCommand({
      TableName: CHATS_TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: {
        ":uid": userId,
      },
    });

    const result = await dynamo.send(command);
    return (result.Items || []) as ChatRecord[];
  }

  /**
   * Fetch all messages for a given chat.
   */
  static async getMessagesForChat(chatId: string): Promise<MessageRecord[]> {
    const command = new QueryCommand({
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: "chatId = :cid",
      ExpressionAttributeValues: {
        ":cid": chatId,
      },
      ScanIndexForward: true, // chronological order
    });

    const result = await dynamo.send(command);
    return (result.Items || []) as MessageRecord[];
  }

  /**
   * Create a new chat record.
   */
  static async addChat(userId: string, chatId: string, chatTitle: string): Promise<void> {
    const now = new Date().toISOString();
    
    const command = new PutCommand({
      TableName: CHATS_TABLE,
      Item: {
        userId,
        chatId,
        chatTitle,
        createdAt: now,
        lastMessageAt: now,
      },
    });

    await dynamo.send(command);
  }

  /**
   * Add a new message to a chat.
   * This represents the user query and the assistant's response.
   */
  static async addMessage(message: MessageRecord): Promise<void> {
    const command = new PutCommand({
      TableName: MESSAGES_TABLE,
      Item: message,
    });

    await dynamo.send(command);
  }

  /**
   * Lookup a specific message by its responseId using the GSI.
   */
  static async getMessageByResponseId(responseId: string): Promise<MessageRecord | undefined> {
    const command = new QueryCommand({
      TableName: MESSAGES_TABLE,
      IndexName: "responseId-index",
      KeyConditionExpression: "responseId = :rid",
      ExpressionAttributeValues: {
        ":rid": responseId,
      },
    });

    const result = await dynamo.send(command);
    return result.Items?.[0] as MessageRecord | undefined;
  }
}
