import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchQuotaThunk, setQuota, setIsConnected } from "../store/slices/quotaSlice";
import type { QuotaInfo } from "../../../types/quota";

export function useQuota() {
  const dispatch = useAppDispatch();
  const { remaining, total, resetsAt, isConnected, isLoading, error } = useAppSelector(
    (state) => state.quota
  );

  useEffect(() => {
    dispatch(fetchQuotaThunk());

    const eventSource = new EventSource("/api/quota/stream");

    eventSource.onopen = () => {
      dispatch(setIsConnected(true));
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as QuotaInfo;
        dispatch(setQuota(data));
      } catch (err) {
        console.error("[useQuota] Failed to parse SSE event data:", err);
      }
    };

    eventSource.onerror = () => {
      dispatch(setIsConnected(false));
    };

    return () => {
      eventSource.close();
      dispatch(setIsConnected(false));
    };
  }, [dispatch]);

  return {
    remaining,
    total,
    resetsAt,
    isConnected,
    isLoading,
    error,
  };
}
