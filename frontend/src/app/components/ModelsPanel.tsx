import { Bot, CheckCircle2, Cpu, User } from "lucide-react";
import type { ExperimentConfig } from "../../services/game.service";
import { availableModels } from "../../services/models.service";

export function ModelsPanel({ config }: { config: ExperimentConfig }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-400">
          Catálogo de políticas
        </p>
        <h1 className="mt-1 text-xl font-semibold text-white">Modelos IA</h1>
        <p className="mt-1 text-xs text-slate-500">
          Agentes disponibles para configurar el experimento.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {availableModels.map((model) => {
          const selected = config.agentA === model.id || config.agentB === model.id;
          return (
            <div
              key={model.id}
              className={`rounded-xl border bg-[#111827] p-5 ${selected ? "border-emerald-500/35" : "border-slate-800"}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${model.id === "human" ? "bg-cyan-500/10 text-cyan-400" : "bg-emerald-500/10 text-emerald-400"}`}
                >
                  {model.id === "human" ? <User size={17} /> : <Bot size={17} />}
                </div>
                {selected && <CheckCircle2 size={15} className="text-emerald-400" />}
              </div>
              <h2 className="mt-4 text-sm font-semibold text-white">{model.name}</h2>
              <p className="mt-1 text-[10px] text-slate-500">{model.description}</p>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3 text-[9px] text-slate-600">
                <Cpu size={11} /> {selected ? "ASIGNADO AL EXPERIMENTO" : "DISPONIBLE"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
