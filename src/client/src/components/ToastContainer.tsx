import React, { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store";
import { hideToast, type ToastItem, type ToastType } from "../store/slices/toastSlice";

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  error: <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
  error: "bg-[#ffffff] border-red-300 text-red-950 shadow-2xl ring-1 ring-red-100",
  success: "bg-[#ffffff] border-emerald-300 text-emerald-950 shadow-2xl ring-1 ring-emerald-100",
  warning: "bg-[#ffffff] border-amber-300 text-amber-950 shadow-2xl ring-1 ring-amber-100",
  info: "bg-[#ffffff] border-blue-300 text-blue-950 shadow-2xl ring-1 ring-blue-100",
};

const ToastMessage: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(hideToast(toast.id));
    }, 5000);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 max-w-md w-full rounded-xl border transition-all duration-200 animate-in fade-in slide-in-from-top-4 ${
        TOAST_STYLES[toast.type]
      }`}
    >
      <div className="mt-0.5">{TOAST_ICONS[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold m-0 leading-snug break-words text-stone-900">
          {toast.message}
        </p>
        {toast.details && (
          <p className="text-[11px] text-stone-600 m-0 mt-1 font-mono break-words leading-tight bg-stone-50 p-1.5 rounded-md border border-stone-200">
            {toast.details}
          </p>
        )}
      </div>
      <button
        onClick={() => dispatch(hideToast(toast.id))}
        className="text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-md cursor-pointer flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useAppSelector((state) => state.toast.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-md w-full px-4">
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
