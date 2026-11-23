import json
import logging
import os
import re
import time
from random import Random
from urllib.error import URLError
from urllib.request import Request, urlopen

from app.agents.base import BaseAgent, Observation
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMAgent(BaseAgent):
    kind = "llm"
    _endpoint_unavailable_until: float = 0.0

    def decide_briefcase(self, observation: Observation, rng: Random) -> int:
        result = self._ask("withdrawal", observation)
        try:
            amount = int(result["amount"])
            if 0 <= amount <= observation.max_withdrawal:
                return amount // observation.grid * observation.grid
        except (KeyError, TypeError, ValueError):
            pass
        # Fallback heurístico: escala progresivamente a lo largo del juego con aleatoriedad
        risk_factor = 0.3 + (observation.round_number / 50) * 0.4
        # Ajuste estratégico cuando se revelan los saldos del rival (cada 10 rondas):
        if observation.opponent_cf is not None:
            cf_gap = observation.opponent_cf - observation.own_cf
            if cf_gap > 0:  # Perdiendo: más riesgo para remontar
                risk_factor = min(0.90, risk_factor + 0.25)
            elif cf_gap < 0:  # Ganando: cuidar la ventaja
                risk_factor = max(0.15, risk_factor - 0.15)
        base = observation.max_withdrawal * (0.3 + rng.random() * risk_factor)
        return max(observation.grid, min(observation.max_withdrawal, int(base) // observation.grid * observation.grid))

    def decide_guard(self, observation: Observation, rng: Random) -> tuple[str, int | None]:
        result = self._ask("guard", observation)
        if result.get("decision") == "doubt":
            try:
                amount = max(observation.grid, min(100_000, int(result["threshold"])))
                return "doubt", amount // observation.grid * observation.grid
            except (KeyError, TypeError, ValueError):
                pass
        # Fallback heurístico:
        # Certeza ronda a ronda: saber si falló o acertó la duda previa
        last_outcome = observation.recent_outcomes[-1] if observation.recent_outcomes else None
        doubt_prob = 0.35

        # Ajuste estratégico cada 10 rondas según saldo rival:
        if observation.opponent_cf is not None:
            if observation.opponent_cf > observation.own_cf:
                doubt_prob = 0.55  # Perdiendo: mayor necesidad de dudar para interceptar
            else:
                doubt_prob = 0.25  # Ganando: evitar penalizaciones

        # Ajuste por acierto/fallo reciente:
        if last_outcome == "failed-doubt":
            doubt_prob = max(0.15, doubt_prob - 0.15)
        elif last_outcome == "caught":
            doubt_prob = min(0.75, doubt_prob + 0.15)

        if observation.recent_amounts:
            avg_recent = sum(observation.recent_amounts[-5:]) / len(observation.recent_amounts[-5:])
            if avg_recent > 40_000 and rng.random() < doubt_prob + 0.1:
                threshold = int(avg_recent * 0.6)
                threshold = max(observation.grid, threshold // observation.grid * observation.grid)
                return "doubt", threshold

        if rng.random() < doubt_prob:
            mult = 0.5 if observation.opponent_cf and observation.opponent_cf > observation.own_cf else 0.3
            threshold = int(observation.max_withdrawal * (mult + rng.random() * 0.4))
            threshold = max(observation.grid, threshold // observation.grid * observation.grid)
            return "doubt", threshold
        return "pass", None

    def _ask(self, role: str, observation: Observation) -> dict[str, object]:
        now = time.time()
        if now < LLMAgent._endpoint_unavailable_until:
            return {}

        endpoint = os.getenv("STRATEGIA_LLM_URL", settings.llm_url)
        opp_ci = observation.opponent_ci if observation.opponent_ci is not None else "hidden (revealed every 10 rounds)"
        opp_cf = observation.opponent_cf if observation.opponent_cf is not None else "hidden (revealed every 10 rounds)"
        last_guard_outcome = observation.recent_outcomes[-1] if observation.recent_outcomes else "none"

        payload = {
            "model": os.getenv("STRATEGIA_LLM_MODEL", settings.llm_model),
            "stream": False,
            "format": "json",
            "prompt": (
                f"Return only JSON. Role={role}; round={observation.round_number}; "
                f"own_ci={observation.own_ci}; own_cf={observation.own_cf}; "
                f"opponent_ci={opp_ci}; opponent_cf={opp_cf}; "
                f"grid={observation.grid}; max_withdrawal={observation.max_withdrawal}; "
                f"last_guard_outcome={last_guard_outcome}; "
                f"recent_known_amounts={observation.recent_amounts}. "
                "Rule: Opponent balances are revealed only every 10 rounds. If trailing, take risk to recover; if leading, protect capital. "
                'Use {"amount": integer} for withdrawal or '
                '{"decision":"pass"} / {"decision":"doubt","threshold":integer} for guard.'
            ),
        }
        request = Request(
            endpoint,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=1.0) as response:
                body = json.loads(response.read())

            if isinstance(body, dict):
                if "response" in body:
                    text = body["response"]
                elif "choices" in body and body["choices"]:
                    text = body["choices"][0].get("message", {}).get("content", "")
                else:
                    text = body
            else:
                text = body

            if isinstance(text, str):
                cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
                parsed = json.loads(cleaned)
            else:
                parsed = text

            return parsed if isinstance(parsed, dict) else {}
        except (URLError, TimeoutError, OSError) as exc:
            LLMAgent._endpoint_unavailable_until = time.time() + 30.0
            logger.warning(
                "LLM endpoint %s not available (%s). Using heuristic fallback for next 30s.",
                endpoint,
                exc,
            )
            return {}
        except (json.JSONDecodeError, TypeError, KeyError):
            return {}

