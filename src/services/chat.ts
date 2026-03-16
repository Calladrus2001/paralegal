import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, CHATS_TABLE, MESSAGES_TABLE } from "../clients/aws";

export interface ChatRecord {
  chatId: string;
  userId: string;
  chatTitle: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface MessageRecord {
  responseId: string;
  chatId: string;
  userId: string;
  query: string;
  response: string;
  retrievedChunkIds?: string[];
  retrievedScores?: number[];
  createdAt: string;
}

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
      Item: {
        chatId: message.chatId,
        createdAt: message.createdAt,
        responseId: message.responseId,
        userId: message.userId,
        query: message.query,
        response: message.response,
        retrievedChunkIds: message.retrievedChunkIds,
        retrievedScores: message.retrievedScores,
      },
    });

    await dynamo.send(command);
  }
}
