import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { FeedbackSubmissionPayload, FeedbackStatus } from "../../../../types/feedback";
import { apiSubmitFeedback } from "../../api/client";

interface FeedbackState {
  activeResponseId: string | null; // which message has feedback box open
  submissionStatus: Record<string, FeedbackStatus>; // responseId -> status
  isSubmitting: boolean;
  error: string | null;
}

const initialState: FeedbackState = {
  activeResponseId: null,
  submissionStatus: {},
  isSubmitting: false,
  error: null,
};

export const submitFeedbackThunk = createAsyncThunk(
  "feedback/submitFeedback",
  async (payload: FeedbackSubmissionPayload, { rejectWithValue }) => {
    try {
      const result = await apiSubmitFeedback(payload);
      return { responseId: payload.responseId, feedbackId: result.feedbackId };
    } catch (err: any) {
      return rejectWithValue({
        responseId: payload.responseId,
        error: err.message || "Failed to submit feedback",
      });
    }
  }
);

export const feedbackSlice = createSlice({
  name: "feedback",
  initialState,
  reducers: {
    toggleFeedbackBox(state, action: PayloadAction<string>) {
      const responseId = action.payload;
      state.activeResponseId = state.activeResponseId === responseId ? null : responseId;
      state.error = null;
    },
    closeFeedbackBox(state) {
      state.activeResponseId = null;
      state.error = null;
    },
    markThumbsUp(state, action: PayloadAction<string>) {
      const responseId = action.payload;
      state.submissionStatus[responseId] = "submitted";
      if (state.activeResponseId === responseId) {
        state.activeResponseId = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitFeedbackThunk.pending, (state, action) => {
        state.isSubmitting = true;
        state.error = null;
        const responseId = action.meta.arg.responseId;
        state.submissionStatus[responseId] = "submitting";
      })
      .addCase(submitFeedbackThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const { responseId } = action.payload;
        state.submissionStatus[responseId] = "submitted";
        state.activeResponseId = null;
      })
      .addCase(submitFeedbackThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        const payload = action.payload as { responseId: string; error: string } | undefined;
        if (payload) {
          state.submissionStatus[payload.responseId] = "error";
          state.error = payload.error;
        } else {
          state.error = "Feedback submission failed";
        }
      });
  },
});

export const { toggleFeedbackBox, closeFeedbackBox, markThumbsUp } = feedbackSlice.actions;
export default feedbackSlice.reducer;
