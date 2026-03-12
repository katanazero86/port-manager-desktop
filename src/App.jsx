import { useDeferredValue, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "./components/Sidebar";
import PortTable from "./components/PortTable";
import Toolbar from "./components/Toolbar";
import StatusBanner from "./components/StatusBanner";
import ConfirmDialog from "./components/ConfirmDialog";

const initialSummary = { total: 0, tcp: 0, udp: 0 };
const quickKillKeys = ["node", "python", "java", "docker"];

function App() {
  const { t, i18n } = useTranslation();
  const [ports, setPorts] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [devPortsOnly, setDevPortsOnly] = useState(false);
  const [status, setStatus] = useState({ message: t("status.loading"), error: false });
  const [lastUpdated, setLastUpdated] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const quickKillPresets = quickKillKeys.map((key) => ({
    key,
    label: t(`quickKill.${key}`)
  }));

  useEffect(() => {
    refreshPorts();
  }, []);

  useEffect(() => {
    if (!lastUpdated) {
      setStatus((current) => ({
        ...current,
        message: t("status.loading")
      }));
    }
  }, [i18n.language]);

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
    setStatus({ message: t("status.refreshing"), error: false });

    try {
      const response = await window.portManager.listPorts();
      setPorts(response.ports);
      setAdmin(response.admin);
      setStatus({ message: t("status.loaded", { count: response.ports.length }), error: false });
      setLastUpdated(new Date().toLocaleString(i18n.language === "ko" ? "ko-KR" : "en-US"));
    } catch (error) {
      setStatus({ message: error.message || t("status.loadFailed"), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function requestElevation() {
    setBusy(true);
    setStatus({ message: t("status.requestingAdmin"), error: false });

    try {
      const response = await window.portManager.requestElevation();
      setStatus({ message: response.message, error: !response.ok });
    } catch (error) {
      setStatus({ message: error.message || t("status.requestAdminFailed"), error: true });
    } finally {
      setBusy(false);
    }
  }

  function runQuickKill(preset) {
    setConfirmState({
      title: preset.label,
      message: t("quickKill.confirmMessage", { label: preset.label }),
      confirmLabel: t("confirm.run"),
      action: async () => {
        setBusy(true);
        setStatus({ message: t("status.quickKillRunning", { label: preset.label }), error: false });

        try {
          const response = await window.portManager.runQuickKill(preset.key);
          setStatus({ message: response.message, error: !response.ok });
          if (response.ok) {
            await refreshPorts();
          }
        } catch (error) {
          setStatus({ message: error.message || t("status.quickKillFailed"), error: true });
        } finally {
          setBusy(false);
        }
      }
    });
  }

  function killPort(pid, port) {
    setConfirmState({
      title: t("confirm.processTitle"),
      message: t("confirm.processMessage", { pid, port }),
      confirmLabel: t("confirm.close"),
      action: async () => {
        setBusy(true);
        setStatus({ message: t("status.killRunning", { pid }), error: false });

        try {
          const response = await window.portManager.killProcess(pid);
          setStatus({ message: response.message, error: !response.ok });
          if (response.ok) {
            await refreshPorts();
          }
        } catch (error) {
          setStatus({ message: error.message || t("status.killFailed"), error: true });
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
        <div className="mx-auto grid h-full max-w-[1024px] grid-cols-[336px_minmax(0,1fr)] gap-3 p-3">
          <Sidebar
            admin={admin}
            busy={busy}
            summary={summary}
            devPortsOnly={devPortsOnly}
            onDevPortsOnlyChange={setDevPortsOnly}
            onRequestElevation={requestElevation}
            onRunQuickKill={runQuickKill}
            quickKillPresets={quickKillPresets}
            lastUpdated={lastUpdated ? t("app.lastUpdated", { value: lastUpdated }) : t("app.lastUpdatedEmpty")}
            language={i18n.language}
            onLanguageChange={(language) => i18n.changeLanguage(language)}
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