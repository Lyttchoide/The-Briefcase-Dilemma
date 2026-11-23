from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.entities import GameState, Simulation

AgentKind = Literal["rules", "probabilistic", "q-learning", "ppo", "llm", "human"]
GameMode = Literal["ai-ai", "human-ai", "human-human"]
PlayerId = Literal["A", "B"]
Decision = Literal["pass", "doubt"]
Outcome = Literal["pass", "caught", "failed-doubt"]


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ExperimentConfig(APIModel):
    mode: GameMode
    agent_a: AgentKind = Field(alias="agentA")
    agent_b: AgentKind = Field(alias="agentB")
    seed: int
    grid: Literal[1, 10_000]


class PlayerAccount(APIModel):
    id: PlayerId
    name: str
    model: str
    initial: int | float
    final: int | float


class RoundRecord(APIModel):
    round: int
    withdrawer: PlayerId
    guard: PlayerId
    amount: int
    decision: Decision
    doubt_amount: int | None = Field(alias="doubtAmount")
    outcome: Outcome
    accounts: dict[PlayerId, PlayerAccount]
    revealed: bool


class CurrentRound(APIModel):
    round: int
    withdrawer: PlayerId
    guard: PlayerId
    phase: Literal["withdrawal", "guard"]
    amount: int | None = None
    accounts: dict[PlayerId, PlayerAccount]


class SimulationSchema(APIModel):
    id: str
    config: ExperimentConfig
    rounds: list[RoundRecord]
    status: str | None = None
    current_round: CurrentRound | None = Field(default=None, alias="currentRound")

    @classmethod
    def from_simulation(cls, simulation: Simulation) -> "SimulationSchema":
        return cls(
            id=simulation.id,
            config=simulation.config,
            rounds=[RoundRecord.model_validate(record, from_attributes=True) for record in simulation.rounds],
            status="COMPLETED",
        )

    @classmethod
    def from_session(cls, state: GameState) -> "SimulationSchema":
        from app.services.session_manager import SessionManager

        payload = SessionManager.snapshot(state)
        return cls.model_validate(payload)


class ModelSchema(APIModel):
    id: AgentKind
    name: str
    description: str


class TurnRequest(APIModel):
    amount: int | None = None
    decision: Decision | None = None
    doubt_amount: int | None = Field(default=None, alias="doubtAmount")

    @model_validator(mode="after")
    def has_action(self) -> "TurnRequest":
        if self.amount is None and self.decision is None:
            raise ValueError("Se requiere amount o decision")
        return self


class TurnResponse(SimulationSchema):
    pass
