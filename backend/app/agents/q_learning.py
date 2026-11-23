from random import Random

from app.agents.base import BaseAgent, Observation


class QLearningAgent(BaseAgent):
    kind = "q-learning"

    def __init__(self) -> None:
        self.q_values: dict[tuple[str, int, str, str], list[float]] = {}
        self.last_actions: dict[str, tuple[tuple[str, int, str, str], int]] = {}

    def _state(self, observation: Observation, role: str) -> tuple[str, int, str, str]:
        exposure = min(9, observation.round_number // 5)
        funds = "low" if observation.own_ci < 500_000 else "high"
        # Incorporar la información del rival revelada cada 10 rondas (desconocida antes):
        if observation.opponent_cf is None:
            position = "unknown"
        elif observation.own_cf >= observation.opponent_cf:
            position = "ahead"
        else:
            position = "behind"
        return role, exposure, funds, position

    def decide_briefcase(self, observation: Observation, rng: Random) -> int:
        state = self._state(observation, "withdrawer")
        values = self.q_values.setdefault(state, [0.0] * 11)
        index = max(range(11), key=lambda candidate: values[candidate])
        if rng.random() < 0.18:
            index = rng.randrange(11)
        self.last_actions["withdrawer"] = state, index
        amount = index * 10_000
        return min(amount, observation.max_withdrawal) // observation.grid * observation.grid

    def decide_guard(self, observation: Observation, rng: Random) -> tuple[str, int | None]:
        state = self._state(observation, "guard")
        doubts = observation.recent_guard_decisions.count("doubt")
        position = state[3]
        must_intercept = position == "behind"

        # Certeza ronda a ronda: saber si falló o acertó la duda previa
        last_outcome = observation.recent_outcomes[-1] if observation.recent_outcomes else None

        if observation.round_number % 2 == 0 or doubts < 2 or must_intercept:
            self.last_actions["guard"] = state, 1
            threshold = 40_000 + (doubts * 10_000)
            if must_intercept:
                threshold += 15_000
            if last_outcome == "failed-doubt":
                threshold = max(20_000, threshold - 10_000)
            threshold = max(observation.grid, min(100_000, threshold))
            return "doubt", threshold
        self.last_actions["guard"] = state, 0
        return "pass", None

    def observe_reward(self, role: str, reward: float) -> None:
        action = self.last_actions.pop(role, None)
        if action is None:
            return
        state, index = action
        values = self.q_values.setdefault(state, [0.0] * (11 if role == "withdrawer" else 2))
        values[index] += 0.1 * (reward - values[index])
