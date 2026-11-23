import pytest

from app.agents.registry import build_agents
from app.core.engine import GameEngine
from app.core.entities import Player
from app.schemas.game_schemas import ExperimentConfig, TurnRequest
from app.services.session_manager import SessionManager


def test_ai_game_has_fifty_alternating_reproducible_rounds() -> None:
    config = ExperimentConfig(
        mode="ai-ai",
        agentA="q-learning",
        agentB="ppo",
        seed=42,
        grid=10_000,
    )
    first = GameEngine(config, build_agents(config)).run()
    second = GameEngine(config, build_agents(config)).run()
    assert len(first.rounds) == 50
    assert first.rounds == second.rounds
    assert all(
        record.withdrawer == ("A" if record.round % 2 else "B")
        for record in first.rounds
    )
    assert [record.round for record in first.rounds if record.revealed] == [10, 20, 30, 40, 50]


def engine() -> GameEngine:
    game = object.__new__(GameEngine)
    game.players = {
        "A": Player("A", "A", "rules", initial=2_000_000, final=500_000),
        "B": Player("B", "B", "rules", initial=2_000_000, final=500_000),
    }
    return game


def test_pass_transfers_amount_to_withdrawer_cf_only() -> None:
    game = engine()
    game.players["A"].initial -= 25_000
    assert game.resolve("A", "B", 25_000, "pass", None) == "pass"
    assert game.players["A"].initial == 1_975_000
    assert game.players["A"].final == 525_000
    assert game.players["B"].final == 500_000


def test_doubt_catches_amount_at_threshold_including_equality() -> None:
    game = engine()
    assert game.resolve("A", "B", 50_000, "doubt", 50_000) == "caught"
    assert game.players["B"].final == 550_000
    assert game.players["A"].final == 500_000


def test_failed_doubt_rewards_withdrawer_and_penalizes_guard_by_half_threshold() -> None:
    game = engine()
    assert game.resolve("A", "B", 70_000, "doubt", 40_000) == "failed-doubt"
    assert game.players["A"].final == 590_000
    assert game.players["B"].final == 480_000


def test_half_threshold_preserves_half_dollar_for_odd_x() -> None:
    game = engine()
    game.resolve("A", "B", 0, "doubt", 1)
    assert game.players["A"].final == 500_000.5
    assert game.players["B"].final == 499_999.5


def test_empty_briefcase_triggers_half_threshold_bonus() -> None:
    game = engine()
    assert game.resolve("A", "B", 0, "doubt", 40_000) == "failed-doubt"
    assert game.players["A"].final == 520_000
    assert game.players["B"].final == 480_000


def test_withdrawer_with_zero_ci_can_only_send_zero() -> None:
    game = engine()
    game.players["A"].initial = 0
    assert GameEngine.validate_amount(0, "A", 10_000, 0) == 0
    with pytest.raises(ValueError):
        GameEngine.validate_amount(10_000, "A", 10_000, 0)


def test_actions_validate_grid_and_positive_doubt_threshold() -> None:
    assert GameEngine.validate_amount(20_000, "A", 10_000, 2_000_000) == 20_000
    with pytest.raises(ValueError):
        GameEngine.validate_amount(20_001, "A", 10_000, 2_000_000)
    with pytest.raises(ValueError):
        GameEngine.validate_guard("doubt", 0, 10_000)


def test_human_guard_state_does_not_expose_withdrawn_amount() -> None:
    config = ExperimentConfig(
        mode="human-ai",
        agentA="rules",
        agentB="human",
        seed=7,
        grid=1,
    )
    manager = SessionManager()
    state = manager.create(config)
    payload = manager.snapshot(state)
    assert payload["status"] == "AWAITING_HUMAN_INPUT"
    assert payload["currentRound"]["phase"] == "guard"
    assert "amount" not in payload["currentRound"]
    before_ci = payload["currentRound"]["accounts"]["A"]["initial"]
    assert before_ci == 2_000_000


def test_human_turns_resolve_without_revealing_until_guard_submits() -> None:
    config = ExperimentConfig(
        mode="human-human",
        agentA="human",
        agentB="human",
        seed=7,
        grid=1,
    )
    manager = SessionManager()
    state = manager.create(config)
    after_withdrawal = manager.submit(state.id, TurnRequest(amount=63_321))
    payload = manager.snapshot(after_withdrawal)
    assert payload["currentRound"]["phase"] == "guard"
    assert "amount" not in payload["currentRound"]
    assert payload["currentRound"]["accounts"]["A"]["initial"] == 2_000_000

    resolved = manager.submit(state.id, TurnRequest(decision="doubt", doubtAmount=63_321))
    assert resolved.records[0].outcome == "caught"


def test_opponent_account_revealed_strictly_every_ten_rounds() -> None:
    config = ExperimentConfig(
        mode="ai-ai",
        agentA="rules",
        agentB="probabilistic",
        seed=101,
        grid=10_000,
    )
    agents = build_agents(config)
    game = GameEngine(config, agents)

    # Rondas 1 a 10: el rival desconoce saldos inicial y final (ambos None)
    for r in range(1, 11):
        obs_a = game._observation("A", r)
        obs_b = game._observation("B", r)
        assert obs_a.opponent_ci is None, f"En ronda {r}, opponent_ci de A debe ser None"
        assert obs_a.opponent_cf is None, f"En ronda {r}, opponent_cf de A debe ser None"
        assert obs_b.opponent_ci is None, f"En ronda {r}, opponent_ci de B debe ser None"
        assert obs_b.opponent_cf is None, f"En ronda {r}, opponent_cf de B debe ser None"

    # Corremos la simulación completa de 50 rondas
    simulation = game.run()
    assert len(simulation.rounds) == 50

    # Verificamos que a partir de la ronda 11 (y hasta la 20), el agente conoce exactamente
    # los saldos revelados al final de la ronda 10
    round_10_accounts = simulation.rounds[9].accounts
    obs_r11_a = game._observation("A", 11)
    obs_r11_b = game._observation("B", 11)

    assert obs_r11_a.opponent_ci == round_10_accounts["B"]["initial"]
    assert obs_r11_a.opponent_cf == round_10_accounts["B"]["final"]
    assert obs_r11_b.opponent_ci == round_10_accounts["A"]["initial"]
    assert obs_r11_b.opponent_cf == round_10_accounts["A"]["final"]

    # Verificamos que los saldos revelados se mantienen congelados hasta la siguiente revelación (ronda 20)
    obs_r19_a = game._observation("A", 19)
    assert obs_r19_a.opponent_cf == round_10_accounts["B"]["final"]

    # En la ronda 21, se actualiza a los saldos revelados en la ronda 20
    round_20_accounts = simulation.rounds[19].accounts
    obs_r21_a = game._observation("A", 21)
    assert obs_r21_a.opponent_cf == round_20_accounts["B"]["final"]

    # Verificamos que la certeza ronda a ronda incluye los resultados de duda (caught, failed-doubt, pass)
    assert len(obs_r21_a.recent_outcomes) > 0
    assert all(outcome in ("pass", "caught", "failed-doubt") for outcome in obs_r21_a.recent_outcomes)
