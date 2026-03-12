import { useDeferredValue, useEffect, useState } from "react";

const initialSummary = { total: 0, tcp: 0, udp: 0 };

function App() {
  const [ports, setPorts] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [status, setStatus] = useState({ message: "포트 목록을 불러오는 중입니다.", error: false });
  const [lastUpdated, setLastUpdated] = useState("마지막 갱신 없음");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    refreshPorts();
  }, []);

  const filteredPorts = ports.filter((entry) => {
    if (!deferredQuery) {
      return true;
    }

    return [
      String(entry.port),
      entry.protocol,
      entry.processName,
      String(entry.pid),
      entry.state,
      entry.localAddress,
      entry.remoteAddress
    ].some((value) => String(value).toLowerCase().includes(deferredQuery));
  });

  const summary = ports.reduce((accumulator, entry) => {
    accumulator.total += 1;
    if (entry.protocol === "TCP") {
      accumulator.tcp += 1;
    }
    if (entry.protocol === "UDP") {
      accumulator.udp += 1;
    }
    return accumulator;
  }, { ...initialSummary });

  async function refreshPorts() {
    setBusy(true);
    setStatus({ message: "포트 목록을 새로 불러오는 중입니다.", error: false });

    try {
      const response = await window.portManager.listPorts();
      setPorts(response.ports);
      setAdmin(response.admin);
      setStatus({ message: `총 ${response.ports.length}개의 포트를 찾았습니다.`, error: false });
      setLastUpdated(`마지막 갱신 ${new Date().toLocaleString("ko-KR")}`);
    } catch (error) {
      setStatus({ message: error.message || "포트 목록을 불러오지 못했습니다.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function requestElevation() {
    setBusy(true);
    setStatus({ message: "관리자 권한 요청을 전송했습니다.", error: false });

    try {
      const response = await window.portManager.requestElevation();
      setStatus({ message: response.message, error: !response.ok });
    } catch (error) {
      setStatus({ message: error.message || "관리자 권한 요청에 실패했습니다.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function killPort(pid, port) {
    const confirmed = window.confirm(`포트 ${port}를 점유한 PID ${pid}를 종료하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setStatus({ message: `PID ${pid} 종료를 시도하는 중입니다.`, error: false });

    try {
      const response = await window.portManager.killProcess(pid);
      setStatus({ message: response.message, error: !response.ok });
      if (response.ok) {
        await refreshPorts();
      }
    } catch (error) {
      setStatus({ message: error.message || "프로세스 종료에 실패했습니다.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto grid h-full max-w-[1024px] grid-cols-[268px_minmax(0,1fr)] gap-3 p-3">
        <aside className="flex h-full flex-col rounded-[20px] border border-emerald-400/15 bg-slate-900/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
          {/*<p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300">React + Vite + Tailwind</p>*/}
          <h1 className="mt-2 text-[14px] font-semibold tracking-[0.02em] text-slate-50">Port Manager Desktop</h1>
          {/*<p className="mt-2 leading-5 text-slate-400">*/}
          {/*  포트 조회, PID 종료, 관리자 권한 요청을 한 화면에서 처리하도록 정리했습니다.*/}
          {/*</p>*/}

          <section className={`mt-4 rounded-2xl border p-3 ${admin?.isAdmin ? "border-emerald-400/25 bg-emerald-400/10" : "border-slate-800 bg-slate-950/70"}`}>
            <p className="text-slate-400">권한 상태</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <strong className="text-[14px] font-semibold text-slate-100">{admin?.label ?? "확인 중..."}</strong>
              {!admin?.isAdmin && admin?.supported ? (
                <button
                  type="button"
                  onClick={requestElevation}
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

          <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-slate-400">
            <p>{lastUpdated}</p>
          </div>
        </aside>

        <main className="flex h-full min-h-0 flex-col rounded-[20px] border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
          <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-[14px] font-semibold text-slate-50">포트 목록</h2>
              <p className="mt-1 text-slate-400">포트, PID, 프로세스명 기준으로 바로 검색할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="포트, 프로세스명, PID 검색"
                className="h-9 w-[260px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={refreshPorts}
                disabled={busy}
                className="h-9 rounded-xl bg-emerald-400 px-4 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:bg-emerald-400/60"
              >
                새로고침
              </button>
            </div>
          </header>

          <div className={`mt-3 rounded-2xl border px-3 py-2 ${status.error ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : "border-slate-800 bg-slate-950/70 text-slate-300"}`}>
            {status.message}
          </div>

          <section className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
            <div className="grid grid-cols-[72px_72px_1.2fr_80px_88px_1.4fr_1.1fr_78px] gap-3 border-b border-slate-800 px-3 py-3 text-slate-400">
              <span>포트</span>
              <span>프로토콜</span>
              <span>프로세스</span>
              <span>PID</span>
              <span>상태</span>
              <span>로컬 주소</span>
              <span>원격 주소</span>
              <span>동작</span>
            </div>

            <div className="h-[calc(100%-45px)] overflow-y-auto">
              {filteredPorts.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-500">검색 결과가 없습니다.</div>
              ) : (
                filteredPorts.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[72px_72px_1.2fr_80px_88px_1.4fr_1.1fr_78px] gap-3 border-b border-slate-900 px-3 py-3 text-slate-200 last:border-b-0 hover:bg-slate-900/70"
                  >
                    <span className="font-semibold text-emerald-300">{entry.port}</span>
                    <span>{entry.protocol}</span>
                    <span className="truncate" title={entry.processName}>{entry.processName}</span>
                    <span>{entry.pid}</span>
                    <span className="truncate" title={entry.state}>{entry.state}</span>
                    <span className="truncate" title={entry.localAddress}>{entry.localAddress}</span>
                    <span className="truncate" title={entry.remoteAddress}>{entry.remoteAddress}</span>
                    <button
                      type="button"
                      onClick={() => killPort(entry.pid, entry.port)}
                      disabled={busy}
                      className="rounded-lg bg-rose-500/15 px-2 py-1 font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-wait disabled:opacity-60"
                    >
                      Kill
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  const toneClass = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-200"
  }[tone];

  return (
    <article className={`rounded-2xl border p-3 ${toneClass}`}>
      <p>{label}</p>
      <strong className="mt-2 block text-[14px] font-semibold text-white">{value}</strong>
    </article>
  );
}

export default App;
