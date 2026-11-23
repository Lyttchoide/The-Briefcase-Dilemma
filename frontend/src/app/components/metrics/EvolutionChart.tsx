import { TrendingUp } from "lucide-react";
import type { RoundRecord } from "../../../services/game.service";
import { money } from "../../../utils/formatters";

const W = 800;
const H = 220;
const values = (round: RoundRecord) => [
  round.accounts.A.initial,
  round.accounts.A.final,
  round.accounts.B.initial,
  round.accounts.B.final,
];

export function EvolutionChart({ rounds }: { rounds: RoundRecord[] }) {
  const all = rounds.flatMap(values);
  const min = Math.min(...all, 350_000);
  const max = Math.max(...all, 2_000_000);
  const y = (value: number) => H - 20 - ((value - min) / Math.max(1, max - min)) * (H - 40);
  const pathFor = (pick: (round: RoundRecord) => number) =>
    rounds.map((round, i) => `${i ? "L" : "M"} ${(i / 49) * W} ${y(pick(round))}`).join(" ");
  const series = [
    { label: "CF Agente A", color: "#10B981", pick: (r: RoundRecord) => r.accounts.A.final },
    { label: "CF Agente B", color: "#06B6D4", pick: (r: RoundRecord) => r.accounts.B.final },
    {
      label: "CI Agente A",
      color: "#64748B",
      pick: (r: RoundRecord) => r.accounts.A.initial,
      dash: "5 5",
    },
    {
      label: "CI Agente B",
      color: "#F59E0B",
      pick: (r: RoundRecord) => r.accounts.B.initial,
      dash: "5 5",
    },
  ];
  const last = rounds.at(-1);
  return (
    <section className="rounded-xl border border-slate-800 bg-[#111827] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <TrendingUp size={15} className="text-cyan-400" /> Evolución de cuentas
          </div>
          <p className="mt-1 text-[9px] text-slate-600">
            Capital disponible y utilidad acumulada · 50 rondas
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-[9px] text-slate-500">
              <span className="h-px w-3" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex flex-col justify-between py-3 text-[8px] text-slate-700">
          {[max, (max + min) / 2, min].map((v) => (
            <span key={v}>{money(v, true)}</span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="relative h-[210px] w-full overflow-visible"
          preserveAspectRatio="none"
        >
          {[0.15, 0.5, 0.85].map((p) => (
            <line key={p} x1="0" x2={W} y1={H * p} y2={H * p} stroke="#1F2937" strokeWidth="1" />
          ))}
          {series.map((s) => (
            <path
              key={s.label}
              d={pathFor(s.pick)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeDasharray={s.dash}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      {last && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 sm:grid-cols-4">
          {series.map((s) => (
            <div key={s.label}>
              <p className="text-[8px] uppercase tracking-wider text-slate-600">{s.label}</p>
              <p className="mt-1 font-mono text-xs" style={{ color: s.color }}>
                {money(s.pick(last))}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
