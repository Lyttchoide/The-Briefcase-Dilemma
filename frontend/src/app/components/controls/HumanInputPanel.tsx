import { useEffect, useState } from "react";
import { Banknote, ShieldQuestion } from "lucide-react";
import type { PlayerAccount } from "../../../services/game.service";
import { money } from "../../../utils/formatters";
import { Button } from "../ui/Button";
import { Slider } from "../ui/Slider";

export function HumanInputPanel({
  role,
  account,
  grid,
  onDeposit,
  onDecision,
}: {
  role: "withdrawer" | "guard";
  account: PlayerAccount;
  grid: number;
  onDeposit: (amount: number) => void;
  onDecision: (decision: "pass" | "doubt", amount: number | null) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [doubt, setDoubt] = useState(50_000);
  const [decision, setDecision] = useState<"pass" | "doubt">("pass");
  const max = Math.min(100_000, account.initial);
  useEffect(() => setAmount(0), [account.id, max]);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4">
      <div className="mb-4 flex items-center gap-2">
        <div
          className={`grid size-8 place-items-center rounded-lg ${role === "withdrawer" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"}`}
        >
          {role === "withdrawer" ? <Banknote size={16} /> : <ShieldQuestion size={16} />}
        </div>
        <div>
          <p className="text-xs font-semibold text-white">
            {role === "withdrawer" ? "Decisión del Retirador" : "Evaluación del Guardia"}
          </p>
          <p className="text-[9px] text-slate-500">Control humano · {account.name}</p>
        </div>
      </div>
      {role === "withdrawer" ? (
        <>
          <div className="mb-3 flex items-end justify-between">
            <span className="text-[10px] text-slate-500">Monto privado M</span>
            <span className="font-mono text-lg text-emerald-300">{money(amount)}</span>
          </div>
          <Slider
            min={0}
            max={max}
            step={grid}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <div className="mt-3 flex gap-2">
            <input
              aria-label="Monto a depositar"
              type="number"
              min={0}
              max={max}
              step={grid}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Math.min(max, Number(e.target.value))))}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#090E17] px-3 py-2 font-mono text-xs text-white outline-none focus:border-emerald-500"
            />
            <Button onClick={() => onDeposit(amount)}>Depositar y cerrar maletín</Button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDecision("pass")}
              className={`rounded-lg border px-3 py-3 text-xs font-bold ${decision === "pass" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-500"}`}
            >
              PASA
            </button>
            <button
              onClick={() => setDecision("doubt")}
              className={`rounded-lg border px-3 py-3 text-xs font-bold ${decision === "doubt" ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-slate-700 text-slate-500"}`}
            >
              DUDO $X
            </button>
          </div>
          {decision === "doubt" && (
            <div className="mt-3">
              <div className="mb-2 flex justify-between text-[10px] text-slate-500">
                <span>Umbral de duda X</span>
                <span className="font-mono text-cyan-300">{money(doubt)}</span>
              </div>
              <Slider
                min={grid}
                max={100_000}
                step={grid}
                value={doubt}
                onChange={(e) => setDoubt(Number(e.target.value))}
              />
              <input
                aria-label="Umbral de duda"
                type="number"
                min={0}
                max={100000}
                value={doubt}
                onChange={(e) => setDoubt(Number(e.target.value))}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-[#090E17] px-3 py-2 font-mono text-xs text-white"
              />
            </div>
          )}
          <Button
            variant="secondary"
            onClick={() => onDecision(decision, decision === "doubt" ? doubt : null)}
            className="mt-3 w-full"
          >
            Confirmar decisión
          </Button>
        </>
      )}
    </div>
  );
}
