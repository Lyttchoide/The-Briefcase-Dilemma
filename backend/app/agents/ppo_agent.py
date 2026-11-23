from random import Random

from app.agents.base import BaseAgent, Observation


class PPOAgent(BaseAgent):
    """Small stochastic policy that can update its weights from realized rewards."""

    kind = "ppo"

    def __init__(self) -> None:
        self.withdrawal_bias = 0.52
        self.guard_bias = 0.48

    def decide_briefcase(self, observation: Observation, rng: Random) -> int:
        progress = observation.round_number / 50
        fraction = min(0.9, max(0.1, self.withdrawal_bias + progress * 0.15))
        # Ajuste estratégico según saldo revelado del rival cada 10 rondas:
        if observation.opponent_cf is not None:
            cf_diff = (observation.opponent_cf - observation.own_cf) / 100_000
            if cf_diff > 0:
                fraction = min(0.95, fraction + 0.15)
            elif cf_diff < -1.0:
                fraction = max(0.15, fraction - 0.10)
        raw = min(observation.max_withdrawal, round(100_000 * fraction))
        return raw // observation.grid * observation.grid

    def decide_guard(self, observation: Observation, rng: Random) -> tuple[str, int | None]:
        bias = self.guard_bias
        # Ajuste según información del rival revelada cada 10 rondas:
        if observation.opponent_cf is not None:
            if observation.opponent_cf > observation.own_cf:
                bias = min(0.85, bias + 0.20)
            else:
                bias = max(0.20, bias - 0.10)

        # Certeza ronda a ronda: saber si falló o acertó la última duda
        if observation.recent_outcomes:
            if observation.recent_outcomes[-1] == "caught":
                bias = min(0.90, bias + 0.05)
            elif observation.recent_outcomes[-1] == "failed-doubt":
                bias = max(0.15, bias - 0.08)

        if rng.random() < bias:
            threshold = 60_000 if observation.opponent_cf and observation.opponent_cf > observation.own_cf else 50_000
            return "doubt", max(observation.grid, min(100_000, threshold))
        return "pass", None

    def update(self, reward: float) -> None:
        step = 0.01
        self.withdrawal_bias = min(0.9, max(0.1, self.withdrawal_bias + step * reward))
        self.guard_bias = min(0.9, max(0.1, self.guard_bias - step * reward))
