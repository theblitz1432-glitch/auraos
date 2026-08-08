import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from groq_service import generate_plan_ai, generate_summary_ai, get_groq_config

def test_groq():
    api_key, model = get_groq_config()
    print(f"Loaded Groq Config: model={model}, key_configured={'YES' if api_key else 'NO'}")
    
    plan, is_fallback, note = generate_plan_ai("I am a data science student who loves cricket")
    print("\n--- Plan Output ---")
    print(f"Is Fallback: {is_fallback}")
    print(f"Fallback Note: {note}")
    print(f"Title: {plan.get('title')}")
    print(f"Items Count: {len(plan.get('items', []))}")

    summary, is_fallback_sum, note_sum = generate_summary_ai("Data Science Research", "https://scholar.google.com", "Machine learning papers and data science workflows.")
    print("\n--- Summary Output ---")
    print(f"Is Fallback: {is_fallback_sum}")
    print(f"Fallback Note: {note_sum}")
    print(f"Bullet Points Count: {len(summary.get('bulletPoints', []))}")

if __name__ == "__main__":
    test_groq()
