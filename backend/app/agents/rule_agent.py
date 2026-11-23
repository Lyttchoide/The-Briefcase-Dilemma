from random import Random

from app.agents.base import BaseAgent, Observation


class RuleAgent(BaseAgent):
    kind = "rules"

    def decide_briefcase(self, observation: Observation, rng: Random) -> int:
        risk = 0.32 + observation.round_number / 50 * 0.26
        # Ajuste estratégico cuando se revela el saldo del rival (cada 10 rondas):
        if observation.opponent_cf is not None:
            cf_gap = observation.opponent_cf - observation.own_cf
            if cf_gap > 0:
                # Vamos perdiendo: asumir mayor riesgo para remontar
                risk = min(0.95, risk + (cf_gap / 500_000) * 0.25)
            elif cf_gap < 0:
                # Vamos ganando: jugar más conservador para asegurar la ventaja
                risk = max(0.20, risk - (abs(cf_gap) / 500_000) * 0.15)
        amount = min(observation.max_withdrawal, int(100_000 * (0.75 + risk)))
        return amount // observation.grid * observation.grid

    def decide_guard(self, observation: Observation, rng: Random) -> tuple[str, int | None]:
        threshold = observation.recent_amounts[-1] if observation.recent_amounts else 50_000
        threshold = max(observation.grid, min(100_000, threshold))

        # Frecuencia de duda adaptada según el estado del rival cada 10 rondas:
        if observation.opponent_cf is not None:
            if observation.opponent_cf > observation.own_cf:
                # Perdiendo: dudar más seguido (cada 2 rondas) para interceptar fondos
                frequency = 2
            else:
                # Ganando: evitar penalizaciones X/2 (cada 4 rondas)
                frequency = 4
        else:
            frequency = 3

        # Certeza ronda a ronda: si falló la duda previa, ajustar umbral
        if observation.recent_outcomes and observation.recent_outcomes[-1] == "failed-doubt":
            threshold = min(100_000, threshold + 10_000)

        return ("doubt", threshold) if observation.round_number % frequency == 0 else ("pass", None)
