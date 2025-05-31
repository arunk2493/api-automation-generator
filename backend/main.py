from fastapi import FastAPI # type: ignore
from pydantic import BaseModel # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from api_generator.test_case_generator import TestCaseGenerator
import uvicorn # type: ignore

app = FastAPI()

# Enable CORS for frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for API input
class TestInput(BaseModel):
    method: str
    path: str
    body: str

# Create instance of test case generator
generator = TestCaseGenerator()

@app.post("/generate")
async def generate(data: TestInput):
    try:
        test_cases = generator.generate_test_cases(data.path, data.method, data.body)
        return {"test_cases": test_cases}
    except Exception as e:
        return {"error": str(e)}

# Optional: for local development
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
