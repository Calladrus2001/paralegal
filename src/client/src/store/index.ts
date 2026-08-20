import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import userReducer from "./slices/userSlice";
import chatReducer from "./slices/chatSlice";
import uploadReducer from "./slices/uploadSlice";
import feedbackReducer from "./slices/feedbackSlice";
import toastReducer from "./slices/toastSlice";
import filesReducer from "./slices/filesSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    upload: uploadReducer,
    feedback: feedbackReducer,
    toast: toastReducer,
    files: filesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
