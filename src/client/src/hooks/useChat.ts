import { useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { useAppDispatch, useAppSelector } from "../store";
import {
  fetchUserChats,
  createNewChat,
  deleteChatThunk,
  fetchChatMessages,
  sendUserQuery,
  setActiveChatId,
} from "../store/slices/chatSlice";
import { showToast } from "../store/slices/toastSlice";

export function useChat() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.user.userId);
  const {
    chats,
    activeChatId,
    messages,
    isFetchingChats,
    isFetchingMessages,
    isSendingQuery,
    error,
  } = useAppSelector((state) => state.chat);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserChats(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (activeChatId) {
      dispatch(fetchChatMessages(activeChatId));
    }
  }, [dispatch, activeChatId]);

  const activeChat = chats.find((c) => c.chatId === activeChatId) || null;

  const handleSelectChat = useCallback(
    (chatId: string) => {
      if (activeChatId !== chatId) {
        dispatch(setActiveChatId(chatId));
      }
    },
    [dispatch, activeChatId]
  );

  const handleCreateChat = useCallback(
    async (title?: string, chatId?: string) => {
      const finalTitle = title || "New Legal Consultation";
      const action = await dispatch(
        createNewChat({
          userId,
          title: finalTitle,
          chatId,
        })
      );
      if (createNewChat.fulfilled.match(action)) {
        return action.payload.chatId;
      }
      const errorMsg = (action.payload as string) || "Failed to create new consultation";
      dispatch(showToast({ message: errorMsg, type: "error" }));
      return null;
    },
    [dispatch, userId]
  );

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      const action = await dispatch(deleteChatThunk({ userId, chatId }));
      if (deleteChatThunk.fulfilled.match(action)) {
        dispatch(showToast({ message: "Consultation deleted.", type: "info" }));
        return true;
      }
      const errorMsg = (action.payload as string) || "Failed to delete consultation";
      dispatch(showToast({ message: errorMsg, type: "error" }));
      return false;
    },
    [dispatch, userId]
  );

  const handleSendMessage = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      let targetChatId = activeChatId;

      if (!targetChatId) {
        const words = query.trim().split(/\s+/).slice(0, 5).join(" ");
        const title = words.length < query.trim().length ? `${words}...` : words;
        const newChatId = nanoid();
        targetChatId = newChatId;

        dispatch(createNewChat({ userId, title, chatId: newChatId }));
      }

      const queryAction = await dispatch(
        sendUserQuery({
          userId,
          chatId: targetChatId,
          query,
        })
      );

      if (sendUserQuery.rejected.match(queryAction)) {
        const payload = queryAction.payload as { error?: string } | undefined;
        const errorMsg = payload?.error || "Failed to get AI response";
        dispatch(showToast({ message: errorMsg, type: "error" }));
      }
    },
    [dispatch, userId, activeChatId]
  );

  return {
    chats,
    activeChat,
    activeChatId,
    messages,
    isFetchingChats,
    isFetchingMessages,
    isSendingQuery,
    error,
    selectChat: handleSelectChat,
    createChat: handleCreateChat,
    deleteChat: handleDeleteChat,
    sendMessage: handleSendMessage,
  };
}
