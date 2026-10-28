"""Copy extracted quote text and slide attribution into the wallpaper's local pool."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
quotes = json.loads((root / "output/dsa-quotes/quotes.json").read_text(encoding="utf-8"))
pool = [{"quote": item["quote"], "author": item["author"], "source": item["sources"][0]["file"]} for item in quotes]
target = root / "wallpaper/reports.js"
text = target.read_text(encoding="utf-8")
start = text.index("  // DSA_QUOTE_POOL_START")
end = text.index("  // DSA_QUOTE_POOL_END", start)
replacement = "  // DSA_QUOTE_POOL_START: refreshed by tools/sync_dsa_quotes.py.\n  const DSA_QUOTES=" + json.dumps(pool, ensure_ascii=False, separators=(",", ":")) + ";\n"
target.write_text(text[:start] + replacement + text[end:], encoding="utf-8")
print(f"Synced {len(pool)} quotations into {target}")
