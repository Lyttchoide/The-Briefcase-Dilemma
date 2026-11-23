import { useEffect, useMemo, useState } from "react";
import {
  defaultConfig,
  gameService,
  type ExperimentConfig,
  type PlayerId,
  type RoundRecord,
  type Simulation,
} from "../services/game.service";

export type GamePhase = 0 | 1 | 2 | 3;

// Cuentas vacías para el estado inicial antes de que el backend responda
const EMPTY_ACCOUNTS = {
  A: { id: "A" as PlayerId, name: "AGENTE A", model: "", initial: 2_000_000, final: 500_000 },
  B: { id: "B" as PlayerId, name: "AGENTE B", model: "", initial: 2_000_000, final: 500_000 },
};

function emptySimulation(config: ExperimentConfig): Simulation {
  return {
    id: "",
    config,
    rounds: [],
    status: undefined,
    currentRound: null,
  };
}

export function useGameEngine() {
  const [config, setConfig] = useState<ExperimentConfig>(defaultConfig);
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [simulation, setSimulation] = useState<Simulation>(() => emptySimulation(defaultConfig));
  const [started, setStarted] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    setReady(false);
    setSimulation(emptySimulation(config));

    gameService.start(config).then(
      (nextSimulation) => {
        if (!active) return;
        setSimulation(nextSimulation);
        setReady(true);
      },
      (reason: unknown) => {
        if (active) {
          setLoadError(reason instanceof Error ? reason.message : "Error al cargar juego");
        }
      },
    );
    return () => {
      active = false;
    };
  }, [config, sessionVersion]);

  const configure = (next: ExperimentConfig) => {
    setConfig(next);
    setSimulation(emptySimulation(next));
    setReady(false);
    setLoadError(null);
    setRoundIndex(0);
    setPhase(0);
    setIsPlaying(false);
    setStarted(false);
    setCompletedRounds(0);
    setPrivacyVisible(false);
    setSessionVersion((value) => value + 1);
  };

  const submitTurn = async (payload: Partial<RoundRecord>) => {
    try {
      const response = await gameService.turn(simulation.id, payload);
      if (!("rounds" in response)) return;
      setSimulation((currentSimulation) => {
        const resolved = new Map(response.rounds.map((round) => [round.round, round]));
        return {
          ...currentSimulation,
          status: response.status,
          currentRound: response.currentRound,
          rounds: currentSimulation.rounds.map(
            (round) => resolved.get(round.round) ?? round,
          ),
        };
      });
      setLoadError(null);
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "No se pudo enviar la decisión");
    }
  };

  useEffect(() => {
    if (!isPlaying || privacyVisible) return;
    const timer = window.setTimeout(() => {
      if (phase < 3) {
        const nextPhase = (phase + 1) as GamePhase;
        setPhase(nextPhase);
        if (nextPhase === 3) setCompletedRounds((value) => Math.max(value, roundIndex + 1));
      } else if (roundIndex < simulation.rounds.length - 1) {
        const nextRound = simulation.rounds[roundIndex + 1];
        const hasHumanActor =
          nextRound &&
          ((nextRound.withdrawer === "A" ? config.agentA : config.agentB) === "human" ||
            (nextRound.guard === "A" ? config.agentA : config.agentB) === "human");
        setPhase(0);
        setRoundIndex((value) => value + 1);
        if (config.mode !== "ai-ai" || hasHumanActor) setIsPlaying(false);
      } else setIsPlaying(false);
    }, 1500 / speed);
    return () => window.clearTimeout(timer);
  }, [isPlaying, phase, roundIndex, speed, privacyVisible, config, simulation.rounds]);

  // Ronda actual: si no hay rondas aún, placeholder vacío
  const current: RoundRecord = simulation.rounds[roundIndex] ?? {
    round: 1,
    withdrawer: "A" as PlayerId,
    guard: "B" as PlayerId,
    amount: 0,
    decision: "pass" as const,
    doubtAmount: null,
    outcome: "pass" as const,
    accounts: EMPTY_ACCOUNTS,
    revealed: false,
  };

  const currentAccounts = useMemo(
    () =>
      roundIndex === 0 || simulation.rounds.length === 0
        ? EMPTY_ACCOUNTS
        : (structuredClone(simulation.rounds[roundIndex - 1].accounts) as Record<
            PlayerId,
            (typeof current.accounts)[PlayerId]
          >),
    [current.accounts, roundIndex, simulation.rounds],
  );

  const visibleRounds = useMemo(
    () => simulation.rounds.slice(0, completedRounds),
    [simulation, completedRounds],
  );

  return {
    config,
    configure,
    simulation,
    current,
    currentAccounts,
    visibleRounds,
    completedRounds,
    loadError,
    ready,
    submitTurn,
    started,
    begin: () => setStarted(true),
    roundIndex,
    setRoundIndex: (index: number) => {
      if (simulation.rounds.length === 0) return;
      const requested = Math.max(0, Math.min(simulation.rounds.length - 1, index));
      const accessible = config.mode === "ai-ai" ? requested : Math.min(requested, completedRounds);
      if (config.mode === "ai-ai" && accessible > completedRounds) {
        setCompletedRounds(accessible);
        setStarted(true);
      }
      setRoundIndex(accessible);
      setPhase(0);
      setIsPlaying(false);
    },
    phase,
    setPhase,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    privacyVisible,
    setPrivacyVisible,
    overrideCurrent: (_patch: Partial<Pick<RoundRecord, "amount" | "decision" | "doubtAmount">>) => {
      // En modo backend, el override local no aplica; las rondas vienen del servidor
    },
  };
}
