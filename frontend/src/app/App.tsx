import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, RotateCcw } from "lucide-react";
import { useGameEngine } from "../hooks/useGameEngine";
import type { GameMode, ViewMode } from "../services/game.service";
import { gameService, isBackendEnabled } from "../services/game.service";
import { Layout } from "./components/Layout";
import { ModelsPanel } from "./components/ModelsPanel";
import type { AppSection } from "./components/Sidebar";
import { BalanceRevealPanel } from "./components/arena/BalanceRevealPanel";
import { BriefcaseStage } from "./components/arena/BriefcaseStage";
import { PrivacyCurtain } from "./components/arena/PrivacyCurtain";
import { ExperimentConfigModal } from "./components/controls/ExperimentConfigModal";
import { HumanInputPanel } from "./components/controls/HumanInputPanel";
import { PlaybackBar } from "./components/controls/PlaybackBar";
import { DataExportMenu } from "./components/metrics/DataExportMenu";
import { AnalyticsPanel } from "./components/metrics/AnalyticsPanel";
import { LogsPanel } from "./components/metrics/LogsPanel";
import { Badge } from "./components/ui/Badge";

export default function App() {
  const game = useGameEngine();
  const [view, setView] = useState<ViewMode>("animated");
  const [configOpen, setConfigOpen] = useState(false);
  const [section, setSection] = useState<AppSection>("arena");
  const [humanRole, setHumanRole] = useState<"withdrawer" | "guard">("withdrawer");
  const [revealRound, setRevealRound] = useState<number | null>(null);
  const [acknowledgedReveal, setAcknowledgedReveal] = useState<number | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const exportRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    gameService.health().then(
      (health) => active && setBackendOnline(health.status === "ok"),
      () => active && setBackendOnline(false),
    );
    return () => {
      active = false;
    };
  }, []);

  const changeMode = (mode: GameMode) => {
    const next = {
      ...game.config,
      mode,
      agentA: mode === "ai-ai" ? ("q-learning" as const) : ("human" as const),
      agentB: mode === "human-human" ? ("human" as const) : ("ppo" as const),
    };
    game.configure(next);
    setHumanRole("withdrawer");
    setSection("arena");
    setRevealRound(null);
    setAcknowledgedReveal(null);
  };

  const deposit = async (amount: number) => {
    game.begin();
    game.overrideCurrent({ amount });
    game.setPhase(1);
    setHumanRole("guard");
    if (game.config.mode === "human-human") game.setPrivacyVisible(true);
    else {
      game.setPhase(2);
      game.setIsPlaying(true);
    }
    await game.submitTurn({ amount });
  };

  const decide = async (decision: "pass" | "doubt", doubtAmount: number | null) => {
    game.begin();
    game.overrideCurrent({ decision, doubtAmount });
    game.setPhase(2);
    game.setIsPlaying(true);
    setHumanRole("withdrawer");
    await game.submitTurn({ decision, doubtAmount });
  };

  const isHuman = (player: "A" | "B") =>
    (player === "A" ? game.config.agentA : game.config.agentB) === "human";
  const currentHuman =
    isHuman(game.current.withdrawer) || isHuman(game.current.guard);
  const effectiveHumanRole = isHuman(game.current.withdrawer)
    ? "withdrawer"
    : isHuman(game.current.guard)
      ? "guard"
      : humanRole;
  const roundResolved = game.completedRounds > game.roundIndex;
  const revealAmount =
    !isHuman(game.current.guard) || isHuman(game.current.withdrawer);
  const showHumanControls = currentHuman && game.ready && !game.isPlaying && !roundResolved;
  const displayAccounts =
    roundResolved && game.phase === 3 ? game.current.accounts : game.currentAccounts;
  const exportSimulation = useMemo(
    () => ({ ...game.simulation, rounds: game.visibleRounds }),
    [game.simulation, game.visibleRounds],
  );

  useEffect(() => {
    if (
      game.phase === 3 &&
      game.current.revealed &&
      roundResolved &&
      acknowledgedReveal !== game.current.round
    ) {
      game.setIsPlaying(false);
      setRevealRound(game.current.round);
    }
  }, [
    acknowledgedReveal,
    game.current.revealed,
    game.current.round,
    game.phase,
    game.setIsPlaying,
    roundResolved,
  ]);

  const play = () => {
    if (!game.ready) return;
    game.begin();
    if (currentHuman && !roundResolved) return;
    game.setIsPlaying(!game.isPlaying);
  };

  const arena = (
    <>
      {game.loadError && (
        <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          No se pudo cargar el experimento desde el backend: {game.loadError}
        </p>
      )}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={game.started ? "green" : "slate"}>
              <Radio size={9} className="mr-1" />{" "}
              {game.started ? "EXPERIMENTO EN VIVO" : "EXPERIMENTO PREPARADO"}
            </Badge>
            <span className="font-mono text-[9px] text-slate-600">SEED: {game.config.seed}</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">The Briefcase Dilemma</h1>
          <p className="mt-1 text-[10px] text-slate-500">
            Laboratorio de información asimétrica · Protocolo iterado de 50 rondas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              game.configure(game.config);
              setHumanRole("withdrawer");
              setAcknowledgedReveal(null);
            }}
            className="rounded-lg border border-slate-800 p-2.5 text-slate-500 hover:text-white"
            title="Reiniciar"
          >
            <RotateCcw size={14} />
          </button>
          <DataExportMenu simulation={exportSimulation} />
        </div>
      </div>

      <div className="space-y-4">
        {view === "animated" && (
          <BriefcaseStage
            round={game.current}
            phase={game.phase}
            revealAmount={revealAmount}
            active={game.started}
            accounts={displayAccounts}
          />
        )}
        <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
          <PlaybackBar
            round={game.current.round}
            isPlaying={game.isPlaying}
            speed={game.speed}
            onPlay={play}
            onSpeed={game.setSpeed}
            onSeek={game.setRoundIndex}
          />
          {showHumanControls ? (
            <HumanInputPanel
              role={effectiveHumanRole}
              account={game.currentAccounts[game.current[effectiveHumanRole]]}
              grid={game.config.grid}
              onDeposit={deposit}
              onDecision={decide}
            />
          ) : (
            <div className="grid place-items-center rounded-xl border border-slate-800 bg-[#111827] p-4 text-center">
              <div>
                <p className="text-[10px] font-semibold text-cyan-300">
                  {roundResolved
                    ? "RONDA REGISTRADA"
                    : currentHuman
                      ? "RESOLVIENDO RONDA"
                      : game.started
                        ? "POLÍTICA IA ACTIVA"
                        : "LISTO PARA INICIAR"}
                </p>
                <p className="mt-1 text-[9px] text-slate-600">
                  {roundResolved
                    ? "Pulsa avanzar para continuar con la siguiente ronda."
                    : `Semilla reproducible ${game.config.seed}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Layout
      mode={game.config.mode}
      backendOnline={isBackendEnabled && backendOnline}
      view={view}
      onMode={changeMode}
      onView={setView}
      onConfig={() => setConfigOpen(true)}
      section={section}
      onNavigate={setSection}
    >
      {section === "arena" && arena}
      {section === "analytics" && <AnalyticsPanel rounds={game.visibleRounds} />}
      {section === "logs" && <LogsPanel rounds={game.visibleRounds} />}
      {section === "models" && <ModelsPanel config={game.config} />}

      <PrivacyCurtain
        open={game.privacyVisible}
        onContinue={() => {
          game.setPrivacyVisible(false);
          game.setPhase(1);
        }}
      />
      <BalanceRevealPanel
        round={revealRound ? game.simulation.rounds[revealRound - 1] : null}
        onContinue={() => {
          setAcknowledgedReveal(revealRound);
          setRevealRound(null);
        }}
      />
      <ExperimentConfigModal
        open={configOpen}
        config={game.config}
        onClose={() => setConfigOpen(false)}
        onSave={(config) => {
          game.configure(config);
          setHumanRole("withdrawer");
          setSection("arena");
          setAcknowledgedReveal(null);
        }}
        onExport={() => exportRef.current?.click()}
      />
      <button
        ref={exportRef}
        className="hidden"
        onClick={() => {
          const blob = new Blob([JSON.stringify(exportSimulation, null, 2)], {
            type: "application/json",
          });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `strategia-${game.config.seed}.json`;
          a.click();
        }}
      />
    </Layout>
  );
}
