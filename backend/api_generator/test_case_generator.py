import google.generativeai as genai  # type: ignore
from config.settings import GEMINI_API_KEY
from api_generator.logger import setup_logger
from api_generator.prompt import (
    build_test_case_prompt,
    build_java_test_script_prompt,
    build_karate_feature_prompt,
)

logger = setup_logger()

class TestCaseGenerator:
    def __init__(self):
        try:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel("models/gemini-1.5-pro")
            logger.info("Initialized Gemini model successfully.")
        except Exception as e:
            logger.error(f"Error initializing Gemini model: {e}")
            raise

    def generate_test_cases(self, api_path: str, method: str, body: str):
        try:
            prompt = build_test_case_prompt(api_path, method, body)
            logger.info("Sending test case prompt to Gemini: %s %s", method, api_path)
            response = self.model.generate_content(prompt)
            return response.text.strip().split("\n")
        except Exception as e:
            logger.error(f"Error generating test cases: {e}")
            raise

    def generate_java_test_script(self, api_path: str, method: str, body: str) -> str:
        prompt = build_java_test_script_prompt(api_path, method, body)
        logger.info("Generating Java test method for API: [%s] %s", method.upper(), api_path)

        try:
            response = self.model.generate_content(prompt)
            method_code = response.text.strip()

            if not method_code:
                logger.warning("Empty test method generated for: [%s] %s", method.upper(), api_path)
                raise ValueError("Generated test method is empty.")

            return method_code

        except Exception as e:
            logger.exception("Error while generating Java test method for: [%s] %s", method.upper(), api_path)
            raise RuntimeError(f"Failed to generate Java test method: {str(e)}") from e


    def generate_karate_feature(self, api_path: str, method: str, body: str) -> str:
        prompt = build_karate_feature_prompt(api_path, method, body)
        logger.info("Generating Karate DSL tests scenario for API: [%s] %s", method.upper(), api_path)

        try:
            response = self.model.generate_content(prompt)
            method_code = response.text.strip()

            if not method_code:
                logger.warning("Empty scenario method generated for: [%s] %s", method.upper(), api_path)
                raise ValueError("Generated test method is empty.")

            return method_code

        except Exception as e:
            logger.exception("Error while generating Karate test scenario for: [%s] %s", method.upper(), api_path)
            raise RuntimeError(f"Failed to generate Karate test scenario: {str(e)}") from e
