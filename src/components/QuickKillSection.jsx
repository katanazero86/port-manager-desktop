function QuickKillSection({ busy, presets, onRunQuickKill }) {
  return (
    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-slate-100">Quick Kill</h2>
        <span className="text-slate-500">Developer</span>
      </div>
      <div className="mt-3 grid gap-2">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onRunQuickKill(preset)}
            disabled={busy}
            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-left text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-wait disabled:opacity-60"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default QuickKillSection;