import type { AgentKind } from "./game.service";

export interface AIModel {
  id: AgentKind;
  name: string;
  description: string;
}

export const availableModels: AIModel[] = [
  { id: "rules", name: "Reglas", description: "Política determinista auditable" },
  { id: "probabilistic", name: "Probabilístico", description: "Inferencia bayesiana" },
  { id: "q-learning", name: "Q-Learning", description: "Valor-acción tabular" },
  { id: "ppo", name: "PPO", description: "Aprendizaje por refuerzo profundo" },
  { id: "llm", name: "LLM", description: "Razonamiento estratégico" },
  { id: "human", name: "Humano", description: "Control manual local" },
];

export const seedPresets = [7, 42, 314, 2025];
