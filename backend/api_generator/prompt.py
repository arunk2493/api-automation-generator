def build_test_case_prompt(path: str, method: str, request_body: str, sample_response: str) -> str:
    return f"""
You are an expert API test automation engineer.

Your task is to generate a comprehensive suite of REST API test cases in **valid JSON format** for the following API endpoint:

- **Path**: {path}
- **Method**: {method}
- **Request Body (example or schema)**: {request_body}
- **Sample Response Body**: {sample_response}

### Requirements:
Generate a thorough set of test cases that cover:

#### ✅ Positive Test Cases:
- All valid and realistic inputs using the provided request body schema.
- Use real values inferred from the sample response where applicable.
- Ensure coverage of optional fields if present.

#### ❌ Negative Test Cases:
- Missing required fields.
- Invalid field types (e.g., string instead of number).
- Unexpected fields in the body.
- Invalid paths, unsupported methods, and malformed inputs.

#### 🧪 Edge Cases:
- Extremely long string values.
- Special characters and emojis.
- Empty strings or nulls where allowed.
- Boundary numeric values (e.g., 0, max int).
- Case sensitivity issues if applicable.

#### ✅ Response Validation:
- Use the provided sample response to derive expected fields, values, and structure.
- Include `expected_status` (e.g., 200, 400, 404, 500).
- Include `expected_response_contains` (use key snippets or field values from the sample response).

### Output Format:
Return your output as a single valid JSON array of test cases. Each object must follow this exact schema:

[
  {{
    "test_name": "Short descriptive name",
    "description": "What this test checks",
    "request": {{
      "method": "{method}",
      "path": "{path}",
      "body": {{ /* JSON body specific to this test case */ }}
    }},
    "expected_status": 200,
    "expected_response_contains": ["field1", "value snippet", "error message", ...]
  }},
  ...
]

Ensure the output is:
- **Valid JSON (no markdown fences or comments)**
- Free of explanations or extra text outside the JSON array
"""


def build_java_test_script_prompt(api_path: str, method: str, body: str) -> str:
    prompt = f"""
Generate only a single valid Java method using TestNG and REST Assured for the API described below.

API Details:
- HTTP Method: {method.upper()}
- Endpoint: {api_path}
- Request Body (JSON): {body}

Requirements:
- Use the @Test annotation (TestNG).
- Include a meaningful method name in camelCase.
- Add a short, clear description inside the @Test(description = "...").
- Include REST Assured request/response code using given().when().then() syntax.
- Donot include duplicate test cases or test data
- Donot include any other key points other than generated test cases in JSON
- Donot show Key improvements from the response
- Assert:
  - The correct HTTP status code.
  - Key response fields using body() assertions.
- Use .queryParam() or .body() as appropriate for request parameters.
- Assume base URI is already set, so don't include it.
- Do NOT include:
  - Import statements
  - Class declaration
  - @BeforeMethod or @AfterMethod setup/teardown methods

Output:
Only the Java method. No surrounding text, comments, or explanations.
"""
    return prompt.strip()


def build_karate_feature_prompt(api_path: str, method: str, bodies: list[str]) -> str:
    """
    api_path: API path (e.g. '/api/users')
    method: HTTP method (e.g. 'POST')
    bodies: list of JSON strings representing different request bodies (valid and invalid)

    Returns Karate DSL feature content string with Scenario Outline using Examples for bodies.
    """
    examples_rows = []
    for body in bodies:
        status = "200" if body and body.strip() != "{}" else "400"
        escaped_body = body.replace("|", "\\|").replace("`", "\\`")
        examples_rows.append(f"      | `{escaped_body}` | {status} |")

    return f"""
Feature: Test {method.upper()} {api_path}

  Background:
    * url ''

  Scenario Outline: Call API with example inputs
    * path '{api_path.lstrip("/")}' 
    * request <request>
    * method {method.lower()}
    * status <status>
    * match response != null
    * match response contains {{}}  # Update response validations as needed

  Examples:
      | request        | status |
{chr(10).join(examples_rows)}
    """.strip()
