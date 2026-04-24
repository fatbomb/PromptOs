import uvicorn

if __name__ == "__main__":
    # Runs the FastAPI application defined in main.py
    # reload=True enables hot-reloading for local development
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
