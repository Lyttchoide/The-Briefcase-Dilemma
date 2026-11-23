import { Activity, Bot, FlaskConical, LayoutDashboard, ScrollText, Settings2 } from "lucide-react";

const items = [
  { id: "arena", label: "Arena", icon: FlaskConical },
  { id: "analytics", label: "Analíticas", icon: Activity },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "models", label: "Modelos IA", icon: Bot },
];

export type AppSection = "arena" | "analytics" | "logs" | "models";

export function Sidebar({
  activeSection,
  onNavigate,
  backendOnline,
}: {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  backendOnline: boolean;
}) {
  return (
    <aside className="hidden w-[210px] shrink-0 flex-col border-r border-slate-800/80 bg-[#0D121E] lg:flex">
      <div className="flex h-[72px] items-center gap-3 border-b border-slate-800/80 px-5">
        <div className="grid size-8 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <LayoutDashboard size={16} />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">
            Strateg<span className="text-emerald-400">IA</span>
          </div>
          <div className="text-[9px] uppercase tracking-[.2em] text-slate-500">Game Theory Lab</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-3 text-[9px] font-bold uppercase tracking-[.18em] text-slate-600">
          Experimento
        </p>
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={label}
              onClick={() => onNavigate(id as AppSection)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium ${active ? "bg-emerald-500/10 text-emerald-300" : "text-slate-500 hover:bg-white/[.03] hover:text-slate-300"}`}
            >
              <Icon size={15} />
              {label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl border border-slate-800 bg-black/15 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] text-slate-400">
          <Settings2 size={13} /> Motor local
        </div>
        <div className={`flex items-center gap-2 text-[10px] ${backendOnline ? "text-emerald-400" : "text-amber-400"}`}>
          <span className={`size-1.5 animate-pulse rounded-full ${backendOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
          {backendOnline ? "BACKEND ONLINE" : "BACKEND OFFLINE"}
        </div>
      </div>
    </aside>
  );
}
