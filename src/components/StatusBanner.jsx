function StatusBanner({ status }) {
  return (
    <div className={`mt-3 rounded-2xl border px-3 py-2 ${status.error ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : "border-slate-800 bg-slate-950/70 text-slate-300"}`}>
      {status.message}
    </div>
  );
}

export default StatusBanner;