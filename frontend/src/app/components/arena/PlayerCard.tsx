import { ShieldCheck, WalletCards } from "lucide-react";
import type { PlayerAccount } from "../../../services/game.service";
import { money } from "../../../utils/formatters";
import { Badge } from "../ui/Badge";

export function PlayerCard({
  player,
  role,
  color,
}: {
  player: PlayerAccount;
  role: "RETIRADOR" | "GUARDIA";
  color: "green" | "cyan";
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-[#111827] p-4 ${color === "green" ? "border-emerald-500/25" : "border-cyan-500/25"}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-px ${color === "green" ? "bg-emerald-400" : "bg-cyan-400"}`}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold tracking-[.18em] text-slate-500">{player.name}</p>
          <p className="mt-1 text-xs font-semibold text-slate-200">{player.model}</p>
        </div>
        <Badge tone={color}>{role}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-black/20 p-2.5">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
            <WalletCards size={11} /> CUENTA INICIAL
          </div>
          <div className="mt-1 font-mono text-sm text-slate-200">{money(player.initial)}</div>
        </div>
        <div className="rounded-lg bg-black/20 p-2.5">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
            <ShieldCheck size={11} /> CUENTA FINAL
          </div>
          <div
            className={`mt-1 font-mono text-sm ${color === "green" ? "text-emerald-300" : "text-cyan-300"}`}
          >
            {money(player.final)}
          </div>
        </div>
      </div>
    </div>
  );
}
