from dataclasses import dataclass, field
from typing import Literal

PlayerId = Literal["A", "B"]
Decision = Literal["pass", "doubt"]
Outcome = Literal["pass", "caught", "failed-doubt"]
AgentKind = Literal["rules", "probabilistic", "q-learning", "ppo", "llm", "human"]
GameMode = Literal["ai-ai", "human-ai", "human-human"]


@dataclass
class Player:
    id: PlayerId
    name: str
    model: AgentKind
    initial: int | float = 2_000_000
    final: int | float = 500_000


@dataclass
class RoundRecord:
    round: int
    withdrawer: PlayerId
    guard: PlayerId
    amount: int
    decision: Decision
    doubt_amount: int | None
    outcome: Outcome
    accounts: dict[PlayerId, dict[str, str | int | float]]
    revealed: bool


@dataclass
class Simulation:
    id: str
    config: dict[str, str | int]
    rounds: list[RoundRecord] = field(default_factory=list)


@dataclass
class GameState:
    id: str
    config: dict[str, str | int]
    players: dict[PlayerId, Player]
    agents: dict[PlayerId, object]
    rng_seed: int
    records: list[RoundRecord] = field(default_factory=list)
    round_number: int = 1
    status: str = "AWAITING_HUMAN_INPUT"
    awaiting: Literal["withdrawer", "guard"] | None = None
    pending_amount: int | None = None
    current_withdrawer: PlayerId | None = None
    current_guard: PlayerId | None = None
