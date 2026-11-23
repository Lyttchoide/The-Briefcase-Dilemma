import { apiClient } from "./_http/apiClient";

export type GameMode = "ai-ai" | "human-ai" | "human-human";
export type ViewMode = "animated" | "fast";
export type PlayerId = "A" | "B";
export type AgentKind = "rules" | "probabilistic" | "q-learning" | "ppo" | "llm" | "human";

export interface ExperimentConfig {
  mode: GameMode;
  agentA: AgentKind;
  agentB: AgentKind;
  seed: number;
  grid: 1 | 10_000;
}

export interface PlayerAccount {
  id: PlayerId;
  name: string;
  model: string;
  initial: number;
  final: number;
}

export interface RoundRecord {
  round: number;
  withdrawer: PlayerId;
  guard: PlayerId;
  amount: number;
  decision: "pass" | "doubt";
  doubtAmount: number | null;
  outcome: "pass" | "caught" | "failed-doubt";
  accounts: Record<PlayerId, PlayerAccount>;
  revealed: boolean;
}

export interface Simulation {
  id: string;
  config: ExperimentConfig;
  rounds: RoundRecord[];
  status?: "COMPLETED" | "AWAITING_HUMAN_INPUT";
  currentRound?: {
    round: number;
    withdrawer: PlayerId;
    guard: PlayerId;
    phase: "withdrawal" | "guard";
    amount?: number | null;
    accounts: Record<PlayerId, PlayerAccount>;
  } | null;
}

export type TurnResponse = Simulation;

export const defaultConfig: ExperimentConfig = {
  mode: "ai-ai",
  agentA: "q-learning",
  agentB: "ppo",
  seed: 42,
  grid: 10_000,
};

// Siempre usamos el backend — mock eliminado
export const isBackendEnabled = true;

export const gameService = {
  async start(config: ExperimentConfig): Promise<Simulation> {
    return apiClient.startGame(config);
  },
  async turn(id: string, payload: Partial<RoundRecord>) {
    return apiClient.submitTurn(id, payload);
  },
  async health() {
    return apiClient.health();
  },
};
