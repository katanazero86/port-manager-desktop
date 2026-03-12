import { useTranslation } from "react-i18next";

function PortTable({ ports, busy, onKillPort }) {
  const { t } = useTranslation();

  return (
    <section className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      <div className="h-full overflow-auto">
        <div className="min-w-[1060px]">
          <div className="grid grid-cols-[72px_72px_170px_72px_78px_88px_190px_130px_160px_78px] gap-3 border-b border-slate-800 px-3 py-3 text-slate-400">
            <span>{t("table.port")}</span>
            <span>{t("table.protocol")}</span>
            <span>{t("table.process")}</span>
            <span>{t("table.pid")}</span>
            <span>{t("table.cpu")}</span>
            <span>{t("table.memory")}</span>
            <span>{t("table.local")}</span>
            <span>{t("table.remote")}</span>
            <span>{t("table.state")}</span>
            <span>{t("table.action")}</span>
          </div>

          {ports.length === 0 ? (
            <div className="flex h-[calc(100vh-260px)] items-center justify-center text-slate-500">{t("table.empty")}</div>
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
                <span>{formatMemory(entry.memoryMb, t)}</span>
                <span className="truncate" title={entry.localAddress}>{entry.localAddress}</span>
                <span className="truncate" title={entry.remoteAddress}>{entry.remoteAddress}</span>
                <span className="truncate" title={entry.state}>{entry.state}</span>
                <button
                  type="button"
                  onClick={() => onKillPort(entry.pid, entry.port)}
                  disabled={busy}
                  className="rounded-lg bg-rose-500/15 px-2 py-1 font-semibold text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-wait disabled:opacity-60"
                >
                  {t("table.kill")}
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

function formatMemory(value, t) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} ${t("units.mb")}` : `0.0 ${t("units.mb")}`;
}

export default PortTable;