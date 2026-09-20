"""
AI Layer 1 — Destination Recommendation Engine.

Combines:
  1. TF-IDF + cosine similarity over destination "profile text"
     (categories + activities + food + travel_style) vs. the user's
     preference text -> semantic interest match.
  2. Rule-based weighted score (budget fit, duration fit, season fit,
     travel-style fit).
  3. A feedback boost -- destinations that share categories the user
     has rated highly in the past (Travel_Feedback collection) get a
     small extra boost. This is the "preference learning" component.

Final score is a 0-100 match percentage.
"""
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _profile_text(categories, activities, food, travel_style) -> str:
    parts = categories + activities + food + [travel_style or ""]
    return " ".join(p.lower() for p in parts if p)


def _user_text(interests, activities, food, travel_type) -> str:
    parts = interests + activities + [food or "", travel_type or ""]
    return " ".join(p.lower() for p in parts if p)


def _semantic_scores(user_text: str, destinations: List[Dict[str, Any]]) -> List[float]:
    """Returns cosine similarity (0-1) between user_text and each destination profile."""
    if not destinations:
        return []
    corpus = [user_text] + [
        _profile_text(
            d.get("categories", []),
            d.get("activities", []),
            d.get("food", []),
            d.get("travel_style", ""),
        )
        for d in destinations
    ]
    try:
        vectorizer = TfidfVectorizer(stop_words="english")
        matrix = vectorizer.fit_transform(corpus)
        sims = cosine_similarity(matrix[0:1], matrix[1:]).flatten()
        return sims.tolist()
    except ValueError:
        # Empty vocabulary (e.g. user gave no interests at all)
        return [0.0] * len(destinations)


def _feedback_boost(user_feedback: List[Dict[str, Any]], destination: Dict[str, Any]) -> float:
    """Small boost (0-10) based on categories the user has previously liked highly."""
    if not user_feedback:
        return 0.0

    liked_categories: Dict[str, float] = {}
    for fb in user_feedback:
        weight = (fb.get("rating", 3) - 3) / 2.0  # -1 .. +1
        for cat in fb.get("liked", []):
            liked_categories[cat] = liked_categories.get(cat, 0) + weight
        for cat in fb.get("disliked", []):
            liked_categories[cat] = liked_categories.get(cat, 0) - abs(weight) - 0.2

    if not liked_categories:
        return 0.0

    boost = 0.0
    for cat in destination.get("categories", []):
        boost += liked_categories.get(cat, 0)

    # clamp to +/-10
    return max(-10.0, min(10.0, boost * 3))


def calculate_score(
    preferences: Dict[str, Any],
    destination: Dict[str, Any],
    semantic_similarity: float = 0.0,
    feedback_boost: float = 0.0,
) -> Dict[str, Any]:
    """
    Weighted rule-based scoring, blended with the semantic similarity
    and the feedback boost. Returns a dict with the total score and a
    breakdown (useful for showing "why this destination" in the UI).
    """
    breakdown = {}

    # 1) Semantic interest match (0-40)
    interest_score = round(semantic_similarity * 40, 1)
    breakdown["interest_match"] = interest_score

    # 2) Budget match (0-20)
    budget = preferences.get("budget", 0)
    days = preferences.get("days", 1)
    daily_cost = destination.get("average_daily_cost", 3000)
    est_total = daily_cost * days
    if budget <= 0:
        budget_score = 10
    elif est_total <= budget:
        # reward efficient use of budget without being wildly under it
        ratio = est_total / budget if budget else 1
        budget_score = round(min(20, 10 + ratio * 10), 1)
    else:
        overshoot = (est_total - budget) / budget
        budget_score = round(max(0, 20 - overshoot * 40), 1)
    breakdown["budget_match"] = budget_score

    # 3) Duration match (0-15)
    min_days = destination.get("minimum_days", 2)
    if days >= min_days:
        duration_score = 15 if days <= min_days + 3 else 10
    else:
        duration_score = max(0, 15 - (min_days - days) * 5)
    breakdown["duration_match"] = duration_score

    # 4) Travel style match (0-15)
    style_score = 15 if preferences.get("travel_type", "").lower() == str(
        destination.get("travel_style", "")
    ).lower() else 7
    breakdown["style_match"] = style_score

    # 5) Season match (0-10)
    month = preferences.get("travel_month")
    best_months = destination.get("best_months", [])
    if not month or not best_months:
        season_score = 6
    elif month in best_months:
        season_score = 10
    else:
        season_score = 3
    breakdown["season_match"] = season_score

    total = interest_score + budget_score + duration_score + style_score + season_score
    total = max(0, min(100, total + feedback_boost))
    breakdown["feedback_boost"] = round(feedback_boost, 1)

    return {
        "score": round(total),
        "breakdown": breakdown,
        "estimated_total_cost": round(est_total),
    }


def rank_destinations(
    preferences: Dict[str, Any],
    destinations: List[Dict[str, Any]],
    user_feedback: List[Dict[str, Any]] = None,
    top_n: int = 5,
) -> List[Dict[str, Any]]:
    user_feedback = user_feedback or []

    user_text = _user_text(
        preferences.get("interests", []),
        preferences.get("activities", []),
        preferences.get("food", ""),
        preferences.get("travel_type", ""),
    )
    sims = _semantic_scores(user_text, destinations)

    results = []
    for dest, sim in zip(destinations, sims):
        boost = _feedback_boost(user_feedback, dest)
        scored = calculate_score(preferences, dest, semantic_similarity=sim, feedback_boost=boost)
        results.append(
            {
                "destination": dest.get("destination"),
                "state": dest.get("state"),
                "categories": dest.get("categories", []),
                "match_score": scored["score"],
                "score_breakdown": scored["breakdown"],
                "estimated_total_cost": scored["estimated_total_cost"],
                "average_daily_cost": dest.get("average_daily_cost"),
                "rating": dest.get("rating"),
                "activities": dest.get("activities", []),
            }
        )

    results.sort(key=lambda r: r["match_score"], reverse=True)
    return results[:top_n]
