def build_test_case_prompt(path: str, method: str, body: str) -> str:
    return f"""
You are an expert API test automation engineer.
Generate exhaustive REST API test cases in JSON for the following API:
- Path: {path}
- Method: {method}
- Request Body: {body}

Include:
- All Positive test cases (valid input)
- All Negative test cases (missing or invalid fields)
- All Edge cases (long strings, special characters)
- Expected status code and response content for all cases

Output in this JSON format:
[
  {{
    "test_name": "",
    "description": "",
    "request": {{
      "method": "",
      "path": "",
      "body": {{}}
    }},
    "expected_status": "",
    "expected_response_contains": ""
  }}
]
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
    * url 'https://reqres.in'

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
