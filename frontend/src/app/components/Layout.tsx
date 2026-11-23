import { Bot, FlaskConical, Menu, Settings2, User, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { GameMode, ViewMode } from "../../services/game.service";
import { Sidebar } from "./Sidebar";
import type { AppSection } from "./Sidebar";

const modes: { id: GameMode; label: string; icon: typeof Bot }[] = [
  { id: "ai-ai", label: "IA vs IA", icon: Bot },
  { id: "human-ai", label: "Jugador vs IA", icon: User },
  { id: "human-human", label: "Jugador vs Jugador", icon: Users },
];

export function Layout({
  children,
  mode,
  backendOnline,
  view,
  onMode,
  onView,
  onConfig,
  section,
  onNavigate,
}: {
  children: ReactNode;
  mode: GameMode;
  backendOnline: boolean;
  view: ViewMode;
  onMode: (mode: GameMode) => void;
  onView: (view: ViewMode) => void;
  onConfig: () => void;
  section: AppSection;
  onNavigate: (section: AppSection) => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileSections: { id: AppSection; label: string }[] = [
    { id: "arena", label: "Arena" },
    { id: "analytics", label: "Analíticas" },
    { id: "logs", label: "Logs" },
    { id: "models", label: "Modelos IA" },
  ];
  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-200">
      <Sidebar activeSection={section} onNavigate={onNavigate} backendOnline={backendOnline} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#0B0F19]/95 backdrop-blur-xl">
          <div className="flex h-[72px] items-center gap-3 px-4 xl:px-7">
            <button
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="text-slate-400 lg:hidden"
              aria-label="Abrir navegación"
            >
              <Menu size={19} />
            </button>
            <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 md:flex">
              <FlaskConical size={14} className="text-emerald-400" /> Exp. #BD-042
            </div>
            <div className="mx-auto flex rounded-lg border border-slate-800 bg-[#080C14] p-1">
              {modes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onMode(id)}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[10px] font-semibold transition sm:px-3.5 ${mode === id ? "bg-slate-800 text-white shadow" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={onConfig}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300 hover:bg-white/5"
            >
              <Settings2 size={14} />
              <span className="hidden xl:inline">CONFIGURAR</span>
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="grid grid-cols-4 gap-1 border-t border-slate-800/50 p-2 lg:hidden">
              {mobileSections.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`rounded-md px-2 py-2 text-[9px] font-semibold ${section === item.id ? "bg-emerald-500/10 text-emerald-300" : "text-slate-500"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-1 border-t border-slate-800/50 py-2">
            <button
              onClick={() => onView("animated")}
              className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${view === "animated" ? "bg-cyan-500/10 text-cyan-300" : "text-slate-600"}`}
            >
              Vista animada paso a paso
            </button>
            <button
              onClick={() => onView("fast")}
              className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${view === "fast" ? "bg-cyan-500/10 text-cyan-300" : "text-slate-600"}`}
            >
              Vista rápida / gráfica
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1540px] p-4 xl:p-7">{children}</main>
      </div>
    </div>
  );
}
