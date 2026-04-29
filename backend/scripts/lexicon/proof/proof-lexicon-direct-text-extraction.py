#!/usr/bin/env python3
"""Run a bounded direct-text extraction proof for legal lexicon PDFs."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz


WORKSPACE_ROOT = Path("/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons")
PROOF_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "proof"
RAW_PAGES_DIR = PROOF_ROOT / "raw_pages"
SEGMENTATION_DIR = PROOF_ROOT / "segmentation"
REPORTS_DIR = PROOF_ROOT / "reports"

PARSER_RECOMMENDATIONS_PATH = WORKSPACE_ROOT / "parser_recommendations.json"
SUMMARY_PATH = REPORTS_DIR / "proof_summary.md"
QUALITY_REPORT_PATH = REPORTS_DIR / "segmentation_quality_report.json"

IN_SCOPE_SOURCE_IDS = {"blacks_1910"}
IN_SCOPE_SOURCE_PREFIXES = ("black_1891_",)

SOURCE_FOLDER_BY_ID = {
    "blacks_1910": "blacks_law_dictionary_2nd_edition_1910",
}
SOURCE_FOLDER_BY_PREFIX = {
    "black_1891_": "dictionary_of_black_1891",
}

HEADWORD_LINE_PATTERN = re.compile(
    r"^(?P<headword>[A-Z][A-Z0-9 '&.,\-/]{1,80})(?:\.|:)?(?:\s|$)"
)
RUNNING_HEADER_PATTERN = re.compile(r"^[A-Z][A-Z0-9 '&.\-/]{1,50}$")
WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
CITATION_FRAGMENT_PATTERN = re.compile(r"^[A-Z]\.?\s*[A-Z]\.?\s*\d+")
CONNECTOR_FRAGMENTS = {
    "A",
    "AN",
    "AND",
    "BY",
    "CO",
    "DE",
    "EST",
    "IN",
    "II",
    "III",
    "IV",
    "NON",
    "OF",
    "ON",
    "OR",
    "THE",
    "TION",
    "TO",
    "TBA",
    "WI",
    "RE",
}
ALLOWED_SHORT_HEADWORDS = {"PER"}


def windows_path(path: Path) -> str:
    value = str(path)
    if value.startswith("/mnt/c/"):
        return "C:\\" + value[len("/mnt/c/") :].replace("/", "\\")
    return value


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def clean_line(value: str) -> str:
    return normalize_space(value.replace("\uFFFD", ""))


def count_words(value: str) -> int:
    return len(WORD_PATTERN.findall(value))


def classify_text_quality(text: str) -> tuple[str, str]:
    char_count = len(text)
    word_count = count_words(text)
    replacement_count = text.count("\uFFFD")

    if char_count >= 1500 and word_count >= 150 and replacement_count < 25:
        return "good", "high"
    if char_count >= 500 and word_count >= 60:
        return "mixed", "medium"
    return "poor", "low"


def is_in_scope_source(source_id: str) -> bool:
    return source_id in IN_SCOPE_SOURCE_IDS or source_id.startswith(IN_SCOPE_SOURCE_PREFIXES)


def source_folder_for(source_id: str) -> str:
    if source_id in SOURCE_FOLDER_BY_ID:
        return SOURCE_FOLDER_BY_ID[source_id]

    for prefix, folder in SOURCE_FOLDER_BY_PREFIX.items():
        if source_id.startswith(prefix):
            return folder

    raise ValueError(f"Unsupported source id: {source_id}")


def load_in_scope_sources() -> list[dict[str, Any]]:
    payload = json.loads(PARSER_RECOMMENDATIONS_PATH.read_text(encoding="utf-8"))
    recommendations = payload["sourceRecommendations"]
    sources: list[dict[str, Any]] = []

    for recommendation in recommendations:
        source_id = recommendation["sourceId"]
        if not is_in_scope_source(source_id):
            continue
        if recommendation.get("recommendedExtractionPath") != "direct_text_extraction":
            continue

        source_folder = source_folder_for(source_id)
        source_file_path = WORKSPACE_ROOT / source_folder / recommendation["fileName"]
        sources.append(
            {
                **recommendation,
                "sourceFilePath": source_file_path,
                "sourceFile": windows_path(source_file_path),
            }
        )

    return sorted(sources, key=lambda source: source["sourceId"])


def select_proof_pages(source_id: str, page_count: int) -> list[int]:
    if source_id == "blacks_1910":
        anchors = [100, max(1, page_count // 2), min(page_count, 1000)]
    else:
        early = max(25, int(page_count * 0.18))
        middle = max(1, page_count // 2)
        late = max(1, int(page_count * 0.82))
        anchors = [early, middle, late]

    pages: set[int] = set()
    for anchor in anchors:
        for page in (anchor, anchor + 1):
            if 1 <= page <= page_count:
                pages.add(page)

    return sorted(pages)


def build_page_record(source: dict[str, Any], page_number: int, text: str) -> dict[str, Any]:
    ocr_quality, parse_confidence = classify_text_quality(text)
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
        "ocrQuality": ocr_quality,
        "parseConfidence": parse_confidence,
    }


def is_probable_headword(line: str) -> bool:
    cleaned = clean_line(line)
    if not cleaned:
        return False
    if len(cleaned) > 82:
        return False
    if not re.search(r"[A-Z]", cleaned):
        return False
    if cleaned.isdigit():
        return False

    headword = extract_headword(cleaned)
    if not headword:
        return False

    if len(headword) < 2:
        return False
    if headword in CONNECTOR_FRAGMENTS:
        return False
    if headword.split(" ", 1)[0] in CONNECTOR_FRAGMENTS:
        return False
    if CITATION_FRAGMENT_PATTERN.match(headword):
        return False
    if re.search(r"\d", headword):
        return False

    letters = [character for character in headword if character.isalpha()]
    if not letters:
        return False
    if len(letters) <= 3 and headword not in ALLOWED_SHORT_HEADWORDS:
        return False

    uppercase_ratio = sum(1 for character in letters if character.isupper()) / len(letters)
    if uppercase_ratio < 0.72:
        return False

    # Reject obvious running prose that was OCR-split into short lines.
    lower_words = re.findall(r"\b[a-z]{2,}\b", cleaned)
    if len(lower_words) > 1:
        return False

    return True


def extract_headword(line: str) -> str | None:
    cleaned = clean_line(line)
    match = HEADWORD_LINE_PATTERN.match(cleaned)
    if not match:
        return None

    headword = match.group("headword").strip(" .,:;-")

    # Remove common language/classification markers without treating them as part of the headword.
    headword = re.sub(r"\b(FR|L|LAT|LAW|CIV|ENG|SAX)\.?$", "", headword).strip(" .,:;-")
    if not headword:
        return None

    return headword


def segment_page(page_record: dict[str, Any]) -> list[dict[str, Any]]:
    lines = page_record["rawText"].splitlines()
    candidates: list[dict[str, Any]] = []

    for index, line in enumerate(lines):
        cleaned = clean_line(line)
        if not is_probable_headword(cleaned):
            continue

        headword = extract_headword(cleaned)
        if not headword:
            continue
        following_lines = [
            clean_line(next_line)
            for next_line in lines[index + 1 : index + 6]
            if clean_line(next_line)
        ]
        preview = normalize_space(" ".join(following_lines))[:280]

        confidence = "medium"
        if RUNNING_HEADER_PATTERN.match(cleaned) and len(following_lines) >= 2:
            confidence = "high"
        if page_record["parseConfidence"] == "low":
            confidence = "low"

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
                "contextPreview": preview,
                "parseConfidence": confidence,
            }
        )

    return candidates


def write_ndjson(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=True, sort_keys=True))
            output.write("\n")


def is_suspicious_candidate(candidate: dict[str, Any]) -> bool:
    headword = candidate["headword"]
    letters = [character for character in headword if character.isalpha()]

    if not letters:
        return True
    if headword in CONNECTOR_FRAGMENTS:
        return True
    if len(letters) <= 3 and headword not in ALLOWED_SHORT_HEADWORDS:
        return True
    if re.search(r"\s[A-Z]$", headword):
        return True
    if re.search(r"[A-Z]\s[A-Z]{1,2}$", headword) and len(headword.split()) > 1:
        return True

    return False


def assess_segmentation(
    page_records: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    suspicious_count: int,
) -> str:
    if not page_records:
        return "too_noisy"

    average_candidates = len(candidates) / len(page_records)
    high_confidence = sum(1 for candidate in candidates if candidate["parseConfidence"] == "high")
    high_ratio = high_confidence / len(candidates) if candidates else 0
    suspicious_ratio = suspicious_count / len(candidates) if candidates else 1

    if average_candidates >= 4 and high_ratio >= 0.35 and suspicious_ratio <= 0.03:
        return "reliable"
    if average_candidates >= 1.5:
        return "usable_with_tuning"
    return "too_noisy"


def extract_source(source: dict[str, Any]) -> dict[str, Any]:
    page_records: list[dict[str, Any]] = []
    headword_candidates: list[dict[str, Any]] = []

    with fitz.open(source["sourceFilePath"]) as document:
        proof_pages = select_proof_pages(source["sourceId"], document.page_count)
        for page_number in proof_pages:
            page = document.load_page(page_number - 1)
            text = page.get_text("text") or ""
            page_record = build_page_record(source, page_number, text)
            page_records.append(page_record)
            headword_candidates.extend(segment_page(page_record))

    raw_pages_path = RAW_PAGES_DIR / f"{source['sourceId']}.pages.ndjson"
    segmentation_path = SEGMENTATION_DIR / f"{source['sourceId']}.headword_candidates.ndjson"
    write_ndjson(raw_pages_path, page_records)
    write_ndjson(segmentation_path, headword_candidates)

    suspicious_count = sum(1 for candidate in headword_candidates if is_suspicious_candidate(candidate))
    assessment = assess_segmentation(page_records, headword_candidates, suspicious_count)
    high_confidence = sum(1 for candidate in headword_candidates if candidate["parseConfidence"] == "high")
    medium_confidence = sum(1 for candidate in headword_candidates if candidate["parseConfidence"] == "medium")
    low_confidence = sum(1 for candidate in headword_candidates if candidate["parseConfidence"] == "low")

    return {
        "sourceId": source["sourceId"],
        "sourceTitle": source["sourceTitle"],
        "year": source["year"],
        "volume": source["volume"],
        "sourceFile": source["sourceFile"],
        "pageCount": source["pageCount"],
        "proofPages": [record["page"] for record in page_records],
        "pageRecordCount": len(page_records),
        "headwordCandidateCount": len(headword_candidates),
        "confidenceCounts": {
            "high": high_confidence,
            "medium": medium_confidence,
            "low": low_confidence,
        },
        "suspiciousCandidateCount": suspicious_count,
        "suspiciousCandidateRatio": round(suspicious_count / len(headword_candidates), 4)
        if headword_candidates
        else 0,
        "averageCandidatesPerPage": round(
            len(headword_candidates) / len(page_records), 2
        )
        if page_records
        else 0,
        "segmentationAssessment": assessment,
        "rawPagesOutput": windows_path(raw_pages_path),
        "segmentationOutput": windows_path(segmentation_path),
        "sampleHeadwords": [candidate["headword"] for candidate in headword_candidates[:20]],
    }


def build_summary(report: dict[str, Any]) -> str:
    rows = []
    for source in report["sources"]:
        rows.append(
            "| "
            + " | ".join(
                [
                    source["sourceId"],
                    str(source["pageRecordCount"]),
                    str(source["headwordCandidateCount"]),
                    str(source["averageCandidatesPerPage"]),
                    source["segmentationAssessment"],
                ]
            )
            + " |"
        )

    source_rows = "\n".join(rows)
    reliable_count = sum(
        1 for source in report["sources"] if source["segmentationAssessment"] == "reliable"
    )
    tuning_count = sum(
        1
        for source in report["sources"]
        if source["segmentationAssessment"] == "usable_with_tuning"
    )
    noisy_count = sum(
        1 for source in report["sources"] if source["segmentationAssessment"] == "too_noisy"
    )

    return "\n".join(
        [
            "# Direct-Text Lexicon Extraction Proof",
            "",
            "Scope: Black 1910 and Black 1891 direct-text sources only. This proof does not author meanings, build the final merged corpus, process OCR-first sources, or modify runtime ontology/boundary content.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: proof output folders, page NDJSON schema, representative page extraction, deterministic headword-candidate NDJSON, and segmentation quality reporting.",
            "- Partial: segmentation is candidate-level only and needs tuning before full corpus extraction.",
            "- Missing: full page-by-page extraction, entry-level dictionary segmentation, registry alignment, OCR fallback, merged corpus, and frontend reference index.",
            "- Not evidenced: legal meaning accuracy, source coverage for all 3,585 boundary terms, and replacement quality for existing authored meanings.",
            "",
            "## Output Structure",
            "",
            f"- Proof root: `{windows_path(PROOF_ROOT)}`",
            f"- Raw page NDJSON: `{windows_path(RAW_PAGES_DIR)}`",
            f"- Segmentation NDJSON: `{windows_path(SEGMENTATION_DIR)}`",
            f"- Reports: `{windows_path(REPORTS_DIR)}`",
            "",
            "## Segmentation Summary",
            "",
            "| Source | Proof pages | Candidate headwords | Avg candidates/page | Assessment |",
            "| --- | --- | --- | --- | --- |",
            source_rows,
            "",
            "## Readiness",
            "",
            f"- Reliable sources: {reliable_count}",
            f"- Usable with tuning: {tuning_count}",
            f"- Too noisy: {noisy_count}",
            "- Direct-text sources are ready for a controlled full page-by-page extraction after one segmentation-tuning pass.",
            "- Bouvier should be tested next only after the Black direct-text lane has full page NDJSON and a stable segmentation rule; defer OCR-first Ballentine and Burrill.",
            "",
            "## Exact Next Prompt",
            "",
            "Task: Tune the direct-text headword segmentation rules using the proof outputs, then run full page-by-page NDJSON extraction for Black 1910 and Black 1891 only with checkpointed per-source outputs. Do not author meanings, do not process OCR-first sources, do not build the final merged corpus, and do not modify runtime ontology or boundary content.",
            "",
        ]
    )


def main() -> int:
    RAW_PAGES_DIR.mkdir(parents=True, exist_ok=True)
    SEGMENTATION_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    sources = load_in_scope_sources()
    source_reports = [extract_source(source) for source in sources]

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "direct-text extraction proof only",
        "meaningAuthoringPerformed": False,
        "runtimeOntologyChanged": False,
        "boundaryContentChanged": False,
        "ocrSourcesProcessed": False,
        "pageSchema": {
            "id": "",
            "sourceId": "",
            "sourceTitle": "",
            "year": 0,
            "volume": None,
            "sourceFile": "",
            "page": 0,
            "rawText": "",
            "charCount": 0,
            "wordCount": 0,
            "ocrQuality": "good|mixed|poor",
            "parseConfidence": "high|medium|low",
        },
        "sources": source_reports,
        "outputs": {
            "proofRoot": windows_path(PROOF_ROOT),
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
