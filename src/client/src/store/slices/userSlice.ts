import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  userId: string;
}

const initialState: UserState = {
  userId: localStorage.getItem("paralegal_userId") || "lawyer_alice",
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserId(state, action: PayloadAction<string>) {
      state.userId = action.payload;
      localStorage.setItem("paralegal_userId", action.payload);
    },
  },
});

export const { setUserId } = userSlice.actions;
export default userSlice.reducer;
