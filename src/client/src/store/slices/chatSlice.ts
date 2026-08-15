import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { Chat, Message } from "../../../../types/chat";
import { apiGetChats, apiCreateChat, apiDeleteChat, apiGetMessages, apiSendQuery } from "../../api/client";

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messages: Message[];
  isFetchingChats: boolean;
  isFetchingMessages: boolean;
  isSendingQuery: boolean;
  error: string | null;
}

const initialState: ChatState = {
  chats: [],
  activeChatId: null,
  messages: [],
  isFetchingChats: false,
  isFetchingMessages: false,
  isSendingQuery: false,
  error: null,
};

export const fetchUserChats = createAsyncThunk(
  "chat/fetchUserChats",
  async (userId: string, { rejectWithValue }) => {
    try {
      return await apiGetChats(userId);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load chats");
    }
  }
);

export const createNewChat = createAsyncThunk(
  "chat/createNewChat",
  async (
    { userId, title, chatId }: { userId: string; title: string; chatId?: string },
    { rejectWithValue }
  ) => {
    try {
      return await apiCreateChat(userId, title, chatId);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create new chat");
    }
  }
);

export const deleteChatThunk = createAsyncThunk(
  "chat/deleteChatThunk",
  async ({ userId, chatId }: { userId: string; chatId: string }, { rejectWithValue }) => {
    try {
      await apiDeleteChat(userId, chatId);
      return chatId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete chat");
    }
  }
);

export const fetchChatMessages = createAsyncThunk(
  "chat/fetchChatMessages",
  async (chatId: string, { rejectWithValue }) => {
    try {
      const messages = await apiGetMessages(chatId);
      return { chatId, messages };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load messages");
    }
  }
);

export const sendUserQuery = createAsyncThunk(
  "chat/sendUserQuery",
  async (
    params: { userId: string; chatId: string; query: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiSendQuery(params);
      return {
        chatId: params.chatId,
        responseId: res.responseId,
        response: res.response,
        query: params.query,
        userId: params.userId,
      };
    } catch (err: any) {
      return rejectWithValue({
        chatId: params.chatId,
        query: params.query,
        error: err.message || "Failed to get AI response",
      });
    }
  }
);

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChatId(state, action: PayloadAction<string | null>) {
      state.activeChatId = action.payload;
      state.messages = [];
    },
    clearChatError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserChats.pending, (state) => {
        state.isFetchingChats = true;
        state.error = null;
      })
      .addCase(fetchUserChats.fulfilled, (state, action) => {
        state.isFetchingChats = false;
        state.chats = action.payload;
        if (!state.activeChatId && action.payload.length > 0) {
          state.activeChatId = action.payload[0]?.chatId ?? null;
        }
      })
      .addCase(fetchUserChats.rejected, (state, action) => {
        state.isFetchingChats = false;
        state.error = (action.payload as string) || "Failed to load chats";
      });

    builder
      .addCase(createNewChat.fulfilled, (state, action) => {
        state.chats.unshift(action.payload);
        state.activeChatId = action.payload.chatId;
        state.messages = [];
      })
      .addCase(createNewChat.rejected, (state, action) => {
        state.error = (action.payload as string) || "Failed to create chat";
      })
      .addCase(deleteChatThunk.fulfilled, (state, action) => {
        const chatId = action.payload;
        state.chats = state.chats.filter((c) => c.chatId !== chatId);
        if (state.activeChatId === chatId) {
          state.activeChatId = state.chats[0]?.chatId || null;
          state.messages = [];
        }
      });

    builder
      .addCase(fetchChatMessages.pending, (state) => {
        state.isFetchingMessages = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.isFetchingMessages = false;
        if (state.activeChatId === action.payload.chatId) {
          state.messages = action.payload.messages;
        }
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.isFetchingMessages = false;
        state.error = (action.payload as string) || "Failed to load messages";
      });

    builder
      .addCase(sendUserQuery.pending, (state, action) => {
        state.isSendingQuery = true;
        state.error = null;
        const { chatId, query, userId } = action.meta.arg;
        if (state.activeChatId === chatId) {
          state.messages.push({
            responseId: `pending-${action.meta.requestId}`,
            chatId,
            userId,
            query,
            response: "",
            createdAt: new Date().toISOString(),
          });
        }
      })
      .addCase(sendUserQuery.fulfilled, (state, action) => {
        state.isSendingQuery = false;
        const { chatId, responseId, response } = action.payload;
        if (state.activeChatId === chatId) {
          const pendingIndex = state.messages.findIndex(
            (m) => m.responseId === `pending-${action.meta.requestId}`
          );

          if (pendingIndex !== -1) {
            state.messages[pendingIndex] = {
              ...state.messages[pendingIndex]!,
              responseId,
              response,
            };
          } else {
            state.messages.push({
              responseId,
              chatId,
              userId: action.payload.userId,
              query: action.payload.query,
              response,
              createdAt: new Date().toISOString(),
            });
          }
        }
      })
      .addCase(sendUserQuery.rejected, (state, action) => {
        state.isSendingQuery = false;
        const payload = action.payload as { chatId: string; query: string; error: string } | undefined;
        state.error = payload?.error || "Failed to send message";
        const chatId = action.meta.arg.chatId;
        if (state.activeChatId === chatId) {
          state.messages = state.messages.filter(
            (m) => m.responseId !== `pending-${action.meta.requestId}`
          );
        }
      });
  },
});

export const { setActiveChatId, clearChatError } = chatSlice.actions;
export default chatSlice.reducer;
