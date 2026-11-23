import random
from typing import Any

from app.agents.base import BaseAgent, Observation
from app.agents.ppo_agent import PPOAgent
from app.agents.q_learning import QLearningAgent
from app.core.config import settings
from app.core.entities import Player, PlayerId, RoundRecord, Simulation


class GameEngine:
    def __init__(self, config: Any, agents: dict[str, BaseAgent]) -> None:
        self.config = config
        self.agents = agents
        self.rng = random.Random(config.seed)
        self.players: dict[PlayerId, Player] = {
            "A": Player("A", "AGENTE A", config.agent_a),
            "B": Player("B", "AGENTE B", config.agent_b),
        }
        self.records: list[RoundRecord] = []

    def run(self) -> Simulation:
        for round_number in range(1, settings.rounds + 1):
            withdrawer: PlayerId = "A" if round_number % 2 else "B"
            guard: PlayerId = "B" if withdrawer == "A" else "A"
            amount_observation = self._observation(withdrawer, round_number)
            amount = self.agents[withdrawer].decide_briefcase(amount_observation, self.rng)
            amount = self.validate_amount(
                amount, withdrawer, self.config.grid, self.players[withdrawer].initial
            )
            self.players[withdrawer].initial -= amount

            guard_observation = self._observation(guard, round_number)
            decision, threshold = self.agents[guard].decide_guard(guard_observation, self.rng)
            self.validate_guard(decision, threshold, self.config.grid)
            cf_before = {player_id: player.final for player_id, player in self.players.items()}
            outcome = self.resolve(withdrawer, guard, amount, decision, threshold)
            self._learn_from_result(cf_before)
            record = RoundRecord(
                round=round_number,
                withdrawer=withdrawer,
                guard=guard,
                amount=amount,
                decision=decision,
                doubt_amount=threshold if decision == "doubt" else None,
                outcome=outcome,
                accounts={player_id: self._account_snapshot(player) for player_id, player in self.players.items()},
                revealed=round_number % 10 == 0,
            )
            self.records.append(record)
        return Simulation(
            id=f"exp-{self.config.seed}",
            config=self.config.model_dump(by_alias=True),
            rounds=self.records,
        )

    def _observation(self, player_id: PlayerId, round_number: int) -> Observation:
        own = self.players[player_id]
        opponent_id: PlayerId = "B" if player_id == "A" else "A"
        
        # Solo consideramos las rondas pasadas anteriores a la ronda actual
        past_records = [r for r in self.records if r.round < round_number]

        # Información de cuenta del rival: se desconoce hasta la revelación cada 10 rondas.
        # En rondas 1-10 es None. En rondas 11-20 refleja el saldo revelado en la ronda 10, etc.
        last_revealed = [r for r in past_records if r.revealed]
        if last_revealed:
            latest = last_revealed[-1]
            opponent_ci = latest.accounts[opponent_id]["initial"]
            opponent_cf = latest.accounts[opponent_id]["final"]
            revealed_round_max = latest.round
        else:
            opponent_ci = None
            opponent_cf = None
            revealed_round_max = 0

        # Montos del rival conocidos legítimamente (atrapados en duda o revelados en corte de 10 rondas)
        known_amounts = tuple(
            record.amount for record in past_records
            if record.withdrawer == opponent_id and (
                record.outcome == "caught" or record.round <= revealed_round_max
            )
        )

        # Certeza ronda a ronda: saber si falló o acertó la duda cuando actuó de guardia
        recent_outcomes = tuple(
            record.outcome for record in past_records if record.guard == player_id
        )

        return Observation(
            round_number=round_number,
            own_ci=own.initial,
            own_cf=own.final,
            opponent_cf=opponent_cf,
            grid=self.config.grid,
            max_withdrawal=min(settings.max_withdrawal, own.initial),
            recent_amounts=known_amounts,
            recent_guard_decisions=tuple(
                record.decision for record in past_records if record.guard == player_id
            ),
            opponent_ci=opponent_ci,
            recent_outcomes=recent_outcomes,
        )

    def _learn_from_result(self, cf_before: dict[PlayerId, int | float]) -> None:
        for player_id, agent in self.agents.items():
            reward = (self.players[player_id].final - cf_before[player_id]) / 100_000
            if isinstance(agent, QLearningAgent):
                agent.observe_reward("withdrawer", reward)
                agent.observe_reward("guard", reward)
            elif isinstance(agent, PPOAgent):
                agent.update(reward)

    @staticmethod
    def validate_amount(amount: int, withdrawer: PlayerId, grid: int, available_ci: int) -> int:
        if isinstance(amount, bool) or not isinstance(amount, int):
            raise ValueError("M debe ser un entero")
        maximum = min(settings.max_withdrawal, available_ci)
        if amount < 0 or amount > maximum:
            raise ValueError("M debe estar entre 0 y min(100000, CI disponible)")
        if amount % grid:
            raise ValueError(f"M debe respetar la rejilla de {grid}")
        return amount

    @staticmethod
    def validate_guard(decision: str, threshold: int | None, grid: int) -> None:
        if decision == "pass":
            if threshold is not None:
                raise ValueError("PASA no admite umbral X")
            return
        if decision != "doubt":
            raise ValueError("La decisión debe ser pass o doubt")
        if isinstance(threshold, bool) or not isinstance(threshold, int) or threshold <= 0:
            raise ValueError("X debe ser un entero mayor que cero")
        if threshold > settings.max_withdrawal or threshold % grid:
            raise ValueError(f"X debe respetar la rejilla y ser <= {settings.max_withdrawal}")

    def resolve(
        self,
        withdrawer: PlayerId,
        guard: PlayerId,
        amount: int,
        decision: str,
        threshold: int | None,
    ) -> str:
        return self.resolve_accounts(self.players, withdrawer, guard, amount, decision, threshold)

    @staticmethod
    def resolve_accounts(
        players: dict[PlayerId, Player],
        withdrawer: PlayerId,
        guard: PlayerId,
        amount: int,
        decision: str,
        threshold: int | None,
    ) -> str:
        if decision == "pass":
            players[withdrawer].final += amount
            return "pass"
        assert threshold is not None
        if amount == 0:
            bonus = threshold / 2
            players[withdrawer].final += bonus
            players[guard].final -= bonus
            return "failed-doubt"
        if amount <= threshold:
            players[guard].final += amount
            return "caught"
        bonus = threshold / 2
        players[withdrawer].final += amount + bonus
        players[guard].final -= bonus
        return "failed-doubt"

    @staticmethod
    def _account_snapshot(player: Player) -> dict[str, str | int | float]:
        return {
            "id": player.id,
            "name": player.name,
            "model": player.model,
            "initial": player.initial,
            "final": player.final,
        }
