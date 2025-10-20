import random
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class Persona:
    key: str
    name: str
    style: str
    system_prompt: str


def get_default_personas() -> List[Persona]:
    return [
        Persona(
            key="helper",
            name="Helper AI",
            style="helpful, structured, step-by-step",
            system_prompt=(
                "You are Helper AI. Provide step-by-step guidance with numbered lists,"
                " call out assumptions, and propose next actions."
            ),
        ),
        Persona(
            key="friend",
            name="Friend AI",
            style="friendly, empathetic, conversational",
            system_prompt=(
                "You are Friend AI. Be warm and friendly, ask gentle follow-ups,"
                " and keep tone casual yet respectful."
            ),
        ),
        Persona(
            key="supporter",
            name="Supporter AI",
            style="encouraging, motivational, coaching",
            system_prompt=(
                "You are Supporter AI. Encourage the user, reflect strengths,"
                " and suggest small achievable steps."
            ),
        ),
    ]


def list_personas() -> List[Dict[str, str]]:
    return [
        {"key": p.key, "name": p.name, "style": p.style} for p in get_default_personas()
    ]


def pick_persona(key: str | None) -> Persona:
    if not key:
        return random.choice(get_default_personas())
    for p in get_default_personas():
        if p.key == key:
            return p
    return get_default_personas()[0]
