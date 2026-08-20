import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo, FILES_TABLE } from "../clients/aws";
import type { ChatFile, FileStatus } from "../../types/file";

export class FileService {
  /**
   * Create an initial file record with status "PROCESSING"
   */
  public static async createFileRecord(params: {
    chatId: string;
    fileId: string;
    userId: string;
    fileName: string;
  }): Promise<ChatFile> {
    const now = new Date().toISOString();
    const fileRecord: ChatFile = {
      chatId: params.chatId,
      fileId: params.fileId,
      userId: params.userId,
      fileName: params.fileName,
      status: "PROCESSING",
      createdAt: now,
      updatedAt: now,
    };

    await dynamo.send(
      new PutCommand({
        TableName: FILES_TABLE,
        Item: fileRecord,
      })
    );

    return fileRecord;
  }

  /**
   * Update the processing status of a file record
   */
  public static async updateFileStatus(
    chatId: string,
    fileId: string,
    status: FileStatus,
    errorMessage?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    const updateExpression = errorMessage
      ? "SET #s = :status, #u = :updatedAt, #err = :errorMessage"
      : "SET #s = :status, #u = :updatedAt REMOVE #err";

    const expressionAttributeNames: Record<string, string> = {
      "#s": "status",
      "#u": "updatedAt",
      ...(errorMessage ? { "#err": "errorMessage" } : { "#err": "errorMessage" }),
    };

    const expressionAttributeValues: Record<string, any> = {
      ":status": status,
      ":updatedAt": now,
      ...(errorMessage ? { ":errorMessage": errorMessage } : {}),
    };

    await dynamo.send(
      new UpdateCommand({
        TableName: FILES_TABLE,
        Key: { chatId, fileId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );
  }

  /**
   * Get all files for a specific chat
   */
  public static async getFilesForChat(chatId: string): Promise<ChatFile[]> {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: FILES_TABLE,
        KeyConditionExpression: "chatId = :c",
        ExpressionAttributeValues: {
          ":c": chatId,
        },
      })
    );

    return (result.Items as ChatFile[]) || [];
  }

  /**
   * Delete a file record from DynamoDB
   */
  public static async deleteFileRecord(chatId: string, fileId: string): Promise<void> {
    await dynamo.send(
      new DeleteCommand({
        TableName: FILES_TABLE,
        Key: { chatId, fileId },
      })
    );
  }
}
