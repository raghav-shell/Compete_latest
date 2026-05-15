#!/usr/bin/env python3
"""
Test script to verify Google Gemini API connection.
Run from project root: python3 test_gemini_connection.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from competeiq.config import get_settings
import google.generativeai as genai


def test_gemini_connection():
    """Test Google Gemini API connection."""

    print("=" * 60)
    print("CompeteIQ — Google Gemini API Connection Test")
    print("=" * 60)

    # 1. Load config
    print("\n[1] Loading configuration...")
    try:
        settings = get_settings()
        print("✅ Config loaded successfully")
    except Exception as e:
        print(f"❌ Config load failed: {e}")
        return False

    # 2. Check API key
    print("\n[2] Checking GEMINI_API_KEY...")
    if not settings.gemini_api_key:
        print("❌ GEMINI_API_KEY is empty or not set in .env")
        return False

    print("✅ GEMINI_API_KEY is set")
    print(f"   Key preview: {settings.gemini_api_key[:30]}...")

    # 3. Test API call to Gemini
    print("\n[3] Testing API call to Google Gemini...")
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-flash-latest")

        response = model.generate_content("Say 'Gemini is working' in exactly 3 words.")

        if response.text:
            print("✅ API call successful!")
            print(f"   Response: {response.text}")
            return True

        print("❌ API returned empty response")
        return False

    except Exception as e:
        print(f"❌ API call failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False


def main():
    """Run all tests."""
    print("\n")
    success = test_gemini_connection()
    print("\n" + "=" * 60)

    if success:
        print("✅ ALL CHECKS PASSED — Pipeline should work!")
    else:
        print("❌ CHECKS FAILED — Fix issues above before retrying pipeline")

    print("=" * 60 + "\n")

    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
