import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { QuotaInfo } from "../../../../types/quota";
import { apiGetQuota } from "../../api/client";

export interface QuotaState {
  remaining: number | null;
  total: number;
  resetsAt: string | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: QuotaState = {
  remaining: null,
  total: 100,
  resetsAt: null,
  isConnected: false,
  isLoading: false,
  error: null,
};

export const fetchQuotaThunk = createAsyncThunk(
  "quota/fetchQuota",
  async (_, { rejectWithValue }) => {
    try {
      return await apiGetQuota();
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load quota");
    }
  }
);

export const quotaSlice = createSlice({
  name: "quota",
  initialState,
  reducers: {
    setQuota(state, action: PayloadAction<QuotaInfo>) {
      state.remaining = action.payload.remaining;
      state.total = action.payload.total;
      state.resetsAt = action.payload.resetsAt;
      state.error = null;
    },
    setIsConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
    decrementQuotaOptimistic(state) {
      if (state.remaining !== null && state.remaining > 0) {
        state.remaining -= 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuotaThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuotaThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.remaining = action.payload.remaining;
        state.total = action.payload.total;
        state.resetsAt = action.payload.resetsAt;
      })
      .addCase(fetchQuotaThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Failed to load quota";
      });
  },
});

export const { setQuota, setIsConnected, decrementQuotaOptimistic } = quotaSlice.actions;
export default quotaSlice.reducer;
