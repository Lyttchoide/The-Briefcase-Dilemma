import { motion } from "motion/react";
import { Banknote, BriefcaseBusiness, LockKeyhole, ScanLine } from "lucide-react";
import type { GamePhase } from "../../../hooks/useGameEngine";
import type { PlayerAccount, PlayerId, RoundRecord } from "../../../services/game.service";
import { money } from "../../../utils/formatters";
import { Badge } from "../ui/Badge";
import { PlayerCard } from "./PlayerCard";

const phases = ["CARGA", "TRÁNSITO", "EVALUACIÓN", "RESOLUCIÓN"];

export function BriefcaseStage({
  round,
  phase,
  revealAmount = true,
  active = true,
  accounts = round.accounts,
}: {
  round: RoundRecord;
  phase: GamePhase;
  revealAmount?: boolean;
  active?: boolean;
  accounts?: Record<PlayerId, PlayerAccount>;
}) {
  const w = accounts[round.withdrawer];
  const g = accounts[round.guard];
  const decisionTone =
    round.decision === "pass" ? "green" : round.outcome === "caught" ? "cyan" : "red";
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0E1420]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <span className="font-mono text-xs text-white">
            RONDA {String(round.round).padStart(2, "0")}
          </span>
          <span className="ml-3 text-[9px] uppercase tracking-[.16em] text-slate-600">
            Protocolo de intercambio
          </span>
        </div>
        <div className="flex gap-1">
          {phases.map((label, i) => (
            <div
              key={label}
              className={`rounded px-2 py-1 text-[8px] font-bold tracking-wider ${phase === i ? "bg-amber-500/15 text-amber-300" : i < phase ? "text-emerald-500" : "text-slate-700"}`}
            >
              {i + 1}. {label}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(170px,1fr)_minmax(280px,1.8fr)_minmax(170px,1fr)]">
        <PlayerCard player={w} role="RETIRADOR" color="green" />
        <div className="relative min-h-[290px] overflow-hidden rounded-xl border border-slate-800 bg-[radial-gradient(circle_at_50%_60%,rgba(6,182,212,.08),transparent_48%),linear-gradient(135deg,#111827,#090E17)]">
          <div className="absolute inset-x-8 top-[60%] h-[36%] -translate-y-1/2 skew-x-[-8deg] rounded-[50%] border border-slate-700/60 bg-[#17202d]/70 shadow-[inset_0_0_40px_rgba(0,0,0,.5)]" />
          {active &&
            phase === 0 &&
            Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: -110, y: 110 - i * 16, opacity: 0 }}
                animate={{ x: -15 + i * 6, y: 75, opacity: [0, 1, 0] }}
                transition={{ delay: i * 0.12, duration: 1.2, repeat: Infinity }}
                className="absolute left-1/2 top-1/2 text-emerald-400"
              >
                <Banknote size={18} />
              </motion.div>
            ))}
          <motion.div
            animate={{
              x: !active ? "0%" : phase === 0 ? "-70%" : phase >= 1 ? "0%" : "-70%",
              y: phase === 0 ? 28 : 0,
              rotateX: phase === 0 || phase === 3 ? -8 : 0,
            }}
            transition={{ type: "spring", stiffness: 85 }}
            className="absolute left-1/2 top-[62%] z-10 -ml-12 -mt-11 w-24"
          >
            <motion.div
              animate={{
                boxShadow:
                  phase === 2
                    ? "0 0 35px rgba(6,182,212,.65)"
                    : phase === 3 && round.outcome === "failed-doubt"
                      ? "0 0 35px rgba(239,68,68,.55)"
                      : "0 10px 30px rgba(0,0,0,.5)",
              }}
              className="relative grid h-20 place-items-center rounded-lg border-2 border-amber-500/60 bg-gradient-to-br from-amber-700 to-amber-950 text-amber-200"
            >
              <BriefcaseBusiness size={34} />
              {phase === 1 && (
                <div className="absolute -top-3 rounded-full bg-slate-900 p-1 text-amber-400">
                  <LockKeyhole size={13} />
                </div>
              )}
              {phase === 2 && (
                <motion.div
                  animate={{ y: [-38, 35, -38] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="absolute h-px w-32 bg-cyan-300 shadow-[0_0_12px_#06b6d4]"
                />
              )}
            </motion.div>
          </motion.div>
          <div className="absolute inset-x-3 top-5 z-20 text-center">
            {!active && (
              <>
                <p className="text-[9px] uppercase tracking-[.2em] text-slate-500">
                  Experimento preparado
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-300">
                  SIN DATOS · ESPERANDO DECISIÓN
                </p>
              </>
            )}
            {active && phase === 0 && (
              <>
                <p className="text-[9px] uppercase tracking-[.2em] text-emerald-400">
                  Carga privada
                </p>
                {revealAmount ? (
                  <p className="mt-1 font-mono text-xl font-bold text-white">
                    {money(round.amount)}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xl font-bold text-amber-300">CONFIDENCIAL</p>
                )}
              </>
            )}
            {active && phase === 1 && (
              <>
                <p className="text-[9px] uppercase tracking-[.2em] text-amber-400">
                  Información asimétrica
                </p>
                <motion.p
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ repeat: Infinity }}
                  className="mt-1 font-mono text-3xl text-amber-300"
                >
                  ?
                </motion.p>
              </>
            )}
            {active && phase === 2 && (
              <>
                <p className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-[.2em] text-cyan-300">
                  <ScanLine size={13} /> Escáner de duda
                </p>
                <div className="mt-2">
                  <Badge tone={decisionTone}>
                    {round.decision === "pass" ? "PASA" : `DUDO ${money(round.doubtAmount ?? 0)}`}
                  </Badge>
                </div>
              </>
            )}
            {active && phase === 3 && (
              <>
                <p className="text-[9px] uppercase tracking-[.2em] text-slate-500">
                  Valor revelado
                </p>
                <p
                  className={`mt-1 font-mono text-xl font-bold ${round.outcome === "failed-doubt" ? "text-red-300" : "text-amber-300"}`}
                >
                  {money(round.amount)}
                </p>
                <p className="mt-2 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                  {round.outcome === "pass"
                    ? "Transferencia aprobada"
                    : round.outcome === "caught"
                      ? "Retiro interceptado"
                      : `Duda fallida · bono ${money((round.doubtAmount ?? 0) / 2)}`}
                </p>
              </>
            )}
          </div>
        </div>
        <PlayerCard player={g} role="GUARDIA" color="cyan" />
      </div>
    </section>
  );
}
