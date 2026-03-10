import os
from dotenv import load_dotenv

load_dotenv()

# LLM
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Web Search
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

# E-commerce Scraping
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

# Branding
BRANDFETCH_API_KEY = os.getenv("BRANDFETCH_API_KEY")

# Social Media
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_SECRET = os.getenv("TWITTER_ACCESS_SECRET")
INSTAGRAM_ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN")
LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN")
TIKTOK_ACCESS_TOKEN = os.getenv("TIKTOK_ACCESS_TOKEN")

# Email
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
MAILCHIMP_API_KEY = os.getenv("MAILCHIMP_API_KEY")

# Image Generation
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Analytics
GOOGLE_ANALYTICS_PROPERTY_ID = os.getenv("GOOGLE_ANALYTICS_PROPERTY_ID")
GA_SERVICE_ACCOUNT_JSON = os.getenv("GA_SERVICE_ACCOUNT_JSON")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///marketing.db")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND_DIR = os.path.join(BASE_DIR, "brand")
DATA_DIR = os.path.join(BASE_DIR, "data")
