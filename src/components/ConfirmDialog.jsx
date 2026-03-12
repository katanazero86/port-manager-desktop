import { useEffect, useRef } from "react";

function ConfirmDialog({ open, title, message, confirmLabel = "확인", busy, onConfirm, onCancel }) {
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (open) {
      cancelButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-[0_24px_70px_rgba(2,6,23,0.65)]">
        <h2 className="text-[14px] font-semibold text-slate-50">{title}</h2>
        <p className="mt-3 leading-5 text-slate-300">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white transition hover:bg-rose-400 disabled:cursor-wait disabled:bg-rose-500/60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;