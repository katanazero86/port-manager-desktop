import { useTranslation } from "react-i18next";

function FilterSection({ devPortsOnly, onDevPortsOnlyChange }) {
  const { t } = useTranslation();

  return (
    <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-slate-100">{t("filter.title")}</h2>
        <span className="text-slate-500">{t("filter.badge")}</span>
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-slate-200">
        <input
          type="checkbox"
          checked={devPortsOnly}
          onChange={(event) => onDevPortsOnlyChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-400 focus:ring-emerald-400"
        />
        <span>{t("filter.devPortsOnly")}</span>
      </label>
    </section>
  );
}

export default FilterSection;