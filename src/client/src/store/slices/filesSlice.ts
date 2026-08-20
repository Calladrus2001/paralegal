import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { ChatFile } from "../../../../types/file";
import { apiGetChatFiles } from "../../api/client";

interface FilesState {
  files: ChatFile[];
  isSidebarOpen: boolean;
  isFetching: boolean;
  error: string | null;
}

const initialState: FilesState = {
  files: [],
  isSidebarOpen: true,
  isFetching: false,
  error: null,
};

export const fetchChatFiles = createAsyncThunk(
  "files/fetchChatFiles",
  async (chatId: string, { rejectWithValue }) => {
    try {
      const files = await apiGetChatFiles(chatId);
      return files;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch files for chat");
    }
  }
);

export const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.isSidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    upsertFile(state, action: PayloadAction<ChatFile>) {
      const index = state.files.findIndex((f) => f.fileId === action.payload.fileId);
      if (index !== -1) {
        state.files[index] = action.payload;
      } else {
        state.files.push(action.payload);
      }
    },
    clearFiles(state) {
      state.files = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatFiles.pending, (state) => {
        state.isFetching = true;
        state.error = null;
      })
      .addCase(fetchChatFiles.fulfilled, (state, action) => {
        state.isFetching = false;
        state.files = action.payload;
      })
      .addCase(fetchChatFiles.rejected, (state, action) => {
        state.isFetching = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSidebarOpen, toggleSidebar, upsertFile, clearFiles } = filesSlice.actions;
export default filesSlice.reducer;
