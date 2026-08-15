import { BatchGetCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../clients/aws";
import pRetry from "p-retry";

const BATCH_GET_LIMIT = 100;
const BATCH_WRITE_LIMIT = 25;

/**
 * Performs a DynamoDB BatchGetItem with automatic chunking (100-item limit per request)
 * and exponential backoff retry logic for both transient errors and unprocessed keys.
 *
 * @param tableName - The DynamoDB table to read from.
 * @param keys - An array of key objects (each matching the table's key schema).
 * @returns A flat array of all retrieved items.
 */
export async function batchGetItems(
  tableName: string,
  keys: Record<string, any>[]
): Promise<Record<string, any>[]> {
  if (keys.length === 0) return [];

  const allItems: Record<string, any>[] = [];

  for (let i = 0; i < keys.length; i += BATCH_GET_LIMIT) {
    const batchKeys = keys.slice(i, i + BATCH_GET_LIMIT);
    let pendingKeys: Record<string, any>[] = batchKeys;

    await pRetry(
      async () => {
        const result = await dynamo.send(
          new BatchGetCommand({
            RequestItems: {
              [tableName]: { Keys: pendingKeys },
            },
          })
        );

        allItems.push(...(result.Responses?.[tableName] || []));

        const unprocessed = result.UnprocessedKeys?.[tableName]?.Keys;
        if (unprocessed && unprocessed.length > 0) {
          pendingKeys = unprocessed as Record<string, any>[];
          throw new Error(
            `DynamoDB BatchGetItem had ${pendingKeys.length} unprocessed keys for table "${tableName}"`
          );
        }
      },
      { retries: 5, minTimeout: 100, factor: 2 }
    );
  }

  return allItems;
}

/**
 * Performs a DynamoDB BatchWriteItem with automatic chunking (25-item limit per request)
 * and exponential backoff retry logic for both transient errors and unprocessed items.
 *
 * @param tableName - The DynamoDB table to write to.
 * @param requests - An array of PutRequest/DeleteRequest objects.
 */
export async function batchWriteItems(
  tableName: string,
  requests: Record<string, any>[]
): Promise<void> {
  if (requests.length === 0) return;

  for (let i = 0; i < requests.length; i += BATCH_WRITE_LIMIT) {
    const batch = requests.slice(i, i + BATCH_WRITE_LIMIT);
    let pendingItems: Record<string, any>[] = batch;

    await pRetry(
      async () => {
        const result = await dynamo.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: pendingItems,
            },
          })
        );

        const unprocessed = result.UnprocessedItems?.[tableName];
        if (unprocessed && unprocessed.length > 0) {
          pendingItems = unprocessed;
          throw new Error(
            `DynamoDB BatchWriteItem had ${pendingItems.length} unprocessed items for table "${tableName}"`
          );
        }
      },
      { retries: 5, minTimeout: 100, factor: 2 }
    );
  }
}
