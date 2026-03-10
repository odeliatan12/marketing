import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="AI Marketing Team API",
    description="Orchestrates AI agents for end-to-end product marketing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from agents.market_intelligence_agent import router as market_intelligence_router
from agents.branding_agent import router as branding_router
from agents.research_agent import router as research_router
from agents.strategy_agent import router as strategy_router
from agents.content_agent import router as content_router
from agents.social_media_agent import router as social_router
from agents.email_agent import router as email_router
from agents.analytics_agent import router as analytics_router
from agents.optimization_agent import router as optimization_router

app.include_router(market_intelligence_router, prefix="/api/agents", tags=["Market Intelligence"])
app.include_router(branding_router, prefix="/api/agents", tags=["Branding"])
app.include_router(research_router, prefix="/api/agents", tags=["Research"])
app.include_router(strategy_router, prefix="/api/agents", tags=["Strategy"])
app.include_router(content_router, prefix="/api/agents", tags=["Content"])
app.include_router(social_router, prefix="/api/agents", tags=["Social Media"])
app.include_router(email_router, prefix="/api/agents", tags=["Email"])
app.include_router(analytics_router, prefix="/api/agents", tags=["Analytics"])
app.include_router(optimization_router, prefix="/api/agents", tags=["Optimization"])


# Serve generated brand mockup images as static files
_mockups_dir = os.path.join(os.path.dirname(__file__), "brand", "mockups")
os.makedirs(_mockups_dir, exist_ok=True)
app.mount("/brand-assets", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "brand")), name="brand-assets")


@app.get("/")
def root():
    return {"status": "ok", "message": "AI Marketing Team API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
