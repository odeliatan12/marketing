"""
E-commerce scraping tools for Amazon, Shopee, and Lazada.
Uses RapidAPI hosted scrapers for JS-rendered platforms,
and BeautifulSoup for static pages where possible.
"""

import requests
import httpx
from bs4 import BeautifulSoup
from config.settings import RAPIDAPI_KEY

RAPIDAPI_HOST_AMAZON = "real-time-amazon-data.p.rapidapi.com"
RAPIDAPI_HOST_SHOPEE = "shopee28.p.rapidapi.com"
RAPIDAPI_HOST_LAZADA = "lazada-api.p.rapidapi.com"

HEADERS_RAPIDAPI = {
    "x-rapidapi-key": RAPIDAPI_KEY,
}

SCRAPE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


def scrape_amazon(query: str, max_results: int = 10) -> list[dict]:
    """
    Search Amazon for a product keyword and return top listings.
    Returns a list of dicts with title, price, rating, review_count, url.
    """
    url = f"https://{RAPIDAPI_HOST_AMAZON}/search"
    params = {"query": query, "page": "1", "country": "US", "sort_by": "RELEVANCE"}
    headers = {**HEADERS_RAPIDAPI, "x-rapidapi-host": RAPIDAPI_HOST_AMAZON}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        products = data.get("data", {}).get("products", [])
        results = []
        for p in products[:max_results]:
            results.append({
                "source": "amazon",
                "title": p.get("product_title", ""),
                "price": p.get("product_price", ""),
                "rating": p.get("product_star_rating", ""),
                "review_count": p.get("product_num_ratings", ""),
                "url": p.get("product_url", ""),
                "asin": p.get("asin", ""),
            })
        return results
    except Exception as e:
        print(f"[Amazon Scraper] Error: {e}")
        return []


def scrape_amazon_reviews(asin: str, max_reviews: int = 20) -> list[dict]:
    """
    Fetch customer reviews for a given Amazon product ASIN.
    Returns a list of dicts with rating, title, and body.
    """
    url = f"https://{RAPIDAPI_HOST_AMAZON}/product-reviews"
    params = {"asin": asin, "country": "US", "sort_by": "TOP_REVIEWS", "page": "1"}
    headers = {**HEADERS_RAPIDAPI, "x-rapidapi-host": RAPIDAPI_HOST_AMAZON}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        reviews = data.get("data", {}).get("reviews", [])
        results = []
        for r in reviews[:max_reviews]:
            results.append({
                "rating": r.get("review_star_rating", ""),
                "title": r.get("review_title", ""),
                "body": r.get("review_comment", ""),
            })
        return results
    except Exception as e:
        print(f"[Amazon Reviews] Error: {e}")
        return []


def scrape_shopee(query: str, max_results: int = 10) -> list[dict]:
    """
    Search Shopee for a product keyword and return top listings.
    """
    url = f"https://{RAPIDAPI_HOST_SHOPEE}/search"
    params = {"keyword": query, "limit": str(max_results)}
    headers = {**HEADERS_RAPIDAPI, "x-rapidapi-host": RAPIDAPI_HOST_SHOPEE}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", []) or data.get("data", [])
        results = []
        for item in items[:max_results]:
            results.append({
                "source": "shopee",
                "title": item.get("name", "") or item.get("title", ""),
                "price": item.get("price", "") or item.get("price_min", ""),
                "sold": item.get("sold", "") or item.get("historical_sold", ""),
                "rating": item.get("item_rating", {}).get("rating_star", ""),
                "shop_name": item.get("shop_name", ""),
            })
        return results
    except Exception as e:
        print(f"[Shopee Scraper] Error: {e}")
        return []


def scrape_lazada(query: str, max_results: int = 10) -> list[dict]:
    """
    Search Lazada for a product keyword and return top listings.
    """
    url = f"https://{RAPIDAPI_HOST_LAZADA}/search"
    params = {"q": query, "page": "1", "sort": "popularity"}
    headers = {**HEADERS_RAPIDAPI, "x-rapidapi-host": RAPIDAPI_HOST_LAZADA}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        items = data.get("result", {}).get("rgv587_flag", []) or data.get("data", [])
        results = []
        for item in items[:max_results]:
            results.append({
                "source": "lazada",
                "title": item.get("name", "") or item.get("title", ""),
                "price": item.get("price", ""),
                "rating": item.get("ratingScore", "") or item.get("rating", ""),
                "review_count": item.get("review", ""),
                "brand": item.get("brandName", ""),
            })
        return results
    except Exception as e:
        print(f"[Lazada Scraper] Error: {e}")
        return []


def scrape_competitor_site(url: str) -> dict:
    """
    Scrape a competitor's homepage for tagline, hero copy, and nav items.
    Uses requests + BeautifulSoup (works for static pages).
    """
    try:
        response = requests.get(url, headers=SCRAPE_HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml")

        title = soup.title.string.strip() if soup.title else ""
        meta_desc = ""
        meta_tag = soup.find("meta", attrs={"name": "description"})
        if meta_tag:
            meta_desc = meta_tag.get("content", "")

        # Grab h1 and h2 headings as brand messaging signals
        headings = [tag.get_text(strip=True) for tag in soup.find_all(["h1", "h2"])[:5]]

        return {
            "url": url,
            "page_title": title,
            "meta_description": meta_desc,
            "headings": headings,
        }
    except Exception as e:
        print(f"[Competitor Scraper] Error scraping {url}: {e}")
        return {"url": url, "error": str(e)}
