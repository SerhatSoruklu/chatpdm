#!/usr/bin/env python3
"""Run a bounded Bouvier comparator-prep proof without building a corpus."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz


WORKSPACE_ROOT = Path("/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons")
OUTPUT_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "bouvier_comparator_prep"
RAW_PAGES_DIR = OUTPUT_ROOT / "raw_pages"
SEGMENTATION_DIR = OUTPUT_ROOT / "segmentation"
REPORTS_DIR = OUTPUT_ROOT / "reports"

PARSER_RECOMMENDATIONS_PATH = WORKSPACE_ROOT / "parser_recommendations.json"
SUMMARY_PATH = REPORTS_DIR / "bouvier_comparator_prep_report.md"
QUALITY_REPORT_PATH = REPORTS_DIR / "bouvier_comparator_quality_report.json"

BOUVIER_SOURCE_IDS = {"bouvier_1839_v1", "bouvier_1839_v2"}
SOURCE_FOLDER_BY_ID = {
    "bouvier_1839_v1": "bouviers_law_dictionary_1839_vol_1",
    "bouvier_1839_v2": "bouviers_law_dictionary_1839_vol_2",
}

WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
HEADWORD_LINE_PATTERN = re.compile(r"^(?P<headword>[A-Z][A-Z '&.,/-]{2,80})(?:\\.|:)?(?:\\s|$)")
CONTROL_CHARACTER_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


def windows_path(path: Path) -> str:
    value = str(path)
    if value.startswith("/mnt/c/"):
        return "C:\\" + value[len("/mnt/c/") :].replace("/", "\\")
    return value


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def count_words(value: str) -> int:
    return len(WORD_PATTERN.findall(value))


def count_control_characters(value: str) -> int:
    return len(CONTROL_CHARACTER_PATTERN.findall(value))


def classify_text_quality(text: str) -> tuple[str, str]:
    word_count = count_words(text)
    control_count = count_control_characters(text)
    control_ratio = control_count / len(text) if text else 0

    if word_count >= 150 and control_ratio < 0.02:
        return "good", "high"
    if word_count >= 50 and control_ratio < 0.15:
        return "mixed", "medium"
    return "poor", "low"


def load_bouvier_sources() -> list[dict[str, Any]]:
    payload = json.loads(PARSER_RECOMMENDATIONS_PATH.read_text(encoding="utf-8"))
    sources: list[dict[str, Any]] = []

    for recommendation in payload["sourceRecommendations"]:
        source_id = recommendation["sourceId"]
        if source_id not in BOUVIER_SOURCE_IDS:
            continue

        source_file_path = (
            WORKSPACE_ROOT
            / SOURCE_FOLDER_BY_ID[source_id]
            / recommendation["fileName"]
        )
        sources.append(
            {
                **recommendation,
                "sourceFilePath": source_file_path,
                "sourceFile": windows_path(source_file_path),
            }
        )

    return sorted(sources, key=lambda source: source["sourceId"])


def select_proof_pages(source_id: str, page_count: int) -> list[int]:
    if source_id == "bouvier_1839_v1":
        anchors = [20, 100, 220, 360, 500]
    else:
        anchors = [20, 120, 260, 420, 580]

    pages: set[int] = set()
    for anchor in anchors:
        for page in (anchor, anchor + 1):
            if 1 <= page <= page_count:
                pages.add(page)

    return sorted(pages)


def build_page_record(source: dict[str, Any], page_number: int, page: fitz.Page) -> dict[str, Any]:
    text = page.get_text("text") or ""
    ocr_quality, parse_confidence = classify_text_quality(text)
    control_count = count_control_characters(text)
    image_count = len(page.get_images(full=True))

    return {
        "id": f"{source['sourceId']}::page::{page_number}",
        "sourceId": source["sourceId"],
        "sourceTitle": source["sourceTitle"],
        "year": source["year"],
        "volume": source["volume"],
        "sourceFile": source["sourceFile"],
        "page": page_number,
        "rawText": text,
        "charCount": len(text),
        "wordCount": count_words(text),
        "controlCharCount": control_count,
        "controlCharRatio": round(control_count / len(text), 4) if text else 0,
        "imageCount": image_count,
        "ocrQuality": ocr_quality,
        "parseConfidence": parse_confidence,
        "textPreview": normalize_space(text[:280]),
    }


def extract_headword(line: str) -> str | None:
    cleaned = normalize_space(CONTROL_CHARACTER_PATTERN.sub("", line))
    match = HEADWORD_LINE_PATTERN.match(cleaned)
    if not match:
        return None

    headword = match.group("headword").strip(" .,:;-")
    if len(headword) < 3:
        return None

    letters = [character for character in headword if character.isalpha()]
    if not letters:
        return None
    uppercase_ratio = sum(1 for character in letters if character.isupper()) / len(letters)
    if uppercase_ratio < 0.8:
        return None

    return headword


def segment_page(page_record: dict[str, Any]) -> list[dict[str, Any]]:
    if page_record["wordCount"] == 0 or page_record["controlCharRatio"] > 0.5:
        return []

    lines = page_record["rawText"].splitlines()
    candidates: list[dict[str, Any]] = []
    for index, line in enumerate(lines):
        headword = extract_headword(line)
        if not headword:
            continue

        following_lines = [
            normalize_space(CONTROL_CHARACTER_PATTERN.sub("", next_line))
            for next_line in lines[index + 1 : index + 6]
            if normalize_space(CONTROL_CHARACTER_PATTERN.sub("", next_line))
        ]
        candidates.append(
            {
                "id": f"{page_record['id']}::headword::{len(candidates) + 1}",
                "sourceId": page_record["sourceId"],
                "sourceTitle": page_record["sourceTitle"],
                "year": page_record["year"],
                "volume": page_record["volume"],
                "sourceFile": page_record["sourceFile"],
                "page": page_record["page"],
                "lineNumber": index + 1,
                "headword": headword,
                "rawLine": line,
                "contextPreview": normalize_space(" ".join(following_lines))[:280],
                "parseConfidence": page_record["parseConfidence"],
            }
        )

    return candidates


def write_ndjson(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=True, sort_keys=True))
            output.write("\n")


def command_output(command: list[str]) -> dict[str, Any]:
    executable = shutil.which(command[0])
    if not executable:
        return {
            "command": command,
            "available": False,
            "stdout": "",
            "stderr": "",
        }

    result = subprocess.run(
        command,
        check=False,
        capture_output=True,
        encoding="utf-8",
    )
    return {
        "command": command,
        "available": True,
        "status": result.returncode,
        "stdout": result.stdout.strip(),
        "stderr": result.stderr.strip(),
    }


def extract_source(source: dict[str, Any]) -> dict[str, Any]:
    page_records: list[dict[str, Any]] = []
    headword_candidates: list[dict[str, Any]] = []

    with fitz.open(source["sourceFilePath"]) as document:
        proof_pages = select_proof_pages(source["sourceId"], document.page_count)
        for page_number in proof_pages:
            page = document.load_page(page_number - 1)
            page_record = build_page_record(source, page_number, page)
            page_records.append(page_record)
            headword_candidates.extend(segment_page(page_record))

    raw_pages_path = RAW_PAGES_DIR / f"{source['sourceId']}.pages.ndjson"
    segmentation_path = SEGMENTATION_DIR / f"{source['sourceId']}.headword_candidates.ndjson"
    write_ndjson(raw_pages_path, page_records)
    write_ndjson(segmentation_path, headword_candidates)

    total_chars = sum(record["charCount"] for record in page_records)
    total_words = sum(record["wordCount"] for record in page_records)
    total_controls = sum(record["controlCharCount"] for record in page_records)
    average_control_ratio = total_controls / total_chars if total_chars else 0
    image_pages = sum(1 for record in page_records if record["imageCount"] > 0)
    poor_pages = sum(1 for record in page_records if record["parseConfidence"] == "low")

    if total_words == 0 and image_pages > 0:
        recommendation = "ocr_required"
        comparator_readiness = "not_ready_with_current_tooling"
    elif headword_candidates:
        recommendation = "direct_text_with_tuning_possible"
        comparator_readiness = "limited_comparator_possible"
    else:
        recommendation = "mixed_fallback_needed"
        comparator_readiness = "not_ready_with_current_tooling"

    return {
        "sourceId": source["sourceId"],
        "sourceTitle": source["sourceTitle"],
        "year": source["year"],
        "volume": source["volume"],
        "sourceFile": source["sourceFile"],
        "pageCount": source["pageCount"],
        "proofPages": [record["page"] for record in page_records],
        "pageRecordCount": len(page_records),
        "totalChars": total_chars,
        "totalWords": total_words,
        "averageControlCharRatio": round(average_control_ratio, 4),
        "imageBackedProofPages": image_pages,
        "poorParsePages": poor_pages,
        "headwordCandidateCount": len(headword_candidates),
        "segmentationAssessment": "too_noisy" if not headword_candidates else "usable_with_tuning",
        "recommendedExtractionPath": recommendation,
        "comparatorReadiness": comparator_readiness,
        "rawPagesOutput": windows_path(raw_pages_path),
        "segmentationOutput": windows_path(segmentation_path),
        "sampleHeadwords": [candidate["headword"] for candidate in headword_candidates[:20]],
        "pageMetrics": [
            {
                "page": record["page"],
                "charCount": record["charCount"],
                "wordCount": record["wordCount"],
                "controlCharRatio": record["controlCharRatio"],
                "imageCount": record["imageCount"],
                "parseConfidence": record["parseConfidence"],
            }
            for record in page_records
        ],
    }


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows],
        ]
    )


def build_summary(report: dict[str, Any]) -> str:
    source_rows = [
        [
            source["sourceId"],
            source["pageRecordCount"],
            source["totalWords"],
            source["headwordCandidateCount"],
            source["averageControlCharRatio"],
            source["recommendedExtractionPath"],
            source["comparatorReadiness"],
        ]
        for source in report["sources"]
    ]

    return "\n".join(
        [
            "# Bouvier Comparator Preparation Report",
            "",
            "Scope: Bouvier 1839 volumes 1 and 2 only. This is a bounded comparator-prep proof; it does not author meanings, modify the live vocabulary dataset, process Ballentine or Burrill, or build a final merged corpus.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: Bouvier source sampling, page-level NDJSON proof outputs, segmentation attempt, local OCR/tooling check, and comparator-readiness recommendation.",
            "- Partial: only small representative page windows were sampled; no full-volume extraction was run.",
            "- Missing: OCR proof, OCR text extraction, Bouvier headword segmentation, and reference alignment against boundary terms.",
            "- Not evidenced: usable direct-text Bouvier headwords or Bouvier support for batch 001-003 terms.",
            "",
            "## Tooling Check",
            "",
            f"- Tesseract available: {report['tooling']['tesseract']['available']}",
            f"- pytesseract available: {report['tooling']['pythonPackages']['pytesseract']}",
            f"- Pillow available: {report['tooling']['pythonPackages']['pillow']}",
            f"- PyMuPDF available: {report['tooling']['pythonPackages']['pymupdf']}",
            "",
            "## Proof Summary",
            "",
            markdown_table(
                [
                    "Source",
                    "Proof pages",
                    "Words",
                    "Candidates",
                    "Control ratio",
                    "Extraction path",
                    "Comparator readiness",
                ],
                source_rows,
            ),
            "",
            "## Finding",
            "",
            "- Bouvier is image-backed in the sampled dictionary pages.",
            "- The embedded text layer is not usable: sampled pages contain control-character text and zero recognized words.",
            "- Direct PyMuPDF text extraction is not sufficient for comparator use.",
            "- Headword segmentation from the current text layer is too noisy because there are no usable word lines to segment.",
            "",
            "## Recommendation",
            "",
            "- Do not run full Bouvier direct-text extraction before batch 004 review.",
            "- Batch 004 may proceed at 50 terms using Black-backed references, with continued caution for historical or civil-law-sensitive terms.",
            "- Prepare Bouvier OCR next: install or enable OCR tooling separately, run a 6-10 page OCR proof per volume, and only then decide whether full Bouvier extraction is worthwhile.",
            "- Keep Ballentine and Burrill deferred until the Bouvier OCR proof is successful.",
            "",
            "## Exact Next Prompt",
            "",
            "Task: Build batch 004 draft-only Meaning in law entries from the next 50 terms in main_approval_queue.json after batch 003, using only approved Black-backed references already attached in the approval queue. Do not modify the live vocabulary dataset yet. Keep batch size at 50 and flag terms that should wait for Bouvier OCR comparator support.",
            "",
        ]
    )


def python_package_available(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except ImportError:
        return False


def main() -> int:
    RAW_PAGES_DIR.mkdir(parents=True, exist_ok=True)
    SEGMENTATION_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    sources = load_bouvier_sources()
    source_reports = [extract_source(source) for source in sources]
    tooling = {
        "tesseract": command_output(["tesseract", "--version"]),
        "pythonPackages": {
            "pymupdf": python_package_available("fitz"),
            "pytesseract": python_package_available("pytesseract"),
            "pillow": python_package_available("PIL"),
        },
    }

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "bouvier comparator preparation only",
        "meaningAuthoringPerformed": False,
        "runtimeOntologyChanged": False,
        "boundaryContentChanged": False,
        "ballentineProcessed": False,
        "burrillProcessed": False,
        "finalMergedCorpusBuilt": False,
        "tooling": tooling,
        "sources": source_reports,
        "outputs": {
            "root": windows_path(OUTPUT_ROOT),
            "rawPagesDir": windows_path(RAW_PAGES_DIR),
            "segmentationDir": windows_path(SEGMENTATION_DIR),
            "summary": windows_path(SUMMARY_PATH),
            "qualityReport": windows_path(QUALITY_REPORT_PATH),
        },
    }

    QUALITY_REPORT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    SUMMARY_PATH.write_text(build_summary(report), encoding="utf-8")

    print(f"Wrote {windows_path(SUMMARY_PATH)}")
    print(f"Wrote {windows_path(QUALITY_REPORT_PATH)}")
    print(f"Wrote {windows_path(RAW_PAGES_DIR)}")
    print(f"Wrote {windows_path(SEGMENTATION_DIR)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
