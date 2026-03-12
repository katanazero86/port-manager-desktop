import { useTranslation } from "react-i18next";

function LanguageSwitcher({ language, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 p-2">
      <label className="mb-2 block text-slate-500" htmlFor="language-select">
        {t("language.label")}
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-emerald-400"
      >
        <option value="en">{t("language.en")}</option>
        <option value="ko">{t("language.ko")}</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;