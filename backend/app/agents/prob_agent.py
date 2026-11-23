from random import Random

from app.agents.base import BaseAgent, Observation


class ProbabilisticAgent(BaseAgent):
    kind = "probabilistic"

    def decide_briefcase(self, observation: Observation, rng: Random) -> int:
        level = 0.35 + rng.random() * 0.5
        # Modificar estrategia cada 10 rondas según saldo revelado del rival:
        if observation.opponent_cf is not None:
            cf_gap = observation.opponent_cf - observation.own_cf
            if cf_gap > 0:
                level = min(0.95, level + 0.18)
            else:
                level = max(0.20, level - 0.12)
        raw = min(observation.max_withdrawal, round(100_000 * level))
        return raw // observation.grid * observation.grid

    def decide_guard(self, observation: Observation, rng: Random) -> tuple[str, int | None]:
        recent = observation.recent_amounts[-20:]
        high_amounts = sum(amount > 50_000 for amount in recent)
        posterior_high = (high_amounts + 1) / (len(recent) + 2)

        # Ajuste bayesiano según saldos revelados cada 10 rondas:
        if observation.opponent_cf is not None:
            if observation.opponent_cf < observation.own_cf:
                # Rival va perdiendo: es más probable que intente retiros desesperados
                posterior_high = min(0.90, posterior_high + 0.20)
            elif observation.opponent_cf > observation.own_cf:
                # Nosotros vamos perdiendo: mayor urgencia de interceptar
                posterior_high = min(0.85, posterior_high + 0.15)

        # Certeza ronda a ronda: saber si falló o acertó la última duda
        if observation.recent_outcomes:
            last = observation.recent_outcomes[-1]
            if last == "failed-doubt":
                posterior_high = max(0.15, posterior_high - 0.10)
            elif last == "caught":
                posterior_high = min(0.90, posterior_high + 0.10)

        if rng.random() >= posterior_high:
            return "pass", None
        estimate = sum(recent) // len(recent) if recent else 50_000
        threshold = max(
            observation.grid,
            min(100_000, estimate // observation.grid * observation.grid),
        )
        return "doubt", threshold
