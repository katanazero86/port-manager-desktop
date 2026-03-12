import SummaryCard from "./SummaryCard";
import FilterSection from "./FilterSection";
import QuickKillSection from "./QuickKillSection";

function Sidebar({
  admin,
  busy,
  summary,
  devPortsOnly,
  onDevPortsOnlyChange,
  onRequestElevation,
  onRunQuickKill,
  quickKillPresets,
  lastUpdated
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[20px] border border-emerald-400/15 bg-slate-900/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
      <h1 className="text-[14px] font-semibold tracking-[0.02em] text-slate-50">Port Manager Desktop</h1>
      <p className="mt-2 leading-5 text-slate-400">
        포트 조회, CPU/메모리 모니터링, 개발자용 Quick Kill을 한 화면에서 처리합니다.
      </p>

      <section className={`mt-4 rounded-2xl border p-3 ${admin?.isAdmin ? "border-emerald-400/25 bg-emerald-400/10" : "border-slate-800 bg-slate-950/70"}`}>
        <p className="text-slate-400">권한 상태</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <strong className="text-[14px] font-semibold text-slate-100">{admin?.label ?? "확인 중..."}</strong>
          {!admin?.isAdmin && admin?.supported ? (
            <button
              type="button"
              onClick={onRequestElevation}
              disabled={busy}
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-slate-100 transition hover:bg-cyan-400/20 disabled:cursor-wait disabled:opacity-60"
            >
              관리자 권한 요청
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 grid gap-2">
        <SummaryCard label="전체 포트" value={summary.total} tone="emerald" />
        <SummaryCard label="TCP" value={summary.tcp} tone="cyan" />
        <SummaryCard label="UDP" value={summary.udp} tone="amber" />
      </section>

      <FilterSection
        devPortsOnly={devPortsOnly}
        onDevPortsOnlyChange={onDevPortsOnlyChange}
      />

      <QuickKillSection
        busy={busy}
        presets={quickKillPresets}
        onRunQuickKill={onRunQuickKill}
      />

      <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-slate-400">
        <p>{lastUpdated}</p>
      </div>
    </aside>
  );
}

export default Sidebar;