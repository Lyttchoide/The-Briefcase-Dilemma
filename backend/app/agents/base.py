from abc import ABC, abstractmethod
from dataclasses import dataclass
from random import Random
from typing import Literal

Decision = Literal["pass", "doubt"]


@dataclass(frozen=True)
class Observation:
    round_number: int
    own_ci: int
    own_cf: int
    opponent_cf: int | None
    grid: int
    max_withdrawal: int
    recent_amounts: tuple[int, ...] = ()
    recent_guard_decisions: tuple[Decision, ...] = ()
    opponent_ci: int | None = None
    recent_outcomes: tuple[str, ...] = ()


class BaseAgent(ABC):
    kind: str

    @abstractmethod
    def decide_briefcase(self, observation: Observation, rng: Random) -> int:
        raise NotImplementedError

    @abstractmethod
    def decide_guard(self, observation: Observation, rng: Random) -> tuple[Decision, int | None]:
        raise NotImplementedError
