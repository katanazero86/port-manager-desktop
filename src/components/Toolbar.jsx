function Toolbar({ query, onQueryChange, onRefresh, busy }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
      <div>
        <h2 className="text-[14px] font-semibold text-slate-50">포트 목록</h2>
        <p className="mt-1 text-slate-400">포트, PID, 프로세스명, CPU, 메모리 기준으로 검색할 수 있습니다.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="포트, 프로세스명, PID 검색"
          className="h-9 w-[240px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="h-9 rounded-xl bg-emerald-400 px-4 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:bg-emerald-400/60"
        >
          새로고침
        </button>
      </div>
    </header>
  );
}

export default Toolbar;