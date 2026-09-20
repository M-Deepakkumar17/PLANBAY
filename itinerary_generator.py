"""
AI Layer 2 — Itinerary Generation.

Default: a deterministic rule-based generator that spreads a
destination's `activities` list across Morning / Afternoon / Evening
slots for the requested number of days, and computes a per-day cost
via utils/budget.py.

Optional: if USE_LLM=true in .env, `generate_with_llm()` is used
instead. It supports either:
  - OpenAI-compatible Chat Completions API (set OPENAI_API_KEY)
  - A local Ollama server (set OLLAMA_URL / OLLAMA_MODEL)
Both are wired to return the same JSON shape as the rule-based
generator so the rest of the app doesn't need to care which one ran.
"""
import os
import json
import random
from typing import List, Dict, Any

import requests

from utils.budget import estimate_day_cost

USE_LLM = os.getenv("USE_LLM", "false").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

SLOT_TIMES = {"morning": "08:00 AM", "afternoon": "01:30 PM", "evening": "06:00 PM"}
SLOT_ICONS = {"morning": "🌅", "afternoon": "🍛", "evening": "🌄"}


def _rule_based_day(destination: Dict[str, Any], day_number: int, activity_pool: List[str], travelers: int, budget_per_day: float) -> Dict[str, Any]:
    """Pick up to 3 non-repeating activities for a single day."""
    slots = ["morning", "afternoon", "evening"]
    chosen = []
    pool = activity_pool.copy()
    random.shuffle(pool)

    for i, slot in enumerate(slots):
        if pool:
            chosen.append(pool.pop())
        else:
            chosen.append(f"Free time / leisure at {destination.get('destination')}")

    cost = estimate_day_cost(
        average_daily_cost=destination.get("average_daily_cost", 3000),
        travelers=travelers,
        budget_cap=budget_per_day,
    )

    return {
        "day": day_number,
        "morning": chosen[0],
        "afternoon": chosen[1],
        "evening": chosen[2],
        "timeline": [
            {"time": SLOT_TIMES[s], "icon": SLOT_ICONS[s], "slot": s.capitalize(), "activity": chosen[i]}
            for i, s in enumerate(slots)
        ],
        "estimated_cost": cost["total"],
        "cost_breakdown": cost,
    }


def generate_rule_based(destination: Dict[str, Any], days: int, budget: float, travelers: int, interests: List[str]) -> Dict[str, Any]:
    activities = destination.get("activities", []) or ["Local sightseeing", "City walk", "Local market visit"]
    # Repeat pool if fewer activities than days*3 needed
    needed = days * 3
    pool = (activities * ((needed // max(1, len(activities))) + 1))[:needed]

    budget_per_day = budget / days if days else budget

    plan = []
    total_cost = 0
    idx = 0
    for d in range(1, days + 1):
        day_pool = pool[idx: idx + 3] if idx + 3 <= len(pool) else pool[-3:]
        idx += 3
        day_plan = _rule_based_day(destination, d, day_pool, travelers, budget_per_day)
        total_cost += day_plan["estimated_cost"]
        plan.append(day_plan)

    return {
        "destination": destination.get("destination"),
        "days": days,
        "budget": budget,
        "travelers": travelers,
        "itinerary": plan,
        "estimated_cost": total_cost,
        "remaining_budget": round(budget - total_cost),
        "generator": "rule_based",
    }


def generate_with_llm(destination: Dict[str, Any], days: int, budget: float, travelers: int, interests: List[str]) -> Dict[str, Any]:
    """Calls OpenAI or Ollama to produce a structured itinerary. Falls back
    to the rule-based generator if the call fails or no provider is configured."""
    prompt = f"""Create a personalized {days}-day travel itinerary as STRICT JSON only (no markdown, no commentary).

Destination: {destination.get('destination')}
Budget: {budget}
Travelers: {travelers}
Interests: {', '.join(interests) if interests else 'general sightseeing'}
Available activities to draw from: {', '.join(destination.get('activities', []))}

Return JSON with this exact shape:
{{
  "itinerary": [
    {{"day": 1, "morning": "...", "afternoon": "...", "evening": "...", "estimated_cost": 0}}
  ],
  "estimated_cost": 0
}}
Keep the total estimated_cost within the budget."""

    try:
        if OPENAI_API_KEY:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                },
                timeout=30,
            )
            text = resp.json()["choices"][0]["message"]["content"]
        else:
            resp = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
                timeout=60,
            )
            text = resp.json().get("response", "")

        text = text.strip().strip("`").replace("json\n", "", 1)
        data = json.loads(text)
        data["destination"] = destination.get("destination")
        data["days"] = days
        data["budget"] = budget
        data["travelers"] = travelers
        data["generator"] = "llm"
        data.setdefault("remaining_budget", round(budget - data.get("estimated_cost", 0)))
        return data
    except Exception:
        # graceful fallback so the app never breaks if the LLM is unavailable
        fallback = generate_rule_based(destination, days, budget, travelers, interests)
        fallback["generator"] = "rule_based_fallback"
        return fallback


def generate_itinerary(destination: Dict[str, Any], days: int, budget: float, travelers: int, interests: List[str]) -> Dict[str, Any]:
    if USE_LLM:
        return generate_with_llm(destination, days, budget, travelers, interests)
    return generate_rule_based(destination, days, budget, travelers, interests)


def replan_day(destination: Dict[str, Any], day_number: int, avoid_activity: str, travelers: int, budget_per_day: float) -> Dict[str, Any]:
    """Regenerate ONLY one day's plan, excluding a disliked activity."""
    activities = [a for a in destination.get("activities", []) if a != avoid_activity]
    if not activities:
        activities = destination.get("activities", []) or ["Local sightseeing"]
    return _rule_based_day(destination, day_number, activities[:3] or activities, travelers, budget_per_day)
