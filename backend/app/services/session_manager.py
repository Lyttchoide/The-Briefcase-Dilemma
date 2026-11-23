import uuid
from random import Random
from typing import Any

from app.agents.base import BaseAgent, Observation
from app.agents.ppo_agent import PPOAgent
from app.agents.q_learning import QLearningAgent
from app.agents.registry import build_agents
from app.core.config import settings
from app.core.engine import GameEngine
from app.core.entities import GameState, Player, PlayerId, RoundRecord, Simulation
from app.schemas.game_schemas import ExperimentConfig, TurnRequest


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, GameState] = {}
        self._completed: dict[str, Simulation] = {}

    def create(self, config: ExperimentConfig) -> GameState:
        game_id = str(uuid.uuid4())
        players: dict[PlayerId, Player] = {
            player_id: Player(
                player_id,
                f"JUGADOR {player_id}" if agent_kind == "human" else f"AGENTE {player_id}",
                agent_kind,
            )
            for player_id, agent_kind in (("A", config.agent_a), ("B", config.agent_b))
        }
        available_agents = build_agents(config)
        agents: dict[PlayerId, BaseAgent] = {}
        if config.agent_a != "human":
            agents["A"] = available_agents["A"]
        if config.agent_b != "human":
            agents["B"] = available_agents["B"]
        state = GameState(
            id=game_id,
            config=config.model_dump(by_alias=True),
            players=players,
            agents=agents,
            rng_seed=config.seed,
        )
        self._advance_to_human(state)
        self._sessions[game_id] = state
        return state

    def get(self, game_id: str) -> GameState | None:
        return self._sessions.get(game_id)

    def save_simulation(self, simulation: Simulation) -> None:
        self._completed[simulation.id] = simulation

    def get_simulation(self, game_id: str) -> Simulation | None:
        return self._completed.get(game_id)

    def submit(self, game_id: str, turn: TurnRequest) -> GameState:
        state = self.get(game_id)
        if state is None:
            raise KeyError(game_id)
        if state.status == "COMPLETED" or state.awaiting is None:
            raise ValueError("La sesión no espera una decisión humana")
        grid = int(state.config["grid"])
        if state.awaiting == "withdrawer":
            if turn.amount is None or turn.decision is not None:
                raise ValueError("El Retirador debe enviar amount")
            withdrawer = state.current_withdrawer
            assert withdrawer is not None
            amount = GameEngine.validate_amount(
                turn.amount, withdrawer, grid, state.players[withdrawer].initial
            )
            state.pending_amount = amount
            state.players[withdrawer].initial -= amount
            state.awaiting = None
            self._advance_to_human(state)
        else:
            if turn.decision is None or turn.amount is not None:
                raise ValueError("El Guardia debe enviar decision y, para doubt, doubtAmount")
            if turn.decision == "pass" and turn.doubt_amount is not None:
                raise ValueError("PASA no admite doubtAmount")
            if turn.decision == "doubt" and turn.doubt_amount is None:
                raise ValueError("DUDO requiere doubtAmount")
            withdrawer, guard = state.current_withdrawer, state.current_guard
            assert withdrawer is not None and guard is not None and state.pending_amount is not None
            GameEngine.validate_guard(turn.decision, turn.doubt_amount, grid)
            cf_before = {player_id: player.final for player_id, player in state.players.items()}
            outcome = GameEngine.resolve_accounts(
                state.players, withdrawer, guard, state.pending_amount, turn.decision, turn.doubt_amount
            )
            self._learn_from_result(state, cf_before)
            self._record(state, withdrawer, guard, state.pending_amount, turn.decision, turn.doubt_amount, outcome)
            state.round_number += 1
            state.pending_amount = None
            state.awaiting = None
            self._advance_to_human(state)
        return state

    def _advance_to_human(self, state: GameState) -> None:
        rng = Random(state.rng_seed + state.round_number)
        while state.round_number <= settings.rounds:
            withdrawer: PlayerId = "A" if state.round_number % 2 else "B"
            guard: PlayerId = "B" if withdrawer == "A" else "A"
            state.current_withdrawer, state.current_guard = withdrawer, guard
            if state.pending_amount is None:
                if state.players[withdrawer].model == "human":
                    state.awaiting = "withdrawer"
                    state.status = "AWAITING_HUMAN_INPUT"
                    return
                amount = self._agent_amount(state, withdrawer, rng)
                state.pending_amount = GameEngine.validate_amount(
                    amount, withdrawer, int(state.config["grid"]), state.players[withdrawer].initial
                )
                state.players[withdrawer].initial -= state.pending_amount
            amount = state.pending_amount
            if state.players[guard].model == "human":
                state.awaiting = "guard"
                state.status = "AWAITING_HUMAN_INPUT"
                return
            decision, threshold = self._agent_guard(state, guard, rng)
            GameEngine.validate_guard(decision, threshold, int(state.config["grid"]))
            cf_before = {player_id: player.final for player_id, player in state.players.items()}
            outcome = self._resolve(state, withdrawer, guard, amount, decision, threshold)
            self._learn_from_result(state, cf_before)
            self._record(state, withdrawer, guard, amount, decision, threshold, outcome)
            state.round_number += 1
            state.pending_amount = None
        state.awaiting = None
        state.status = "COMPLETED"

    def _agent_observation(self, state: GameState, player: PlayerId) -> Observation:
        opponent: PlayerId = "B" if player == "A" else "A"
        past_records = [r for r in state.records if r.round < state.round_number]

        last_revealed = [r for r in past_records if r.revealed]
        if last_revealed:
            latest = last_revealed[-1]
            opponent_ci = latest.accounts[opponent]["initial"]
            opponent_cf = latest.accounts[opponent]["final"]
            revealed_round_max = latest.round
        else:
            opponent_ci = None
            opponent_cf = None
            revealed_round_max = 0

        known_amounts = tuple(
            record.amount for record in past_records
            if record.withdrawer == opponent and (
                record.outcome == "caught" or record.round <= revealed_round_max
            )
        )

        recent_outcomes = tuple(
            record.outcome for record in past_records if record.guard == player
        )

        return Observation(
            round_number=state.round_number,
            own_ci=state.players[player].initial,
            own_cf=state.players[player].final,
            opponent_cf=opponent_cf,
            grid=int(state.config["grid"]),
            max_withdrawal=min(100_000, state.players[player].initial),
            recent_amounts=known_amounts,
            recent_guard_decisions=tuple(record.decision for record in past_records if record.guard == player),
            opponent_ci=opponent_ci,
            recent_outcomes=recent_outcomes,
        )

    def _agent_amount(self, state: GameState, player: PlayerId, rng: Random) -> int:
        return state.agents[player].decide_briefcase(self._agent_observation(state, player), rng)

    def _agent_guard(self, state: GameState, player: PlayerId, rng: Random) -> tuple[str, int | None]:
        return state.agents[player].decide_guard(self._agent_observation(state, player), rng)

    @staticmethod
    def _resolve(state: GameState, withdrawer: PlayerId, guard: PlayerId, amount: int, decision: str, threshold: int | None) -> str:
        return GameEngine.resolve_accounts(state.players, withdrawer, guard, amount, decision, threshold)

    @staticmethod
    def _learn_from_result(state: GameState, cf_before: dict[PlayerId, int | float]) -> None:
        for player_id, agent in state.agents.items():
            reward = (state.players[player_id].final - cf_before[player_id]) / 100_000
            if isinstance(agent, QLearningAgent):
                agent.observe_reward("withdrawer", reward)
                agent.observe_reward("guard", reward)
            elif isinstance(agent, PPOAgent):
                agent.update(reward)

    @staticmethod
    def _record(state: GameState, withdrawer: PlayerId, guard: PlayerId, amount: int, decision: str, threshold: int | None, outcome: str) -> None:
        state.records.append(
            RoundRecord(
                round=state.round_number,
                withdrawer=withdrawer,
                guard=guard,
                amount=amount,
                decision=decision,
                doubt_amount=threshold if decision == "doubt" else None,
                outcome=outcome,
                accounts={key: GameEngine._account_snapshot(player) for key, player in state.players.items()},
                revealed=state.round_number % 10 == 0,
            )
        )

    @staticmethod
    def snapshot(state: GameState) -> dict[str, Any]:
        current = None
        if state.awaiting is not None:
            current = {
                "round": state.round_number,
                "withdrawer": state.current_withdrawer,
                "guard": state.current_guard,
                "phase": "withdrawal" if state.awaiting == "withdrawer" else "guard",
                "accounts": {
                    key: GameEngine._account_snapshot(player) for key, player in state.players.items()
                },
            }
            if state.awaiting == "guard":
                withdrawer = state.current_withdrawer
                assert withdrawer is not None and state.pending_amount is not None
                current["accounts"][withdrawer]["initial"] += state.pending_amount
            else:
                current["amount"] = None
        return {
            "id": state.id,
            "config": state.config,
            "rounds": state.records,
            "status": state.status,
            "currentRound": current,
        }

    def as_simulation(self, state: GameState) -> Any:
        from app.schemas.game_schemas import SimulationSchema

        return SimulationSchema.model_validate(self.snapshot(state))
