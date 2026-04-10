#!/usr/bin/env python3

import json
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src-tauri" / "src" / "usage" / "model_pricing_snapshot.json"
API_URL = "https://models.dev/api.json"

SOURCE_TO_APP_PROVIDER = {
    "openai": "codex",
    "google": "gemini",
    "anthropic": "claude",
}


def fetch_catalog():
    request = urllib.request.Request(
        API_URL,
        headers={"User-Agent": "shep-pricing-updater/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def cache_overrides(app_provider, model_id):
    if app_provider == "claude":
        if model_id.startswith("claude-opus-4-5") or model_id.startswith("claude-opus-4-6"):
            return 0.5, 6.25
        if model_id.startswith("claude-sonnet-4-5") or model_id.startswith("claude-sonnet-4-6"):
            return 0.3, 3.75
        if model_id.startswith("claude-haiku-4-5"):
            return 0.1, 1.25
        return 0.0, 0.0

    if app_provider == "gemini":
        if model_id.startswith("gemini-3-flash"):
            return 0.05, 1.0
        if model_id.startswith("gemini-3.1-pro"):
            return 0.2, 0.0
        if model_id.startswith("gemini-2.5-pro"):
            return 0.315, 0.0
        if model_id.startswith("gemini-2.5-flash"):
            return 0.0375, 0.0
        return 0.0, 0.0

    if app_provider == "codex":
        if model_id == "gpt-5":
            return 0.125, 0.0
        if model_id == "gpt-5-mini":
            return 0.15, 0.0
        if model_id == "gpt-5.4":
            return 1.25, 0.0
        if model_id == "gpt-5.4-mini":
            return 0.2, 0.0
        if model_id == "gpt-5.4-nano":
            return 0.075, 0.0
        if model_id == "gpt-5.4-pro":
            return 5.0, 0.0
        return 0.0, 0.0

    return 0.0, 0.0


def snapshot_rows(catalog):
    rows = []

    for source_provider, app_provider in SOURCE_TO_APP_PROVIDER.items():
        provider_entry = catalog.get(source_provider, {})
        models = provider_entry.get("models", {})

        for model_id in sorted(models):
            model = models[model_id]
            cost = model.get("cost") or {}
            input_per_m = cost.get("input")
            output_per_m = cost.get("output")

            if input_per_m is None or output_per_m is None:
                continue

            cache_read_per_m, cache_write_per_m = cache_overrides(app_provider, model_id)

            rows.append(
                {
                    "provider": app_provider,
                    "modelPattern": model_id,
                    "inputPerM": input_per_m,
                    "outputPerM": output_per_m,
                    "cacheReadPerM": cache_read_per_m,
                    "cacheWritePerM": cache_write_per_m,
                    "thoughtsPerM": 0.0,
                }
            )

    return rows


def main():
    catalog = fetch_catalog()
    rows = snapshot_rows(catalog)
    OUTPUT.write_text(json.dumps(rows, indent=2) + "\n")
    print(f"Wrote {len(rows)} pricing rows to {OUTPUT}")


if __name__ == "__main__":
    main()
