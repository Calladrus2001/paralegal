import { PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, CHATS_TABLE, MESSAGES_TABLE } from "../clients/aws";
import { batchWriteItems } from "../utils/dynamodb";
import paralegalVectorDbClient from "../clients/weaviate";
import type { ChatRecord, MessageRecord } from "../../types/chat";

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
    const chats = (result.Items || []) as ChatRecord[];
    return chats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  static async addChat(
    userId: string,
    chatId: string,
    chatTitle: string
  ): Promise<void> {
    const now = new Date().toISOString();

    const command = new PutCommand({
      TableName: CHATS_TABLE,
      Item: {
        userId,
        chatId,
        chatTitle,
        createdAt: now,
      },
    });

    await dynamo.send(command);
  }

  /**
   * Delete a chat record along with its messages and vector database chunks.
   */
  static async deleteChat(userId: string, chatId: string): Promise<void> {
    const deleteChatPromise = dynamo.send(
      new DeleteCommand({
        TableName: CHATS_TABLE,
        Key: {
          userId,
          chatId,
        },
      })
    );

    const messages = await this.getMessagesForChat(chatId);
    const deleteRequests = messages.map((m) => ({
      DeleteRequest: {
        Key: {
          chatId: m.chatId,
          createdAt: m.createdAt,
        },
      },
    }));

    const deleteMessagesPromise = batchWriteItems(MESSAGES_TABLE, deleteRequests);
    const deleteWeaviatePromise = paralegalVectorDbClient.deleteChatChunks(userId, chatId);

    await Promise.all([
      deleteChatPromise,
      deleteMessagesPromise,
      deleteWeaviatePromise,
    ]);
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
