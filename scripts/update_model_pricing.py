#!/usr/bin/env python3

import json
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src-tauri" / "src" / "usage" / "model_pricing_snapshot.json"
API_URL = "https://models.dev/api.json"


def fetch_catalog():
    request = urllib.request.Request(
        API_URL,
        headers={"User-Agent": "shep-pricing-updater/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def snapshot_rows(catalog):
    rows = []

    for provider in sorted(catalog):
        provider_entry = catalog[provider]
        models = provider_entry.get("models", {})

        for model_id in sorted(models):
            model = models[model_id]
            cost = model.get("cost") or {}
            input_per_m = cost.get("input")
            output_per_m = cost.get("output")

            if input_per_m is None or output_per_m is None:
                continue

            rows.append(
                {
                    "provider": provider,
                    "modelPattern": model_id,
                    "inputPerM": input_per_m,
                    "outputPerM": output_per_m,
                    "cacheReadPerM": cost.get("cache_read", 0.0),
                    "cacheWritePerM": cost.get("cache_write", 0.0),
                    "thoughtsPerM": cost.get("reasoning", 0.0),
                    "releaseDate": model.get("release_date"),
                }
            )

    return rows


def main():
    catalog = fetch_catalog()
    rows = snapshot_rows(catalog)
    OUTPUT.write_text(json.dumps(rows, indent=2) + "\n")
    providers = set(r["provider"] for r in rows)
    print(f"Wrote {len(rows)} pricing rows ({len(providers)} providers) to {OUTPUT}")


if __name__ == "__main__":
    main()
