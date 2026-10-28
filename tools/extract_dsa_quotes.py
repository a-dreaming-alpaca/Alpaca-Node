"""Extract English quotations from the first page of DSA section PDFs.

Requires pypdf. Source PDFs are read only; all results go to --output.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    raise SystemExit("Missing pypdf. Install it with: python -m pip install pypdf")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_SOURCE_FILE = PROJECT_ROOT / ".dsa-quotes-source"
DEFAULT_OUTPUT = PROJECT_ROOT / "output" / "dsa-quotes"
CJK = re.compile(r"[\u3400-\u9fff]")
WORDS = re.compile(r"[A-Za-z]+(?:['’][A-Za-z]+)?")
ATTRIBUTION = re.compile(r"\s+[-–—]\s+([^\n]+)$")
SLIDE_ID = re.compile(r"^\d{1,2}\s*[-–]\s*[A-Za-z]\d?(?:\s*[-–]\s*\d+)?$")


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text)).strip()


def english_line(line: str) -> bool:
    return bool(WORDS.search(line)) and not CJK.search(line) and "@" not in line and not SLIDE_ID.fullmatch(line) and not re.search(r"https?://|www\.", line, re.I)


def extract_candidates(text: str) -> tuple[list[dict], list[dict]]:
    accepted, review = [], []
    run: list[str] = []

    def flush() -> None:
        if not run:
            return
        joined = clean(" ".join(run))
        run.clear()
        match = ATTRIBUTION.search(joined)
        author = match.group(1).strip() if match else ""
        quote = joined[:match.start()].strip() if match else joined
        # Preserve unattributed text separately instead of guessing that it is a quotation.
        candidate = {"quote": quote, "author": author, "attribution": "printed_on_slide" if author else "not_printed"}
        if match and len(WORDS.findall(quote)) >= 3 and len(WORDS.findall(author)) <= 15:
            accepted.append(candidate)
        elif not match and len(WORDS.findall(quote)) >= 3:
            words = WORDS.findall(quote)
            list_like = quote.count(",") > len(words) / 4
            if not list_like and (len(words) >= 6 or re.search(r"[.!?][\"'”’]?$", quote)):
                accepted.append(candidate)
            else:
                review.append({**candidate, "reason": "Possible heading or word list; check the first page"})
        elif len(WORDS.findall(joined)) >= 3:
            review.append({**candidate, "reason": "No clear attribution, or unusual text structure"})

    for raw in text.splitlines():
        line = clean(raw)
        if not line:
            continue
        if english_line(line):
            run.append(line)
            # One page may contain multiple quotations. Finish at each author credit.
            if ATTRIBUTION.search(" ".join(run)):
                flush()
        else:
            flush()
    flush()
    return accepted, review


def quote_key(quote: str) -> str:
    return re.sub(r"[^a-z0-9]", "", quote.casefold())


def run(source: Path, output: Path) -> dict:
    if not source.is_dir():
        raise SystemExit(f"Source folder does not exist: {source}")
    files = sorted((p for p in source.rglob("*") if p.is_file() and p.suffix.lower() == ".pdf"), key=lambda p: str(p).casefold())
    if not files:
        raise SystemExit("No PDFs found in the source folder.")
    output.mkdir(parents=True, exist_ok=True)
    unique: dict[str, dict] = {}
    review, errors, pages = [], [], []
    occurrences = 0
    for path in files:
        relative = str(path.relative_to(source))
        try:
            reader = PdfReader(str(path))
            text = reader.pages[0].extract_text() if reader.pages else ""
            text = text or ""
            pages.append(f"=== {relative} | page 1 ===\n{text}\n")
            if not text.strip():
                review.append({"source": relative, "page": 1, "reason": "No text layer; OCR may be required"})
                continue
            found, uncertain = extract_candidates(text)
            for item in uncertain:
                review.append({**item, "source": relative, "page": 1})
            for item in found:
                occurrences += 1
                key = quote_key(item["quote"])
                provenance = {"file": relative, "page": 1, "author_as_printed": item["author"]}
                if key not in unique:
                    unique[key] = {**item, "sources": []}
                elif not unique[key]["author"] and item["author"]:
                    unique[key]["author"] = item["author"]
                    unique[key]["attribution"] = item["attribution"]
                unique[key]["sources"].append(provenance)
        except Exception as exc:
            errors.append({"source": relative, "error": f"{type(exc).__name__}: {exc}"})
    quotes = list(unique.values())
    summary = {"source": str(source.resolve()), "pdfs": len(files), "read_successfully": len(files)-len(errors), "quote_occurrences": occurrences, "unique_quotes": len(quotes), "with_printed_author": sum(bool(q["author"]) for q in quotes), "without_printed_author": sum(not q["author"] for q in quotes), "review_items": len(review), "errors": len(errors), "extraction": "First page only; attribution copied from slides, not independently verified"}
    for name, data in [("quotes.json", quotes), ("review.json", review), ("errors.json", errors), ("summary.json", summary)]:
        (output / name).write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    with (output / "quotes.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=["quote", "author", "attribution", "sources"])
        writer.writeheader()
        for item in quotes:
            writer.writerow({"quote": item["quote"], "author": item["author"], "attribution": item["attribution"], "sources": " | ".join(s["file"]+" (page 1)" for s in item["sources"])})
    markdown = ["# DSA English quotations", "", f"{len(files)} PDFs; {len(quotes)} unique quotations. Authors are copied as printed on the slides.", "", "Items needing review are in review.json. Original PDFs were not changed.", ""]
    for i, item in enumerate(quotes, 1):
        markdown += [f"## {i}", "", "> "+item["quote"], "", "— "+(item["author"] or "[No author printed on slide]"), "", "Sources: "+"; ".join(s["file"]+" (page 1)" for s in item["sources"]), ""]
    (output / "quotes.md").write_text("\n".join(markdown), encoding="utf-8")
    (output / "first-pages.txt").write_text("\n".join(pages), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Output: {output.resolve()}")
    return summary


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, help="PDF directory; defaults to DSA_PDF_SOURCE or the local .dsa-quotes-source file")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    if args.source is None:
        configured_source = os.environ.get("DSA_PDF_SOURCE", "").strip()
        if not configured_source and LOCAL_SOURCE_FILE.is_file():
            try:
                configured_source = LOCAL_SOURCE_FILE.read_text(encoding="utf-8-sig").strip()
            except (OSError, UnicodeError) as exc:
                parser.error(f"Cannot read {LOCAL_SOURCE_FILE.name}: {exc}. Specify --source instead.")
        if not configured_source:
            parser.error("Specify --source with your PDF directory, set DSA_PDF_SOURCE, or create .dsa-quotes-source in the project root.")
        args.source = Path(configured_source).expanduser()
    run(args.source, args.output)
