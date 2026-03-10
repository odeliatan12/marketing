"""
Google Search tool using SerpAPI.
Used by the Market Intelligence Agent to find competitor sites,
trending keywords, and People Also Ask questions.
"""

import requests
from config.settings import SERPAPI_KEY


def google_search(query: str, num_results: int = 10) -> dict:
    """
    Run a Google search via SerpAPI and return organic results,
    ads, People Also Ask, and related searches.
    """
    params = {
        "engine": "google",
        "q": query,
        "api_key": SERPAPI_KEY,
        "num": num_results,
    }

    try:
        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        organic = [
            {
                "title": r.get("title", ""),
                "link": r.get("link", ""),
                "snippet": r.get("snippet", ""),
            }
            for r in data.get("organic_results", [])
        ]

        ads = [
            {
                "title": r.get("title", ""),
                "link": r.get("link", ""),
                "description": r.get("description", ""),
            }
            for r in data.get("ads", [])
        ]

        people_also_ask = [
            item.get("question", "")
            for item in data.get("related_questions", [])
        ]

        related_searches = [
            item.get("query", "")
            for item in data.get("related_searches", [])
        ]

        return {
            "query": query,
            "organic_results": organic,
            "ads": ads,
            "people_also_ask": people_also_ask,
            "related_searches": related_searches,
        }

    except Exception as e:
        print(f"[Web Search] Error: {e}")
        return {"query": query, "error": str(e)}
