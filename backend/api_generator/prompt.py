def build_test_case_prompt(path, method, body):
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