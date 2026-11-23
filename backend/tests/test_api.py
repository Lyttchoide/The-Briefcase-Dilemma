from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_models_match_frontend_catalog() -> None:
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    assert [model["id"] for model in response.json()] == [
        "rules",
        "probabilistic",
        "q-learning",
        "ppo",
        "llm",
        "human",
    ]


def test_start_returns_frontend_simulation_contract_and_csv_export() -> None:
    response = client.post(
        "/api/v1/game/start",
        json={
            "mode": "ai-ai",
            "agentA": "rules",
            "agentB": "probabilistic",
            "seed": 314,
            "grid": 10_000,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"id", "config", "rounds", "status", "currentRound"}
    assert payload["status"] == "COMPLETED"
    assert len(payload["rounds"]) == 50
    assert set(payload["rounds"][0]) == {
        "round",
        "withdrawer",
        "guard",
        "amount",
        "decision",
        "doubtAmount",
        "outcome",
        "accounts",
        "revealed",
    }

    exported = client.get(f"/api/v1/game/{payload['id']}/export?format=csv")
    assert exported.status_code == 200
    assert exported.text.startswith("round,withdrawer,guard,amount,decision")

    analytics = client.get(f"/api/v1/game/{payload['id']}/analytics")
    assert analytics.status_code == 200
    metrics = analytics.json()
    assert metrics["capitalExposed"] == sum(round["amount"] for round in payload["rounds"])
    assert len(metrics["accountEvolution"]) == 50
    assert len(metrics["events"]) == 50
    assert len(metrics["segmentAnalytics"]) == 10  # 5 segmentos × 2 jugadores
    assert metrics["segmentAnalytics"][0]["range"] == "1-10"
    assert "doubtFreq" in metrics["segmentAnalytics"][0]
    assert "player" in metrics["segmentAnalytics"][0]


def test_human_guard_start_and_turn_never_include_current_amount_early() -> None:
    response = client.post(
        "/api/v1/game/start",
        json={
            "mode": "human-ai",
            "agentA": "rules",
            "agentB": "human",
            "seed": 7,
            "grid": 1,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "AWAITING_HUMAN_INPUT"
    assert payload["currentRound"]["phase"] == "guard"
    assert payload["currentRound"]["amount"] is None
    assert payload["currentRound"]["accounts"]["A"]["initial"] == 2_000_000

    state = client.get(f"/api/v1/game/{payload['id']}")
    assert state.status_code == 200
    assert state.json()["currentRound"]["amount"] is None

    response = client.post(
        f"/api/v1/game/{payload['id']}/turn",
        json={"decision": "doubt", "doubtAmount": 100_000},
    )
    assert response.status_code == 200
    assert response.json()["rounds"][0]["amount"] == 100_000


def test_start_with_llm_agent_completes_gracefully() -> None:
    response = client.post(
        "/api/v1/game/start",
        json={
            "mode": "ai-ai",
            "agentA": "llm",
            "agentB": "rules",
            "seed": 99,
            "grid": 10_000,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "COMPLETED"
    assert len(payload["rounds"]) == 50
