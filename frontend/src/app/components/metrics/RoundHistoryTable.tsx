import { Database, Eye } from "lucide-react";
import type { RoundRecord } from "../../../services/game.service";
import { money } from "../../../utils/formatters";
import { Badge } from "../ui/Badge";

export function RoundHistoryTable({ rounds }: { rounds: RoundRecord[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Database size={14} className="text-emerald-400" /> Registro de rondas
        </div>
        <span className="font-mono text-[9px] text-slate-600">
          {rounds.length} / 50 OBSERVACIONES
        </span>
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full min-w-[780px] text-left">
          <thead className="sticky top-0 bg-[#0E1420] text-[8px] uppercase tracking-[.14em] text-slate-600">
            <tr>
              {[
                "Ronda",
                "Roles",
                "Monto M",
                "Decisión",
                "Resultado",
                "CF Agente A",
                "CF Agente B",
                "Estado",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {[...rounds].reverse().map((r) => (
              <tr key={r.round} className="text-[10px] text-slate-400 hover:bg-white/[.02]">
                <td className="px-4 py-3 font-mono text-slate-300">
                  {String(r.round).padStart(2, "0")}
                  {r.revealed && <Eye size={10} className="ml-2 inline text-amber-400" />}
                </td>
                <td className="px-4 py-3">
                  <span className="text-emerald-400">{r.withdrawer}</span> →{" "}
                  <span className="text-cyan-400">{r.guard}</span>
                </td>
                <td className="px-4 py-3 font-mono text-white">{money(r.amount)}</td>
                <td className="px-4 py-3">
                  {r.decision === "pass" ? (
                    <Badge tone="green">PASA</Badge>
                  ) : (
                    <Badge tone="cyan">DUDO {money(r.doubtAmount ?? 0)}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      r.outcome === "failed-doubt"
                        ? "text-red-300"
                        : r.outcome === "caught"
                          ? "text-cyan-300"
                          : "text-emerald-300"
                    }
                  >
                    {r.outcome === "pass"
                      ? "Transferido"
                      : r.outcome === "caught"
                        ? "Interceptado"
                        : "Duda fallida"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{money(r.accounts.A.final)}</td>
                <td className="px-4 py-3 font-mono">{money(r.accounts.B.final)}</td>
                <td className="px-4 py-3">
                  <span className="text-emerald-500">REGISTRADO</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
