import { useEffect, useState } from "react";
import { Dices, Download, FlaskConical } from "lucide-react";
import type { ExperimentConfig } from "../../../services/game.service";
import { availableModels, seedPresets } from "../../../services/models.service";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function ExperimentConfigModal({
  open,
  config,
  onClose,
  onSave,
  onExport,
}: {
  open: boolean;
  config: ExperimentConfig;
  onClose: () => void;
  onSave: (config: ExperimentConfig) => void;
  onExport: () => void;
}) {
  const [draft, setDraft] = useState(config);
  useEffect(() => setDraft(config), [config, open]);
  return (
    <Modal open={open} onClose={onClose} title="Configuración del experimento">
      <div className="space-y-5 p-6">
        <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-3 text-[10px] leading-5 text-cyan-200/70">
          <FlaskConical size={14} className="mr-2 inline" />
          Todos los parámetros se almacenan con el dataset para garantizar la reproducibilidad
          científica.
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["A", "B"] as const).map((id) => (
            <label
              key={id}
              className="space-y-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
            >
              Agente {id}
              <select
                value={id === "A" ? draft.agentA : draft.agentB}
                onChange={(e) =>
                  setDraft({ ...draft, [id === "A" ? "agentA" : "agentB"]: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-[#090E17] px-3 py-2.5 text-xs normal-case tracking-normal text-white"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} · {model.description}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Semilla aleatoria
            <div className="flex">
              <span className="grid place-items-center rounded-l-lg border border-r-0 border-slate-700 bg-black/20 px-3 text-slate-500">
                <Dices size={14} />
              </span>
              <input
                type="number"
                value={draft.seed}
                onChange={(e) => setDraft({ ...draft, seed: Number(e.target.value) })}
                className="min-w-0 w-full rounded-r-lg border border-slate-700 bg-[#090E17] px-3 py-2.5 font-mono text-xs text-white"
              />
            </div>
            <div className="flex gap-1">
              {seedPresets.map((seed) => (
                <button
                  key={seed}
                  onClick={() => setDraft({ ...draft, seed })}
                  className="rounded bg-white/5 px-2 py-1 font-mono text-[9px] text-slate-500 hover:text-white"
                >
                  {seed}
                </button>
              ))}
            </div>
          </label>
          <label className="space-y-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Discretización
            <select
              value={draft.grid}
              onChange={(e) => setDraft({ ...draft, grid: Number(e.target.value) as 1 | 10_000 })}
              className="w-full rounded-lg border border-slate-700 bg-[#090E17] px-3 py-2.5 text-xs normal-case tracking-normal text-white"
            >
              <option value={10000}>Rejilla · pasos de $10,000</option>
              <option value={1}>Libre · $1 a $100,000</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-slate-800 pt-5">
          <Button variant="ghost" onClick={onExport}>
            <Download size={13} /> Exportar dataset
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSave(draft);
                onClose();
              }}
            >
              Iniciar experimento
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
