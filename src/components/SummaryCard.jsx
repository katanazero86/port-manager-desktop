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

export default SummaryCard;