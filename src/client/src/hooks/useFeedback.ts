import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  toggleFeedbackBox,
  closeFeedbackBox,
  markThumbsUp,
  submitFeedbackThunk,
} from "../store/slices/feedbackSlice";
import { showToast } from "../store/slices/toastSlice";
import type { FeedbackSubmissionPayload } from "../../../types/feedback";

export function useFeedback() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.user.userId);
  const activeChatId = useAppSelector((state) => state.chat.activeChatId);
  const { activeResponseId, submissionStatus, isSubmitting, error } = useAppSelector(
    (state) => state.feedback
  );

  const handleToggle = useCallback(
    (responseId: string) => {
      dispatch(toggleFeedbackBox(responseId));
    },
    [dispatch]
  );

  const handleClose = useCallback(() => {
    dispatch(closeFeedbackBox());
  }, [dispatch]);

  const handleThumbsUp = useCallback(
    (responseId: string) => {
      dispatch(markThumbsUp(responseId));
      dispatch(showToast({ message: "Thank you for the positive feedback.", type: "success" }));
    },
    [dispatch]
  );

  const handleSubmit = useCallback(
    async (params: {
      responseId: string;
      feedbackType: FeedbackSubmissionPayload["feedbackType"];
      bucket: FeedbackSubmissionPayload["bucket"];
      incorrectClaim?: string;
      correctValue?: string;
    }) => {
      if (!activeChatId) {
        dispatch(showToast({ message: "No active consultation context found.", type: "error" }));
        return;
      }

      const action = await dispatch(
        submitFeedbackThunk({
          ...params,
          chatId: activeChatId,
          userId,
        })
      );

      if (submitFeedbackThunk.fulfilled.match(action)) {
        dispatch(showToast({ message: "Issue reported and submitted for verification.", type: "success" }));
      } else {
        const errorMsg = (action.payload as string) || "Failed to submit feedback report";
        dispatch(showToast({ message: errorMsg, type: "error" }));
      }
    },
    [dispatch, activeChatId, userId]
  );

  return {
    activeResponseId,
    submissionStatus,
    isSubmitting,
    error,
    toggleFeedback: handleToggle,
    closeFeedback: handleClose,
    thumbsUp: handleThumbsUp,
    submitFeedback: handleSubmit,
  };
}
