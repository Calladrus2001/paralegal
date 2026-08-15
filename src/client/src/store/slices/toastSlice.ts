import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ToastType = "error" | "success" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  details?: string;
}

interface ToastState {
  toasts: ToastItem[];
}

const initialState: ToastState = {
  toasts: [],
};

export const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast(
      state,
      action: PayloadAction<{
        message: string;
        type?: ToastType;
        details?: string;
        id?: string;
      }>
    ) {
      const id = action.payload.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      state.toasts.push({
        id,
        message: action.payload.message,
        type: action.payload.type || "error",
        details: action.payload.details,
      });
    },
    hideToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const { showToast, hideToast, clearToasts } = toastSlice.actions;
export default toastSlice.reducer;
