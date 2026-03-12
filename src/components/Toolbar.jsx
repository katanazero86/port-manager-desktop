import { useTranslation } from "react-i18next";

function Toolbar({ query, onQueryChange, onRefresh, busy }) {
  const { t } = useTranslation();

  return (
    <header className="grid grid-cols-1 gap-3 border-b border-slate-800 pb-3">
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-slate-50">{t("toolbar.title")}</h2>
        <p className="mt-1 text-slate-400">{t("toolbar.description")}</p>
      </div>
      <div className="flex w-full items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("toolbar.placeholder")}
          className="h-9 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="h-9 shrink-0 rounded-xl bg-emerald-400 px-4 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:bg-emerald-400/60"
        >
          {t("toolbar.refresh")}
        </button>
      </div>
    </header>
  );
}

export default Toolbar;