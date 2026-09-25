from db import db  # loads env first
import os
import logging
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.cors import CORSMiddleware

from routes_auth import router as auth_router
from routes_menu import router as menu_router
from routes_cart import router as cart_router
from routes_orders import router as orders_router
from routes_delivery import router as delivery_router
from routes_admin import router as admin_router
from routes_misc import router as misc_router
from seed import run_seed

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("cloudbite")

app = FastAPI(title="CloudBite Kitchen API")


@app.get("/api/")
async def root():
    return {"message": "CloudBite Kitchen API", "status": "ok"}


app.include_router(auth_router)
app.include_router(menu_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(delivery_router)
app.include_router(admin_router)
app.include_router(misc_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    errors = exc.errors()
    msg = "Invalid input."
    if errors:
        e = errors[0]
        field = e.get("loc", ["", ""])[-1]
        msg = f"{field}: {e.get('msg', 'invalid')}"
    return JSONResponse(status_code=422, content={"detail": msg})


@app.on_event("startup")
async def startup():
    try:
        await run_seed()
        logger.info("Seed complete")
    except Exception as e:
        logger.error(f"Seed error: {e}")


@app.on_event("shutdown")
async def shutdown():
    pass
