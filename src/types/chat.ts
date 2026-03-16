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
  model?: string;
  topK?: number;
  createdAt: string;
}
