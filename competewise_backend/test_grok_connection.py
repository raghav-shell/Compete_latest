#!/usr/bin/env python3
"""
Test script to verify xAI Grok API connection and configuration.
Run from project root: python3 test_grok_connection.py
"""

import sys
import os

# Add project to path
sys.path.insert(0, os.path.dirname(__file__))

from competeiq.config import get_settings
import httpx


def test_grok_connection():
    """Test xAI Grok API connection with current config."""

    print("=" * 60)
    print("CompeteIQ — xAI Grok API Connection Test")
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
    print("\n[2] Checking GROK_API_KEY...")
    if not settings.grok_api_key:
        print("❌ GROK_API_KEY is empty or not set in .env")
        return False

    if settings.grok_api_key.startswith("grok-"):
        print("✅ GROK_API_KEY is set (key starts with 'grok-')")
        print(f"   Key preview: {settings.grok_api_key[:20]}...")
    elif settings.grok_api_key.startswith("xai-"):
        print("✅ GROK_API_KEY is set (key starts with 'xai-')")
        print(f"   Key preview: {settings.grok_api_key[:20]}...")
    else:
        print("⚠️ Warning: GROK_API_KEY does not start with 'grok-' or 'xai-'")
        print(f"   Key value: {settings.grok_api_key[:50]}")

    # 3. Test API call to xAI (OpenAI-compatible endpoint used by CompeteIQ)
    print("\n[3] Testing API call to xAI (https://api.x.ai/v1/chat/completions)...")
    try:
        response = httpx.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.grok_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "grok-3",
                "messages": [
                    {
                        "role": "user",
                        "content": "Say 'test successful' in one word.",
                    }
                ],
                "max_tokens": 10,
            },
            timeout=30,
        )

        print(f"   HTTP Status: {response.status_code}")

        if response.status_code == 200:
            print("✅ API call successful!")
            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"   Model reply: {content}")
            return True

        if response.status_code == 401:
            print("❌ Authentication failed (401)")
            print("   Reason: API key is invalid or incorrect")
            print(f"   Response: {response.text}")
            return False

        if response.status_code == 403:
            print("⚠️ Access forbidden (403)")
            print("   Reason: API key is valid but account has no credits/license")
            print("   Fix: Add credits at console.x.ai")
            print(f"   Response: {response.text}")
            return False

        if response.status_code == 429:
            print("⚠️ Rate limited (429)")
            print("   Reason: Too many requests")
            print(f"   Response: {response.text}")
            return False

        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

    except httpx.ConnectError as e:
        print(f"❌ Connection error: {e}")
        print("   Check your internet connection")
        return False

    except Exception as e:
        print(f"❌ API call failed: {e}")
        return False


def main():
    """Run all tests."""
    print("\n")
    success = test_grok_connection()
    print("\n" + "=" * 60)

    if success:
        print("✅ ALL CHECKS PASSED — Pipeline should work!")
    else:
        print("❌ CHECKS FAILED — Fix issues above before retrying pipeline")

    print("=" * 60 + "\n")

    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
