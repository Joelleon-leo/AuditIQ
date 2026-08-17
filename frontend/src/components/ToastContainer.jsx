import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export const ToastContainer = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-notifications-container"
      className="fixed bottom-12 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto rounded-xl p-3.5 shadow-xl border flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 ${
              isSuccess
                ? "bg-white border-emerald-200 text-slate-800"
                : isError
                ? "bg-white border-rose-200 text-slate-800"
                : "bg-white border-indigo-200 text-slate-800"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-indigo-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-xs text-slate-900 leading-tight">
                {toast.title}
              </h5>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
