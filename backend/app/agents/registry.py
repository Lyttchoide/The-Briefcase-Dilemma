from app.agents.base import BaseAgent
from app.agents.llm_agent import LLMAgent
from app.agents.ppo_agent import PPOAgent
from app.agents.prob_agent import ProbabilisticAgent
from app.agents.q_learning import QLearningAgent
from app.agents.rule_agent import RuleAgent

AGENT_TYPES: dict[str, type[BaseAgent]] = {
    "rules": RuleAgent,
    "probabilistic": ProbabilisticAgent,
    "q-learning": QLearningAgent,
    "ppo": PPOAgent,
    "llm": LLMAgent,
}


def build_agents(config: object) -> dict[str, BaseAgent]:
    return {
        player: AGENT_TYPES[kind]()
        for player, kind in (("A", config.agent_a), ("B", config.agent_b))
        if kind != "human"
    }
