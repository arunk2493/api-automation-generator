from fastapi import FastAPI  # type: ignore
from pydantic import BaseModel, Field  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from typing import List, Dict
from api_generator.test_case_generator import TestCaseGenerator
from collections import defaultdict
import uvicorn  # type: ignore
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace "*" with specific allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TestInput(BaseModel):
    path: str
    method: str
    body: str
    sample_response: str

class TestCasesInput(BaseModel):
    test_cases: List[Dict] = Field(..., alias="testCases")

    class Config:
        allow_population_by_field_name = True
        extra = "allow"

generator = TestCaseGenerator()

@app.post("/generate-test-cases")
async def generate_test_cases(data: TestInput):
    try:
        test_cases = generator.generate_test_cases(data.path, data.method, data.body, data.sample_response)
        return {"test_cases": test_cases}
    except Exception as e:
        return {"error": str(e)}


@app.post("/generate-code/java")
async def generate_java_code(data: TestCasesInput):
    try:
        test_methods = []

        for test_case in data.test_cases:
            method = test_case["request"]["method"]
            path = test_case["request"]["path"]
            body = test_case["request"].get("body", "")
            method_code = generator.generate_java_test_script(path, method, body)
            test_methods.append(method_code)

        # Static class header
        class_header = """
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;
import static org.hamcrest.Matchers.*;
import static io.restassured.RestAssured.given;

public class UsersApiTest {

    @BeforeMethod
    public void setUp() {
        RestAssured.baseURI = ""; // Replace with your base URI if different
    }

    @AfterMethod
    public void tearDown() {
        // Any teardown operations if needed
    }
"""

        class_footer = "\n}"

        full_class = class_header + "\n\n" + "\n\n".join(test_methods) + class_footer

        return {"generatedCode": full_class.strip()}

    except Exception as e:
        logger.error(f"Failed to generate Java code: {e}")
        return {"error": str(e)}


@app.post("/generate-code/karate")
async def generate_karate_code(data: TestCasesInput):
    try:
        # Group test cases by (path, method)
        grouped_cases = defaultdict(list)  # {(path, method): [body1, body2, ...]}

        for test_case in data.test_cases:
            method = test_case["request"]["method"]
            path = test_case["request"]["path"]
            body = test_case["request"].get("body", {})
            grouped_cases[(path, method)].append(body)

        feature_blocks = []

        # Generate one feature per (path, method) with multiple unique bodies
        for (path, method), bodies in grouped_cases.items():
            # Deduplicate dicts using JSON serialization (sorted keys ensure consistent comparison)
            unique_bodies_json = list({json.dumps(b, sort_keys=True) for b in bodies})
            unique_bodies = [json.loads(b) for b in unique_bodies_json]

            # Generate Karate feature for the grouped test cases
            feature_code = generator.generate_karate_feature(path, method, unique_bodies)
            feature_blocks.append(feature_code.strip())

        # Join all features (usually one per unique path/method)
        combined_feature_code = "\n\n# ---- Feature Separator ----\n\n".join(feature_blocks)

        return {
            "generatedCode": combined_feature_code
        }

    except Exception as e:
        logger.error(f"Failed to generate Karate DSL code: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)