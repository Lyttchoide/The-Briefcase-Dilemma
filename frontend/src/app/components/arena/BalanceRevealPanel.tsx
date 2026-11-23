import { motion } from "motion/react";
import { Landmark } from "lucide-react";
import type { RoundRecord } from "../../../services/game.service";
import { money } from "../../../utils/formatters";
import { Button } from "../ui/Button";

export function BalanceRevealPanel({
  round,
  onContinue,
}: {
  round: RoundRecord | null;
  onContinue: () => void;
}) {
  if (!round) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#080C14]/90 p-5 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-amber-500/30 bg-[#111827] p-6 shadow-2xl shadow-amber-950/20"
      >
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-amber-500/10 text-amber-300">
          <Landmark size={22} />
        </div>
        <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[.2em] text-amber-400">
          Revelación pública · Ronda {round.round}
        </p>
        <h2 className="mt-2 text-center text-xl font-semibold text-white">
          Saldos finales actuales
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {(["A", "B"] as const).map((id) => (
            <div
              key={id}
              className="rounded-xl border border-slate-700 bg-black/20 p-4 text-center"
            >
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                {round.accounts[id].name}
              </p>
              <p className="mt-2 font-mono text-xl font-semibold text-white">
                {money(round.accounts[id].final)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[9px] text-slate-600">
          Solo se revela la Cuenta Final. La Cuenta Inicial permanece privada.
        </p>
        <Button onClick={onContinue} className="mt-5 w-full">
          Confirmar y continuar
        </Button>
      </motion.div>
    </div>
  );
}
