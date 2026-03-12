import { useDeferredValue, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import PortTable from "./components/PortTable";
import Toolbar from "./components/Toolbar";
import StatusBanner from "./components/StatusBanner";
import ConfirmDialog from "./components/ConfirmDialog";

const initialSummary = { total: 0, tcp: 0, udp: 0 };
const quickKillPresets = [
  { key: "node", label: "Kill All Node" },
  { key: "python", label: "Kill All Python" },
  { key: "java", label: "Kill All Java" },
  { key: "docker", label: "Kill All Docker" }
];

function App() {
  const [ports, setPorts] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [devPortsOnly, setDevPortsOnly] = useState(false);
  const [status, setStatus] = useState({ message: "포트 목록을 불러오는 중입니다.", error: false });
  const [lastUpdated, setLastUpdated] = useState("마지막 갱신 없음");
  const [confirmState, setConfirmState] = useState(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  useEffect(() => {
    refreshPorts();
  }, []);

  const filteredPorts = ports.filter((entry) => {
    if (devPortsOnly && (entry.port < 3000 || entry.port > 9999)) {
      return false;
    }

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
      entry.remoteAddress,
      String(entry.cpuPercent),
      String(entry.memoryMb)
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

  function runQuickKill(preset) {
    setConfirmState({
      title: preset.label,
      message: `${preset.label}을 실행하면 관련 프로세스가 모두 종료됩니다. 계속하시겠습니까?`,
      confirmLabel: "실행",
      action: async () => {
        setBusy(true);
        setStatus({ message: `${preset.label} 실행 중입니다.`, error: false });

        try {
          const response = await window.portManager.runQuickKill(preset.key);
          setStatus({ message: response.message, error: !response.ok });
          if (response.ok) {
            await refreshPorts();
          }
        } catch (error) {
          setStatus({ message: error.message || "Quick Kill 실행에 실패했습니다.", error: true });
        } finally {
          setBusy(false);
        }
      }
    });
  }

  function killPort(pid, port) {
    setConfirmState({
      title: "프로세스 종료",
      message: `포트 ${port}를 점유한 PID ${pid}를 종료하시겠습니까?`,
      confirmLabel: "종료",
      action: async () => {
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
    });
  }

  async function handleConfirm() {
    const pending = confirmState;
    setConfirmState(null);
    if (pending?.action) {
      await pending.action();
    }
  }

  function handleCancelConfirm() {
    setConfirmState(null);
  }

  return (
    <>
      <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="mx-auto grid h-full max-w-[1024px] grid-cols-[280px_minmax(0,1fr)] gap-3 p-3">
          <Sidebar
            admin={admin}
            busy={busy}
            summary={summary}
            devPortsOnly={devPortsOnly}
            onDevPortsOnlyChange={setDevPortsOnly}
            onRequestElevation={requestElevation}
            onRunQuickKill={runQuickKill}
            quickKillPresets={quickKillPresets}
            lastUpdated={lastUpdated}
          />

          <main className="flex h-full min-h-0 flex-col rounded-[20px] border border-slate-800 bg-slate-900/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.45)]">
            <Toolbar
              query={query}
              onQueryChange={setQuery}
              onRefresh={refreshPorts}
              busy={busy}
            />
            <StatusBanner status={status} />
            <PortTable ports={filteredPorts} busy={busy} onKillPort={killPort} />
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </>
  );
}

export default App;