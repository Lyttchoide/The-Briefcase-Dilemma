import csv
import io
import json
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse, Response

from app.agents.registry import build_agents
from app.core.config import GRID_OPTIONS
from app.core.engine import GameEngine
from app.schemas.game_schemas import (
    ExperimentConfig,
    ModelSchema,
    SimulationSchema,
    TurnRequest,
    TurnResponse,
)
from app.services.analytics import calculate_analytics
from app.services.session_manager import SessionManager

router = APIRouter()
sessions = SessionManager()


@router.get("/models", response_model=list[ModelSchema])
def list_models() -> list[ModelSchema]:
    return [
        ModelSchema(id="rules", name="Reglas", description="Política determinista auditable"),
        ModelSchema(id="probabilistic", name="Probabilístico", description="Inferencia bayesiana"),
        ModelSchema(id="q-learning", name="Q-Learning", description="Valor-acción tabular"),
        ModelSchema(id="ppo", name="PPO", description="Política de refuerzo entrenable"),
        ModelSchema(id="llm", name="LLM", description="Razonamiento estratégico con fallback local"),
        ModelSchema(id="human", name="Humano", description="Control manual por turnos"),
    ]


@router.post("/game/start", response_model=SimulationSchema)
def start_game(config: ExperimentConfig) -> SimulationSchema:
    if config.grid not in GRID_OPTIONS:
        raise HTTPException(status_code=422, detail="grid debe ser 1 o 10000")
    if config.mode == "ai-ai" and "human" not in (config.agent_a, config.agent_b):
        agents = build_agents(config)
        simulation = GameEngine(config, agents).run()
        sessions.save_simulation(simulation)
        return SimulationSchema.from_simulation(simulation)
    return SimulationSchema.from_session(sessions.create(config))


@router.post("/game/{game_id}/turn", response_model=TurnResponse)
def submit_turn(game_id: str, turn: TurnRequest) -> TurnResponse:
    try:
        state = sessions.submit(game_id, turn)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Sesión no encontrada") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return TurnResponse.from_session(state)


@router.get("/game/{game_id}", response_model=SimulationSchema)
def get_game_state(game_id: str) -> SimulationSchema:
    state = sessions.get(game_id)
    if state is not None:
        return SimulationSchema.from_session(state)
    simulation = sessions.get_simulation(game_id)
    if simulation is not None:
        return SimulationSchema.from_simulation(simulation)
    raise HTTPException(status_code=404, detail="Sesión no encontrada")


@router.get("/game/{game_id}/export")
def export_game(
    game_id: str,
    format: Annotated[Literal["csv", "json"], Query()] = "json",
) -> Response:
    state = sessions.get(game_id)
    simulation = sessions.get_simulation(game_id)
    if state is None and simulation is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if state is not None:
        simulation = sessions.as_simulation(state)
    elif simulation is not None:
        simulation = SimulationSchema.from_simulation(simulation)
    if format == "json":
        return Response(
            content=json.dumps(simulation.model_dump(by_alias=True), indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="strategia-{game_id}.json"'},
        )
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "round", "withdrawer", "guard", "amount", "decision", "doubt_amount",
            "outcome", "ci_a", "cf_a", "ci_b", "cf_b", "revealed",
        ]
    )
    for record in simulation.rounds:
        writer.writerow(
            [
                record.round, record.withdrawer, record.guard, record.amount,
                record.decision, record.doubt_amount or "", record.outcome,
                record.accounts["A"].initial, record.accounts["A"].final,
                record.accounts["B"].initial, record.accounts["B"].final, record.revealed,
            ]
        )
    return PlainTextResponse(
        buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="strategia-{game_id}.csv"'},
    )


@router.get("/game/{game_id}/analytics")
def get_analytics(game_id: str) -> dict[str, object]:
    state = sessions.get(game_id)
    if state is not None:
        records = state.records
    else:
        simulation = sessions.get_simulation(game_id)
        if simulation is None:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        records = simulation.rounds
    return calculate_analytics(records)
