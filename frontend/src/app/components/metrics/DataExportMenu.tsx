import { Download, FileJson, Sheet } from "lucide-react";
import { useState } from "react";
import type { Simulation } from "../../../services/game.service";
import { apiClient } from "../../../services/_http/apiClient";
import { isBackendEnabled } from "../../../services/game.service";

export function DataExportMenu({ simulation }: { simulation: Simulation }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = async (format: "json" | "csv") => {
    setError(null);
    let blob: Blob;
    try {
      blob =
        isBackendEnabled && simulation.status !== undefined
          ? await apiClient.exportGame(simulation.id, format)
          : new Blob(
              [
                format === "json"
                  ? JSON.stringify(simulation, null, 2)
                  : [
                      "round,withdrawer,guard,amount,decision,doubt_amount,outcome,ci_a,cf_a,ci_b,cf_b,revealed",
                      ...simulation.rounds.map((r) =>
                        [
                          r.round, r.withdrawer, r.guard, r.amount, r.decision,
                          r.doubtAmount ?? "", r.outcome, r.accounts.A.initial,
                          r.accounts.A.final, r.accounts.B.initial, r.accounts.B.final, r.revealed,
                        ].join(","),
                      ),
                    ].join("\n"),
              ],
              { type: format === "json" ? "application/json" : "text/csv" },
            );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo exportar el experimento");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `strategia-${simulation.config.seed}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 hover:bg-white/5"
      >
        <Download size={13} /> EXPORTAR DATASET
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-44 rounded-lg border border-slate-700 bg-[#111827] p-1.5 shadow-xl">
          {error && <p className="px-3 py-2 text-[9px] text-red-300">{error}</p>}
          <button
            onClick={() => download("csv")}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            <Sheet size={14} className="text-emerald-400" /> Descargar .CSV
          </button>
          <button
            onClick={() => download("json")}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            <FileJson size={14} className="text-amber-400" /> Descargar .JSON
          </button>
        </div>
      )}
    </div>
  );
}
