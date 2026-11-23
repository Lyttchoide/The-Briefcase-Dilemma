export const money = (value: number, compact = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(value);

export const clampMoney = (value: number, available = 100_000) =>
  Math.max(0, Math.min(Math.round(value), Math.min(100_000, available)));

export const isRevealRound = (round: number) => round % 10 === 0;

export type EconomicOutcome = "pass" | "caught" | "failed-doubt";

export const resolveEconomicOutcome = (amount: number, doubt: number | null): EconomicOutcome => {
  if (doubt === null) return "pass";
  return amount > 0 && amount <= doubt ? "caught" : "failed-doubt";
};
