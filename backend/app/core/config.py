import os
from dataclasses import dataclass

GRID_OPTIONS = (1, 10_000)


@dataclass(frozen=True)
class Settings:
    cors_origins: list[str]
    initial_ci: int = 2_000_000
    initial_cf: int = 500_000
    max_withdrawal: int = 100_000
    rounds: int = 50
    llm_url: str = "http://localhost:11434/api/generate"
    llm_model: str = "llama3.2"


settings = Settings(
    cors_origins=os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8443,http://127.0.0.1:8443",
    ).split(",")
)
