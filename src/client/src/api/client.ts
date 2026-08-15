import type { Chat, Message } from "../../../types/chat";
import type { FeedbackSubmissionPayload } from "../../../types/feedback";

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorData: any = {};
    try {
      errorData = await res.json();
    } catch {
      errorData = { error: res.statusText };
    }

    let message = errorData.error || errorData.message || `Request failed with status ${res.status}`;
    if (Array.isArray(errorData.details) && errorData.details.length > 0) {
      const formattedDetails = errorData.details
        .map((d: any) => `${d.path ? d.path.join(".") : "field"}: ${d.message}`)
        .join("; ");
      message = `${message} (${formattedDetails})`;
    } else if (typeof errorData.details === "string") {
      message = `${message}: ${errorData.details}`;
    }

    throw new ApiError(res.status, message, errorData.details);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetch all chats for a user
 */
export async function apiGetChats(userId: string): Promise<Chat[]> {
  const res = await fetch(`${API_BASE}/chats?userId=${encodeURIComponent(userId)}`);
  const data = await handleResponse<{ chats: Chat[] }>(res);
  return data.chats;
}

/**
 * Create a new chat record
 */
export async function apiCreateChat(
  userId: string,
  chatTitle: string,
  chatId?: string
): Promise<Chat> {
  const res = await fetch(`${API_BASE}/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, chatTitle, chatId }),
  });
  return handleResponse<Chat>(res);
}

/**
 * Delete a chat session
 */
export async function apiDeleteChat(
  userId: string,
  chatId: string
): Promise<{ success: boolean; chatId: string }> {
  const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(chatId)}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  return handleResponse<{ success: boolean; chatId: string }>(res);
}

/**
 * Fetch all messages for a chat
 */
export async function apiGetMessages(chatId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/chats/${encodeURIComponent(chatId)}/messages`);
  const data = await handleResponse<{ messages: Message[] }>(res);
  return data.messages;
}

/**
 * Send a question to the LLM
 */
export async function apiSendQuery(params: {
  userId: string;
  chatId: string;
  query: string;
}): Promise<{ responseId: string; response: string }> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse<{ responseId: string; response: string }>(res);
}

/**
 * Get S3 presigned upload URL for a PDF file
 */
export async function apiGetPresignedUrl(params: {
  userId: string;
  chatId?: string;
}): Promise<{ url: string; fileId: string; chatId: string }> {
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return handleResponse<{ url: string; fileId: string; chatId: string }>(res);
}

/**
 * Directly upload binary PDF to S3 using presigned PUT URL
 */
export async function apiUploadFileToS3(presignedUrl: string, file: File): Promise<void> {
  try {
    const res = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": "application/pdf",
      },
    });
    if (!res.ok) {
      throw new ApiError(res.status, `S3 upload failed with HTTP status ${res.status}`);
    }
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new Error(
      `Direct S3 upload failed (${err.message || "Network or CORS error"}). Verify S3 is reachable.`
    );
  }
}

/**
 * Submit user feedback on a response
 */
export async function apiSubmitFeedback(payload: FeedbackSubmissionPayload): Promise<{ success: boolean; feedbackId: string }> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean; feedbackId: string }>(res);
}
