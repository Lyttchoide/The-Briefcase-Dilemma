import type { ExperimentConfig, RoundRecord, Simulation, TurnResponse } from "../game.service";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
  return response.json() as Promise<T>;
}

export interface SegmentMetricData {
  segment: number;
  range: string;
  roundsCount: number;
  exposure: number;
  avgWithdrawal: number;
  doubtFreq: number;
  guardAcc: number;
  penalties: number;
  interceptedCapital: number;
  doubtsCount: number;
  caughtCount: number;
  failedCount: number;
  passesCount: number;
}

export const apiClient = {
  health: () => request<{ status: string }>("/health"),
  startGame: (config: ExperimentConfig) =>
    request<Simulation>("/api/v1/game/start", { method: "POST", body: JSON.stringify(config) }),
  submitTurn: (id: string, turn: Partial<RoundRecord>) =>
    request<TurnResponse>(`/api/v1/game/${id}/turn`, { method: "POST", body: JSON.stringify(turn) }),
  getGameState: (id: string) => request<Simulation>(`/api/v1/game/${id}`),
  getAnalytics: (id: string) =>
    request<{
      capitalExposed: number;
      doubtFrequency: number;
      guardAccuracy: number;
      cfPenalties: number;
      profiles: Record<string, Record<string, number>>;
      segmentAnalytics?: SegmentMetricData[];
      accountEvolution: { round: number; ciA: number; cfA: number; ciB: number; cfB: number }[];
    }>(`/api/v1/game/${id}/analytics`),
  listModels: () => request<unknown[]>("/api/v1/models"),
  exportGame: async (id: string, format: "csv" | "json"): Promise<Blob> => {
    const response = await fetch(`${BASE_URL}/api/v1/game/${id}/export?format=${format}`);
    if (!response.ok) throw new Error(`API ${response.status}: ${response.statusText}`);
    return response.blob();
  },
};
