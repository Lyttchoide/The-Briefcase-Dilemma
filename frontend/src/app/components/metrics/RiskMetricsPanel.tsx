import {
  BarChart3,
  BriefcaseBusiness,
  Crosshair,
  Gauge,
  Layers,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import type { PlayerId, RoundRecord } from "../../../services/game.service";
import { money } from "../../../utils/formatters";

const percent = (value: number, total: number) => (total ? (value / total) * 100 : 0);
const percentLabel = (value: number) => `${value.toFixed(1)}%`;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

interface SegmentMetrics {
  segmentIndex: number;
  label: string;
  player: "A" | "B";
  roundsCount: number;
  exposure: number;
  avgWithdrawal: number;
  doubtRate: number;
  guardAccuracy: number;
  penalties: number;
  caughtAmount: number;
  doubtsCount: number;
  passesCount: number;
  caughtCount: number;
  failedCount: number;
}

export function RiskMetricsPanel({ rounds }: { rounds: RoundRecord[] }) {
  const doubts = rounds.filter((round) => round.decision === "doubt");
  const caught = doubts.filter((round) => round.outcome === "caught");
  const failed = doubts.filter((round) => round.outcome === "failed-doubt");
  const totalExposure = sum(rounds.map((round) => round.amount));
  const totalPenalties = sum(failed.map((round) => (round.doubtAmount ?? 0) / 2));

  // Métricas por jugador en bloques de 10 rondas
  const segmentSize = 10;
  const segments: SegmentMetrics[] = [];
  for (let i = 0; i < rounds.length; i += segmentSize) {
    const chunk = rounds.slice(i, i + segmentSize);
    const rangeLabel = `Rondas ${i + 1}–${Math.min(i + segmentSize, rounds.length)}`;

    for (const player of ["A", "B"] as const) {
      const withdraws = chunk.filter((r) => r.withdrawer === player);
      const guards = chunk.filter((r) => r.guard === player);
      const playerDoubts = guards.filter((r) => r.decision === "doubt");
      const playerCaught = playerDoubts.filter((r) => r.outcome === "caught");
      const playerFailed = playerDoubts.filter((r) => r.outcome === "failed-doubt");
      const allowed = guards.filter((r) => r.decision === "pass");
      const exposure = sum(withdraws.map((r) => r.amount));
      const penalties = sum(playerFailed.map((r) => (r.doubtAmount ?? 0) / 2));

      segments.push({
        segmentIndex: Math.floor(i / segmentSize) + 1,
        label: rangeLabel,
        player,
        roundsCount: chunk.length,
        exposure,
        avgWithdrawal: withdraws.length ? exposure / withdraws.length : 0,
        doubtRate: guards.length ? (playerDoubts.length / guards.length) * 100 : 0,
        guardAccuracy: playerDoubts.length ? (playerCaught.length / playerDoubts.length) * 100 : 0,
        penalties,
        caughtAmount: sum(playerCaught.map((r) => r.amount)),
        doubtsCount: playerDoubts.length,
        passesCount: allowed.length,
        caughtCount: playerCaught.length,
        failedCount: playerFailed.length,
      });
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Gauge size={15} className="text-amber-400" /> Métricas de riesgo estratégico
        </div>
        <p className="mt-1 text-[9px] text-slate-600">
          Exposición, agresividad y precisión calculadas únicamente sobre rondas completadas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          icon={<BriefcaseBusiness size={15} />}
          label="Capital expuesto"
          value={money(totalExposure)}
          detail={`${rounds.length} retiros confirmados`}
          tone="green"
        />
        <SummaryMetric
          icon={<ShieldAlert size={15} />}
          label="Frecuencia de duda"
          value={percentLabel(percent(doubts.length, rounds.length))}
          detail={`${doubts.length} de ${rounds.length} decisiones`}
          tone="cyan"
        />
        <SummaryMetric
          icon={<Target size={15} />}
          label="Precisión del Guardia"
          value={percentLabel(percent(caught.length, doubts.length))}
          detail={`${caught.length} aciertos · ${failed.length} fallos`}
          tone="amber"
        />
        <SummaryMetric
          icon={<TrendingDown size={15} />}
          label="Penalizaciones CF"
          value={money(totalPenalties)}
          detail="X/2 descontado a los Guardias"
          tone="red"
        />
      </div>

      {/* Comparativa por jugador en bloques de 10 rondas */}
      <SegmentComparisonTable segments={segments} />

      <div className="grid gap-4 xl:grid-cols-2">
        {(["A", "B"] as const).map((player) => (
          <PlayerRiskCard key={player} player={player} rounds={rounds} />
        ))}
      </div>

      <RiskDistribution rounds={rounds} />
    </section>
  );
}

function SegmentComparisonTable({ segments }: { segments: SegmentMetrics[] }) {
  if (segments.length === 0) return null;
  const maxExposure = Math.max(1, ...segments.map((s) => s.exposure));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan-400" />
          <h3 className="text-xs font-semibold text-white">
            Comparativa por jugador · bloques de 10 rondas
          </h3>
        </div>
        <span className="font-mono text-[9px] text-slate-500">
          {segments.length / 2} BLOQUES · 2 JUGADORES
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/40 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5">Bloque</th>
              <th className="px-4 py-2.5">Jugador</th>
              <th className="px-4 py-2.5">Retiro Prom.</th>
              <th className="px-4 py-2.5">Capital Expuesto</th>
              <th className="px-4 py-2.5">Frec. Duda (Guardia)</th>
              <th className="px-4 py-2.5">Precisión Guardia</th>
              <th className="px-4 py-2.5">Penalizaciones CF</th>
              <th className="px-4 py-2.5">Capital Capturado</th>
              <th className="px-4 py-2.5 text-right">Exposición</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {segments.map((seg, idx) => {
              // comparar con el mismo jugador en el bloque anterior
              const prevSamePlayer = idx >= 2 ? segments[idx - 2] : null;
              const exposureDiff = prevSamePlayer ? seg.exposure - prevSamePlayer.exposure : 0;
              const doubtDiff = prevSamePlayer ? seg.doubtRate - prevSamePlayer.doubtRate : 0;
              const barWidth = Math.round((seg.exposure / maxExposure) * 100);
              const isPlayerA = seg.player === "A";
              const playerColor = isPlayerA ? "text-emerald-400" : "text-cyan-400";
              const isFirstOfBlock = seg.player === "A";

              return (
                <tr
                  key={`${seg.segmentIndex}-${seg.player}`}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    isFirstOfBlock ? "border-t-2 border-slate-700" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    {isFirstOfBlock ? (
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-cyan-300">
                          B{seg.segmentIndex}
                        </span>
                        <div className="font-sans font-semibold text-slate-200">{seg.label}</div>
                      </div>
                    ) : (
                      <span className="text-slate-600 font-sans text-[9px] pl-7">↳</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${
                        isPlayerA
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-cyan-500/10 text-cyan-400"
                      }`}
                    >
                      Jugador {seg.player}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${playerColor}`}>
                    {money(seg.avgWithdrawal)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-semibold">{money(seg.exposure)}</div>
                    {prevSamePlayer && (
                      <div
                        className={`flex items-center gap-0.5 text-[9px] ${
                          exposureDiff > 0
                            ? "text-red-400"
                            : exposureDiff < 0
                              ? "text-emerald-400"
                              : "text-slate-500"
                        }`}
                      >
                        {exposureDiff > 0 ? (
                          <TrendingUp size={10} />
                        ) : exposureDiff < 0 ? (
                          <TrendingDown size={10} />
                        ) : null}
                        <span>
                          {exposureDiff >= 0 ? "+" : ""}
                          {money(exposureDiff)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-cyan-300 font-semibold">
                      {percentLabel(seg.doubtRate)}
                    </span>
                    <span className="ml-1 text-[9px] text-slate-500 font-sans">
                      ({seg.doubtsCount}/{seg.passesCount + seg.doubtsCount})
                    </span>
                    {prevSamePlayer && Math.abs(doubtDiff) >= 1 && (
                      <div
                        className={`text-[9px] ${
                          doubtDiff > 0 ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        {doubtDiff > 0 ? "↑" : "↓"} {Math.abs(doubtDiff).toFixed(1)}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        seg.guardAccuracy >= 50 ? "text-amber-300" : "text-slate-400"
                      }`}
                    >
                      {seg.doubtsCount > 0 ? percentLabel(seg.guardAccuracy) : "—"}
                    </span>
                    {seg.doubtsCount > 0 && (
                      <div className="text-[9px] text-slate-500 font-sans">
                        {seg.caughtCount} aciertos · {seg.failedCount} fallos
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={seg.penalties > 0 ? "text-red-400 font-semibold" : "text-slate-500"}>
                      {money(seg.penalties)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{money(seg.caughtAmount)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            isPlayerA
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              : "bg-gradient-to-r from-cyan-500 to-cyan-400"
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono w-8 text-right">
                        {barWidth}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerRiskCard({ player, rounds }: { player: PlayerId; rounds: RoundRecord[] }) {
  const asWithdrawer = rounds.filter((round) => round.withdrawer === player);
  const asGuard = rounds.filter((round) => round.guard === player);
  const doubts = asGuard.filter((round) => round.decision === "doubt");
  const caught = doubts.filter((round) => round.outcome === "caught");
  const failed = doubts.filter((round) => round.outcome === "failed-doubt");
  const passes = asGuard.filter((round) => round.decision === "pass");
  const withdrawn = sum(asWithdrawer.map((round) => round.amount));
  const averageWithdrawal = asWithdrawer.length ? withdrawn / asWithdrawer.length : 0;
  const intercepted = asWithdrawer.filter((round) => round.outcome === "caught");
  const highRisk = asWithdrawer.filter((round) => round.amount > 75_000);
  const recovered = sum(caught.map((round) => round.amount));
  const penalties = sum(failed.map((round) => (round.doubtAmount ?? 0) / 2));
  const allowed = sum(passes.map((round) => round.amount));
  const averageThreshold = doubts.length
    ? sum(doubts.map((round) => round.doubtAmount ?? 0)) / doubts.length
    : 0;
  const last = rounds.at(-1);
  const name = last?.accounts[player].name ?? `JUGADOR ${player}`;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p
            className={`text-[9px] font-bold uppercase tracking-[.16em] ${
              player === "A" ? "text-emerald-400" : "text-cyan-400"
            }`}
          >
            Perfil estratégico {player}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-white">{name}</h3>
        </div>
        <span className="rounded-md bg-white/[.04] px-2 py-1 font-mono text-[9px] text-slate-500">
          {asWithdrawer.length + asGuard.length} TURNOS
        </span>
      </div>

      <div className="grid divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <BriefcaseBusiness size={13} /> Riesgo como Retirador
          </div>
          <RoleMetric
            label="Retiro promedio"
            value={money(averageWithdrawal)}
            detail={`${percentLabel(percent(averageWithdrawal, 100_000))} del máximo por ronda`}
          />
          <RoleMetric
            label="Capital total arriesgado"
            value={money(withdrawn)}
            detail={`Máximo observado: ${money(Math.max(0, ...asWithdrawer.map((r) => r.amount)))}`}
          />
          <RoleMetric
            label="Retiros de riesgo alto"
            value={`${highRisk.length} / ${asWithdrawer.length}`}
            detail="Monto superior a $75,000"
          />
          <RoleMetric
            label="Tasa de intercepción"
            value={percentLabel(percent(intercepted.length, asWithdrawer.length))}
            detail={`${intercepted.length} retiros capturados por el Guardia`}
            negative
          />
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
            <Crosshair size={13} /> Riesgo como Guardia
          </div>
          <RoleMetric
            label="Frecuencia de duda"
            value={percentLabel(percent(doubts.length, asGuard.length))}
            detail={`${doubts.length} dudas en ${asGuard.length} turnos`}
          />
          <RoleMetric
            label="Precisión de la duda"
            value={percentLabel(percent(caught.length, doubts.length))}
            detail={`${caught.length} aciertos · ${failed.length} dudas fallidas`}
          />
          <RoleMetric
            label="Umbral X promedio"
            value={money(averageThreshold)}
            detail={`Capital interceptado: ${money(recovered)}`}
          />
          <RoleMetric
            label="Capital permitido al pasar"
            value={money(allowed)}
            detail={`${passes.length} decisiones PASA`}
          />
          <RoleMetric
            label="Penalizaciones pagadas"
            value={money(penalties)}
            detail="X/2 descontado de su Cuenta Final"
            negative={penalties > 0}
          />
        </div>
      </div>
    </article>
  );
}

function RiskDistribution({ rounds }: { rounds: RoundRecord[] }) {
  const buckets = [
    { label: "Bajo", range: "$0–$25k", color: "#10B981", count: 0 },
    { label: "Medio", range: "$25k–$75k", color: "#F59E0B", count: 0 },
    { label: "Alto", range: "$75k–$100k", color: "#EF4444", count: 0 },
  ];
  rounds.forEach((round) => {
    if (round.amount <= 25_000) buckets[0].count += 1;
    else if (round.amount <= 75_000) buckets[1].count += 1;
    else buckets[2].count += 1;
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold text-white">Distribución de exposición del Retirador</p>
        <p className="mt-1 text-[9px] text-slate-600">
          Clasificación de M por intensidad del riesgo asumido en cada ronda.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {buckets.map((bucket) => {
          const share = percent(bucket.count, rounds.length);
          return (
            <div key={bucket.label}>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-300">{bucket.label}</p>
                  <p className="text-[8px] text-slate-600">{bucket.range}</p>
                </div>
                <p className="font-mono text-sm text-white">{percentLabel(share)}</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${share}%`, backgroundColor: bucket.color }}
                />
              </div>
              <p className="mt-2 font-mono text-[9px] text-slate-500">{bucket.count} rondas</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "cyan" | "amber" | "red";
}) {
  const tones = {
    green: "bg-emerald-500/10 text-emerald-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
      <div className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}>{icon}</div>
      <p className="mt-3 text-[8px] font-bold uppercase tracking-[.14em] text-slate-600">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-[9px] text-slate-500">{detail}</p>
    </div>
  );
}

function RoleMetric({
  label,
  value,
  detail,
  negative = false,
}: {
  label: string;
  value: string;
  detail: string;
  negative?: boolean;
}) {
  return (
    <div className="border-b border-slate-800/70 py-2.5 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9px] text-slate-500">{label}</span>
        <strong className={`font-mono text-xs ${negative ? "text-red-300" : "text-white"}`}>
          {value}
        </strong>
      </div>
      <p className="mt-1 text-right text-[8px] leading-4 text-slate-600">{detail}</p>
    </div>
  );
}

// Mantener compatibilidad con importaciones que usen BarChart3
export { BarChart3 };
