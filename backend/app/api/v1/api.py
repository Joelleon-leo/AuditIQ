from fastapi import APIRouter
from app.api.v1.endpoints import policies, scans

api_router = APIRouter()

# Health check endpoint
@api_router.get("/health", tags=["system"])
def health_check():
    return {
        "status": "ok",
        "service": "FLYYY.AI Compliance Engine",
        "version": "1.4.0",
        "status_code": 200,
    }

api_router.include_router(policies.router, tags=["policies"])
api_router.include_router(scans.router, tags=["scans"])
