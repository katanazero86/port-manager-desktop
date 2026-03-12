function PortTable({ ports, busy, onKillPort }) {
  return (
    <section className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="h-full overflow-auto">
        <div className="min-w-[1060px]">
          <div className="grid grid-cols-[72px_72px_170px_72px_78px_88px_190px_130px_160px_78px] gap-3 border-b border-slate-800 px-3 py-3 text-slate-400">
            <span>포트</span>
            <span>프로토콜</span>
            <span>프로세스</span>
            <span>PID</span>
            <span>CPU %</span>
            <span>메모리</span>
            <span>로컬 주소</span>
            <span>원격 주소</span>
            <span>상태</span>
            <span>동작</span>
          </div>

          {ports.length === 0 ? (
            <div className="flex h-[calc(100vh-260px)] items-center justify-center text-slate-500">검색 결과가 없습니다.</div>
          ) : (
            ports.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[72px_72px_170px_72px_78px_88px_190px_130px_160px_78px] gap-3 border-b border-slate-900 px-3 py-3 text-slate-200 last:border-b-0 hover:bg-slate-900/70"
              >
                <span className="font-semibold text-emerald-300">{entry.port}</span>
                <span>{entry.protocol}</span>
                <span className="truncate" title={`${entry.processName}\n${entry.command || ""}`}>{entry.processName}</span>
                <span>{entry.pid}</span>
                <span>{formatCpu(entry.cpuPercent)}</span>
                <span>{formatMemory(entry.memoryMb)}</span>
                <span className="truncate" title={entry.localAddress}>{entry.localAddress}</span>
                <span className="truncate" title={entry.remoteAddress}>{entry.remoteAddress}</span>
                <span className="truncate" title={entry.state}>{entry.state}</span>
                <button
                  type="button"
                  onClick={() => onKillPort(entry.pid, entry.port)}
                  disabled={busy}
                  className="rounded-lg bg-rose-500/15 px-2 py-1 font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-wait disabled:opacity-60"
                >
                  Kill
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function formatCpu(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}` : "0.0";
}

function formatMemory(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} MB` : "0.0 MB";
}

export default PortTable;