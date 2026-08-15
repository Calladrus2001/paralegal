import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiGetPresignedUrl, apiUploadFileToS3 } from "../../api/client";

interface UploadState {
  isModalOpen: boolean;
  isUploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
}

const initialState: UploadState = {
  isModalOpen: false,
  isUploading: false,
  uploadError: null,
  uploadSuccess: false,
};

export const uploadDocument = createAsyncThunk(
  "upload/uploadDocument",
  async (
    { userId, chatId, file }: { userId: string; chatId?: string; file: File },
    { rejectWithValue }
  ) => {
    try {
      const { url, fileId, chatId: resolvedChatId } = await apiGetPresignedUrl({ userId, chatId });
      await apiUploadFileToS3(url, file);

      return {
        fileId,
        fileName: file.name,
        chatId: resolvedChatId,
        uploadedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to upload document");
    }
  }
);

export const uploadSlice = createSlice({
  name: "upload",
  initialState,
  reducers: {
    openUploadModal(state) {
      state.isModalOpen = true;
      state.uploadError = null;
      state.uploadSuccess = false;
    },
    closeUploadModal(state) {
      state.isModalOpen = false;
      state.uploadError = null;
      state.uploadSuccess = false;
    },
    clearUploadError(state) {
      state.uploadError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadDocument.pending, (state) => {
        state.isUploading = true;
        state.uploadError = null;
        state.uploadSuccess = false;
      })
      .addCase(uploadDocument.fulfilled, (state) => {
        state.isUploading = false;
        state.uploadSuccess = true;
        state.isModalOpen = false;
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadError = (action.payload as string) || "Upload failed";
      });
  },
});

export const { openUploadModal, closeUploadModal, clearUploadError } = uploadSlice.actions;
export default uploadSlice.reducer;
