import { ArrowRight, Scale, ScrollText, ShieldCheck, WalletCards } from "lucide-react";
import type { RoundRecord } from "../../../services/game.service";
import { money } from "../../../utils/formatters";
import { EmptyData } from "./AnalyticsPanel";

export function LogsPanel({ rounds }: { rounds: RoundRecord[] }) {
  const signedMoney = (value: number) =>
    `${value > 0 ? "+" : value < 0 ? "−" : ""}${money(Math.abs(value))}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-amber-400">
          Auditoría reproducible
        </p>
        <h1 className="mt-1 text-xl font-semibold text-white">Logs del motor</h1>
        <p className="mt-1 text-xs text-slate-500">
          Eventos económicos confirmados por orden cronológico.
        </p>
      </div>
      {!rounds.length ? (
        <EmptyData message="Los eventos aparecerán aquí después de resolver cada ronda." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#090E17]">
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-[10px] text-slate-500">
            <ScrollText size={13} /> EVENT STREAM · {rounds.length} REGISTROS
          </div>
          <div className="max-h-[720px] divide-y divide-slate-800/70 overflow-auto">
            {[...rounds].reverse().map((round) => {
              const penalty = round.outcome === "failed-doubt" ? (round.doubtAmount ?? 0) / 2 : 0;
              const previous = rounds[round.round - 2]?.accounts;
              const withdrawer = round.accounts[round.withdrawer];
              const guard = round.accounts[round.guard];
              const withdrawerFinalBefore = previous?.[round.withdrawer].final ?? 500_000;
              const guardFinalBefore = previous?.[round.guard].final ?? 500_000;
              const withdrawerInitialBefore = previous?.[round.withdrawer].initial ?? 2_000_000;
              const withdrawerFinalDelta = withdrawer.final - withdrawerFinalBefore;
              const guardFinalDelta = guard.final - guardFinalBefore;
              const result =
                round.outcome === "pass"
                  ? `PASA: ${money(round.amount)} se transfiere a la Cuenta Final del Retirador.`
                  : round.outcome === "caught"
                    ? `DUDA ACERTADA: M (${money(round.amount)}) ≤ X (${money(round.doubtAmount ?? 0)}). El Guardia recibe M.`
                    : `DUDA FALLIDA: M (${money(round.amount)}) ${round.amount === 0 ? "= 0" : `> X (${money(round.doubtAmount ?? 0)})`}. El Retirador recibe M + X/2 y el Guardia paga X/2.`;
              return (
                <article key={round.round} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[9px] text-slate-300">
                          RONDA {String(round.round).padStart(2, "0")}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider ${
                            round.outcome === "failed-doubt"
                              ? "text-red-300"
                              : round.outcome === "caught"
                                ? "text-cyan-300"
                                : "text-emerald-300"
                          }`}
                        >
                          {round.outcome === "pass"
                            ? "Transferencia aprobada"
                            : round.outcome === "caught"
                              ? "Retiro interceptado"
                              : "Penalización ejecutada"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-300">
                        <strong className="text-emerald-300">{withdrawer.name}</strong> actuó como
                        Retirador y cargó{" "}
                        <span className="font-mono text-white">{money(round.amount)}</span>.
                        <strong className="ml-1 text-cyan-300">{guard.name}</strong> actuó como
                        Guardia y decidió{" "}
                        <span className="font-mono text-white">
                          {round.decision === "pass"
                            ? "PASA"
                            : `DUDO ${money(round.doubtAmount ?? 0)}`}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-800 bg-black/20 px-3 py-2.5">
                    <Scale size={13} className="mt-0.5 shrink-0 text-amber-400" />
                    <div>
                      <p className="text-[10px] leading-5 text-slate-400">{result}</p>
                      {penalty > 0 && (
                        <p className="font-mono text-[9px] text-red-300">
                          X/2 = {money(round.doubtAmount ?? 0)} / 2 = {money(penalty)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <AccountAudit
                      icon="withdrawer"
                      role="RETIRADOR"
                      name={withdrawer.name}
                      initialBefore={withdrawerInitialBefore}
                      initialAfter={withdrawer.initial}
                      finalBefore={withdrawerFinalBefore}
                      finalAfter={withdrawer.final}
                      finalDelta={withdrawerFinalDelta}
                      signedMoney={signedMoney}
                    />
                    <AccountAudit
                      icon="guard"
                      role="GUARDIA"
                      name={guard.name}
                      finalBefore={guardFinalBefore}
                      finalAfter={guard.final}
                      finalDelta={guardFinalDelta}
                      signedMoney={signedMoney}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountAudit({
  icon,
  role,
  name,
  initialBefore,
  initialAfter,
  finalBefore,
  finalAfter,
  finalDelta,
  signedMoney,
}: {
  icon: "withdrawer" | "guard";
  role: string;
  name: string;
  initialBefore?: number;
  initialAfter?: number;
  finalBefore: number;
  finalAfter: number;
  finalDelta: number;
  signedMoney: (value: number) => string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
      <div className="flex items-center gap-2">
        {icon === "withdrawer" ? (
          <WalletCards size={13} className="text-emerald-400" />
        ) : (
          <ShieldCheck size={13} className="text-cyan-400" />
        )}
        <p className="text-[9px] font-bold tracking-wider text-slate-500">
          {role} · {name}
        </p>
      </div>
      {initialBefore !== undefined && initialAfter !== undefined && (
        <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500">
          <span>Cuenta Inicial</span>
          <span className="flex items-center gap-1.5 font-mono">
            {money(initialBefore)} <ArrowRight size={10} />{" "}
            <strong className="text-slate-300">{money(initialAfter)}</strong>
          </span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500">
        <span>Cuenta Final</span>
        <span className="flex items-center gap-1.5 font-mono">
          {money(finalBefore)} <ArrowRight size={10} />{" "}
          <strong className="text-white">{money(finalAfter)}</strong>
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2">
        <span className="text-[8px] uppercase tracking-wider text-slate-600">Variación CF</span>
        <span
          className={`font-mono text-[10px] font-semibold ${
            finalDelta > 0 ? "text-emerald-300" : finalDelta < 0 ? "text-red-300" : "text-slate-500"
          }`}
        >
          {signedMoney(finalDelta)}
        </span>
      </div>
    </div>
  );
}
