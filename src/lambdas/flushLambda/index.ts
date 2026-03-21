import { ReputationService } from "../../services/reputation";

/**
 * Flush Lambda (Aggregation Layer)
 * Triggered by EventBridge Cron every 30 mins (Step 9/10)
 * Goal: Batch-process all "dirty" chunks from Redis, apply decay, 
 * update DynamoDB STATS and Sync Weaviate metadata.
 */
export const handler = async () => {
  console.log("Starting periodic reputation flush...");

  try {
    // 1. Identify all chunks that have pending increments in Redis
    const dirtyChunkIds = await ReputationService.getDirtyChunkIds();
    
    if (dirtyChunkIds.length === 0) {
      console.log("No dirty chunks found. Nothing to flush.");
      return;
    }

    console.log(`Found ${dirtyChunkIds.length} chunks with pending reputation data. Processing...`);

    // 2. Process each chunk in parallel.
    const results = await Promise.allSettled(
      dirtyChunkIds.map(chunkId => ReputationService.flushChunkReputation(chunkId))
    );

    const succeededCount = results.filter(r => r.status === "fulfilled").length;
    const failedResults = results.filter(r => r.status === "rejected") as PromiseRejectedResult[];

    console.log(`Flush complete. Succeeded: ${succeededCount}, Failed: ${failedResults.length}`);
    
    if (failedResults.length > 0) {
      console.warn(`Encountered ${failedResults.length} failures during reputation flush.`);
      failedResults.forEach((r, i) => {
        const chunkId = dirtyChunkIds[results.findIndex(res => res === r)];
        console.error(`Failed to flush chunk ${chunkId}. Reason:`, r.reason);
      });
      // We don't throw yet, allowing the lambda to finish successfully for the ones that worked.
      // The dirty ones haven't been deleted from Redis, so they'll retry in 30 mins.
    }

  } catch (error) {
    console.error("Critical error in Flush Lambda:", error);
  }
};
