import type { RoundRecord } from "../../../services/game.service";
import { EvolutionChart } from "./EvolutionChart";
import { RiskMetricsPanel } from "./RiskMetricsPanel";
import { RoundHistoryTable } from "./RoundHistoryTable";

export function AnalyticsPanel({ rounds }: { rounds: RoundRecord[] }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-400">
          Observatorio cuantitativo
        </p>
        <h1 className="mt-1 text-xl font-semibold text-white">Analíticas del experimento</h1>
        <p className="mt-1 text-xs text-slate-500">
          Solo se representan rondas completadas; no se anticipan decisiones futuras.
        </p>
      </div>
      {rounds.length ? (
        <>
          <RiskMetricsPanel rounds={rounds} />
          <EvolutionChart rounds={rounds} />
          <RoundHistoryTable rounds={rounds} />
        </>
      ) : (
        <EmptyData message="Completa la primera ronda para generar las series de evolución." />
      )}
    </div>
  );
}

export function EmptyData({ message }: { message: string }) {
  return (
    <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-700 bg-[#111827]/50 p-8 text-center">
      <div>
        <p className="font-mono text-xs text-slate-400">SIN OBSERVACIONES</p>
        <p className="mt-2 max-w-sm text-xs leading-5 text-slate-600">{message}</p>
      </div>
    </div>
  );
}
