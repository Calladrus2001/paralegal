import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  openUploadModal,
  closeUploadModal,
  uploadDocument,
  clearUploadError,
} from "../store/slices/uploadSlice";
import { setSidebarOpen, upsertFile, fetchChatFiles } from "../store/slices/filesSlice";
import { showToast } from "../store/slices/toastSlice";

export interface UploadResult {
  fileId: string;
  fileName: string;
  chatId: string;
}

export function useFileUpload() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.user.userId);
  const activeChatId = useAppSelector((state) => state.chat.activeChatId);
  const { isModalOpen, isUploading, uploadError, uploadSuccess } = useAppSelector(
    (state) => state.upload
  );

  const handleOpenModal = useCallback(() => {
    dispatch(openUploadModal());
  }, [dispatch]);

  const handleCloseModal = useCallback(() => {
    dispatch(closeUploadModal());
  }, [dispatch]);

  const handleUpload = useCallback(
    async (file: File, targetChatId?: string): Promise<UploadResult | null> => {
      const chatId = targetChatId || activeChatId || undefined;

      const action = await dispatch(uploadDocument({ userId, chatId, file }));
      if (uploadDocument.fulfilled.match(action)) {
        const payload = action.payload;

        dispatch(setSidebarOpen(true));
        dispatch(
          upsertFile({
            chatId: payload.chatId,
            fileId: payload.fileId,
            userId,
            fileName: payload.fileName,
            status: "PROCESSING",
            createdAt: payload.uploadedAt,
            updatedAt: payload.uploadedAt,
          })
        );

        dispatch(
          showToast({
            message: `"${file.name}" uploaded. Processing started...`,
            type: "info",
          })
        );
        return payload;
      } else {
        const errorMsg = (action.payload as string) || "Failed to upload document";
        dispatch(
          showToast({
            message: errorMsg,
            type: "error",
          })
        );
        return null;
      }
    },
    [dispatch, userId, activeChatId]
  );

  const handleClearError = useCallback(() => {
    dispatch(clearUploadError());
  }, [dispatch]);

  return {
    isModalOpen,
    isUploading,
    uploadError,
    uploadSuccess,
    openModal: handleOpenModal,
    closeModal: handleCloseModal,
    uploadFile: handleUpload,
    clearError: handleClearError,
  };
}
