from collections.abc import Sequence

from app.core.entities import RoundRecord


def calculate_analytics(rounds: Sequence[RoundRecord]) -> dict[str, object]:
    doubts = [record for record in rounds if record.decision == "doubt"]
    caught = [record for record in doubts if record.outcome == "caught"]
    failed = [record for record in doubts if record.outcome == "failed-doubt"]
    profiles: dict[str, dict[str, float | int]] = {}
    for player in ("A", "B"):
        withdraws = [record for record in rounds if record.withdrawer == player]
        guards = [record for record in rounds if record.guard == player]
        player_doubts = [record for record in guards if record.decision == "doubt"]
        player_caught = [record for record in player_doubts if record.outcome == "caught"]
        player_failed = [record for record in player_doubts if record.outcome == "failed-doubt"]
        allowed = [record for record in guards if record.decision == "pass"]
        profiles[player] = {
            "averageWithdrawal": _average([record.amount for record in withdraws]),
            "capitalRisked": sum(record.amount for record in withdraws),
            "highRiskWithdrawals": sum(record.amount > 75_000 for record in withdraws),
            "interceptionRate": _rate(
                sum(record.outcome == "caught" for record in withdraws), len(withdraws)
            ),
            "doubtRate": _rate(len(player_doubts), len(guards)),
            "guardAccuracy": _rate(len(player_caught), len(player_doubts)),
            "averageThreshold": _average([record.doubt_amount or 0 for record in player_doubts]),
            "cfPenalties": sum((record.doubt_amount or 0) / 2 for record in player_failed),
            "capitalIntercepted": sum(record.amount for record in player_caught),
            "capitalAllowedOnPass": sum(record.amount for record in allowed),
        }
    # ---- Segment analytics por jugador (bloques de 10 rondas) ----
    segment_size = 10
    segment_analytics = []
    for i in range(0, len(rounds), segment_size):
        segment = rounds[i:i + segment_size]
        range_label = f"{i + 1}-{min(i + segment_size, len(rounds))}"
        # métricas por jugador dentro del segmento
        for player in ("A", "B"):
            withdraws = [r for r in segment if r.withdrawer == player]
            guards = [r for r in segment if r.guard == player]
            player_doubts = [r for r in guards if r.decision == "doubt"]
            player_caught = [r for r in player_doubts if r.outcome == "caught"]
            player_failed = [r for r in player_doubts if r.outcome == "failed-doubt"]
            allowed = [r for r in guards if r.decision == "pass"]
            seg_exposure = sum(r.amount for r in withdraws)
            seg_penalties = sum((r.doubt_amount or 0) / 2 for r in player_failed)

            segment_analytics.append({
                "segment": (i // segment_size) + 1,
                "range": range_label,
                "player": player,
                "roundsCount": len(segment),
                "exposure": seg_exposure,
                "avgWithdrawal": _average([r.amount for r in withdraws]),
                "doubtFreq": _rate(len(player_doubts), len(guards)),
                "guardAcc": _rate(len(player_caught), len(player_doubts)),
                "penalties": seg_penalties,
                "interceptedCapital": sum(r.amount for r in player_caught),
                "doubtsCount": len(player_doubts),
                "caughtCount": len(player_caught),
                "failedCount": len(player_failed),
                "passesCount": len(allowed),
            })
    events = []
    previous_ci = {"A": 2_000_000, "B": 2_000_000}
    previous_cf = {"A": 500_000, "B": 500_000}
    for record in rounds:
        ci_after = {player: record.accounts[player]["initial"] for player in ("A", "B")}
        cf_after = {player: record.accounts[player]["final"] for player in ("A", "B")}
        events.append(
            {
                "round": record.round,
                "withdrawer": record.withdrawer,
                "guard": record.guard,
                "amount": record.amount,
                "decision": record.decision,
                "doubtAmount": record.doubt_amount,
                "outcome": record.outcome,
                "ciDelta": {player: ci_after[player] - previous_ci[player] for player in ("A", "B")},
                "cfDelta": {player: cf_after[player] - previous_cf[player] for player in ("A", "B")},
            }
        )
        previous_ci, previous_cf = ci_after, cf_after
    return {
        "capitalExposed": sum(record.amount for record in rounds),
        "doubtFrequency": _rate(len(doubts), len(rounds)),
        "guardAccuracy": _rate(len(caught), len(doubts)),
        "cfPenalties": sum((record.doubt_amount or 0) / 2 for record in failed),
        "profiles": profiles,
        "segmentAnalytics": segment_analytics,
        "accountEvolution": [
            {
                "round": record.round,
                "ciA": record.accounts["A"]["initial"],
                "cfA": record.accounts["A"]["final"],
                "ciB": record.accounts["B"]["initial"],
                "cfB": record.accounts["B"]["final"],
            }
            for record in rounds
        ],
        "events": events,
    }


def _rate(numerator: int, denominator: int) -> float:
    return numerator / denominator * 100 if denominator else 0.0


def _average(values: list[int]) -> float:
    return sum(values) / len(values) if values else 0.0
