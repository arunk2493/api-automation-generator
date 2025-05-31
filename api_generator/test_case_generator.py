import google.generativeai as genai  # type: ignore
from config.settings import GEMINI_API_KEY
from api_generator.logger import setup_logger
from api_generator.prompt import build_test_case_prompt

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
            logger.info("Sending prompt to Gemini with method: %s and path: %s", method, api_path)
            response = self.model.generate_content(prompt)
            return response.text.strip().split("\n")
        except Exception as e:
            logger.error(f"Error generating test cases: {e}")
            raise
