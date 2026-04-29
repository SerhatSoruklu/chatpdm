#!/usr/bin/env python3
"""Extract direct-text legal lexicon PDFs into restartable page and headword NDJSON."""

from __future__ import annotations

import json
import os
import re
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz


WORKSPACE_ROOT = Path("/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons")
OUTPUT_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "direct_text"
RAW_PAGES_DIR = OUTPUT_ROOT / "raw_pages"
SEGMENTATION_DIR = OUTPUT_ROOT / "segmentation"
CHECKPOINTS_DIR = OUTPUT_ROOT / "checkpoints"
REPORTS_DIR = OUTPUT_ROOT / "reports"

PARSER_RECOMMENDATIONS_PATH = WORKSPACE_ROOT / "parser_recommendations.json"
EXTRACTION_SUMMARY_PATH = REPORTS_DIR / "extraction_summary.md"
QUALITY_REPORT_PATH = REPORTS_DIR / "extraction_quality_report.json"
TUNING_NOTES_PATH = REPORTS_DIR / "segmentation_tuning_notes.md"

IN_SCOPE_SOURCE_IDS = {"blacks_1910"}
IN_SCOPE_SOURCE_PREFIXES = ("black_1891_",)

SOURCE_FOLDER_BY_ID = {
    "blacks_1910": "blacks_law_dictionary_2nd_edition_1910",
}
SOURCE_FOLDER_BY_PREFIX = {
    "black_1891_": "dictionary_of_black_1891",
}

CHUNK_SIZE = 50
DEFAULT_WORKER_CAP = 12
WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
HEADWORD_LINE_PATTERN = re.compile(
    r"^(?P<headword>[A-Z][A-Z0-9 '&.,\-/]{1,80})(?:\.|:)?(?:\s|$)"
)
CITATION_FRAGMENT_PATTERN = re.compile(r"^[A-Z]\.?\s*[A-Z]\.?\s*\d+")
CONNECTOR_FRAGMENTS = {
    "A",
    "AN",
    "AND",
    "BY",
    "CO",
    "DE",
    "EST",
    "FACT",
    "IN",
    "II",
    "III",
    "IV",
    "MENT",
    "NON",
    "OF",
    "ON",
    "OR",
    "OVER",
    "PROOF",
    "RE",
    "THE",
    "TION",
    "TO",
    "TBA",
    "UNDER",
    "WI",
}
DISALLOWED_FINAL_WORDS = {
    "A",
    "AN",
    "AND",
    "BY",
    "DE",
    "IN",
    "NON",
    "OF",
    "ON",
    "OR",
    "THE",
    "TO",
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


def extract_headword(line: str) -> str | None:
    cleaned = clean_line(line)
    match = HEADWORD_LINE_PATTERN.match(cleaned)
    if not match:
        return None

    headword = match.group("headword").strip(" .,:;-")
    headword = re.sub(r"\b(FR|L|LAT|LAW|CIV|ENG|SAX)\.?$", "", headword).strip(" .,:;-")
    if not headword:
        return None

    return headword


def is_probable_headword(line: str) -> bool:
    cleaned = clean_line(line)
    if not cleaned or len(cleaned) > 82:
        return False
    if not re.search(r"[A-Z]", cleaned) or cleaned.isdigit():
        return False

    headword = extract_headword(cleaned)
    if not headword or len(headword) < 2:
        return False
    if headword in CONNECTOR_FRAGMENTS:
        return False
    words = headword.split()
    if words[0] in CONNECTOR_FRAGMENTS:
        return False
    if words[-1] in DISALLOWED_FINAL_WORDS:
        return False
    if CITATION_FRAGMENT_PATTERN.match(headword):
        return False
    if re.search(r"\d", headword):
        return False
    if len(headword) > 2 and re.search(r"[A-Z]\s[A-Z]$", headword):
        return False

    letters = [character for character in headword if character.isalpha()]
    if not letters:
        return False
    if len(letters) <= 3 and headword not in ALLOWED_SHORT_HEADWORDS:
        return False

    uppercase_ratio = sum(1 for character in letters if character.isupper()) / len(letters)
    if uppercase_ratio < 0.72:
        return False

    lower_words = re.findall(r"\b[a-z]{2,}\b", cleaned)
    if len(lower_words) > 1:
        return False

    return True


def is_suspicious_candidate(candidate: dict[str, Any]) -> bool:
    headword = candidate["headword"]
    letters = [character for character in headword if character.isalpha()]
    words = headword.split()

    if not letters:
        return True
    if headword in CONNECTOR_FRAGMENTS:
        return True
    if words and (words[0] in CONNECTOR_FRAGMENTS or words[-1] in DISALLOWED_FINAL_WORDS):
        return True
    if len(letters) <= 3 and headword not in ALLOWED_SHORT_HEADWORDS:
        return True
    if re.search(r"\s[A-Z]$", headword):
        return True
    if re.search(r"[A-Z]\s[A-Z]{1,2}$", headword) and len(words) > 1:
        return True

    return False


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

        confidence = "high" if len(following_lines) >= 2 else "medium"
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


def json_line(record: dict[str, Any]) -> str:
    return json.dumps(record, ensure_ascii=True, sort_keys=True)


def process_chunk(source: dict[str, Any], start_page: int, end_page: int, chunk_dir: str) -> dict[str, Any]:
    chunk_root = Path(chunk_dir)
    chunk_id = f"{start_page:05d}-{end_page:05d}"
    raw_chunk_path = chunk_root / f"{chunk_id}.pages.ndjson"
    segmentation_chunk_path = chunk_root / f"{chunk_id}.headword_candidates.ndjson"
    meta_path = chunk_root / f"{chunk_id}.meta.json"

    if raw_chunk_path.exists() and segmentation_chunk_path.exists() and meta_path.exists():
        return json.loads(meta_path.read_text(encoding="utf-8"))

    page_count = 0
    empty_pages: list[int] = []
    near_empty_pages: list[int] = []
    candidate_count = 0
    suspicious_count = 0
    high_confidence = 0
    medium_confidence = 0
    low_confidence = 0

    with fitz.open(source["sourceFilePath"]) as document:
        with raw_chunk_path.open("w", encoding="utf-8") as raw_output:
            with segmentation_chunk_path.open("w", encoding="utf-8") as segmentation_output:
                for page_number in range(start_page, end_page + 1):
                    text = document.load_page(page_number - 1).get_text("text") or ""
                    page_record = build_page_record(source, page_number, text)
                    raw_output.write(json_line(page_record) + "\n")
                    page_count += 1

                    if page_record["charCount"] == 0:
                        empty_pages.append(page_number)
                    elif page_record["charCount"] < 200:
                        near_empty_pages.append(page_number)

                    candidates = segment_page(page_record)
                    for candidate in candidates:
                        candidate_count += 1
                        if is_suspicious_candidate(candidate):
                            suspicious_count += 1
                        if candidate["parseConfidence"] == "high":
                            high_confidence += 1
                        elif candidate["parseConfidence"] == "medium":
                            medium_confidence += 1
                        else:
                            low_confidence += 1
                        segmentation_output.write(json_line(candidate) + "\n")

    meta = {
        "sourceId": source["sourceId"],
        "chunkId": chunk_id,
        "startPage": start_page,
        "endPage": end_page,
        "pageCount": page_count,
        "emptyPages": empty_pages,
        "nearEmptyPages": near_empty_pages,
        "candidateCount": candidate_count,
        "suspiciousCandidateCount": suspicious_count,
        "confidenceCounts": {
            "high": high_confidence,
            "medium": medium_confidence,
            "low": low_confidence,
        },
        "rawChunkPath": str(raw_chunk_path),
        "segmentationChunkPath": str(segmentation_chunk_path),
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    return meta


def is_in_scope_source(source_id: str) -> bool:
    return source_id in IN_SCOPE_SOURCE_IDS or source_id.startswith(IN_SCOPE_SOURCE_PREFIXES)


def source_folder_for(source_id: str) -> str:
    if source_id in SOURCE_FOLDER_BY_ID:
        return SOURCE_FOLDER_BY_ID[source_id]
    for prefix, folder in SOURCE_FOLDER_BY_PREFIX.items():
        if source_id.startswith(prefix):
            return folder
    raise ValueError(f"Unsupported source id: {source_id}")


def load_sources() -> list[dict[str, Any]]:
    payload = json.loads(PARSER_RECOMMENDATIONS_PATH.read_text(encoding="utf-8"))
    sources: list[dict[str, Any]] = []

    for recommendation in payload["sourceRecommendations"]:
        source_id = recommendation["sourceId"]
        if not is_in_scope_source(source_id):
            continue
        if recommendation.get("recommendedExtractionPath") != "direct_text_extraction":
            continue

        source_file_path = WORKSPACE_ROOT / source_folder_for(source_id) / recommendation["fileName"]
        sources.append(
            {
                **recommendation,
                "sourceFilePath": str(source_file_path),
                "sourceFile": windows_path(source_file_path),
            }
        )

    return sorted(sources, key=lambda source: source["sourceId"])


def validate_ndjson(path: Path) -> int:
    count = 0
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8") as input_file:
        for line in input_file:
            stripped = line.strip()
            if not stripped:
                continue
            json.loads(stripped)
            count += 1
    return count


def concatenate_chunks(chunk_metas: list[dict[str, Any]], output_path: Path, chunk_key: str) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as output:
        for meta in sorted(chunk_metas, key=lambda item: item["startPage"]):
            chunk_path = Path(meta[chunk_key])
            with chunk_path.open("r", encoding="utf-8") as chunk_input:
                for line in chunk_input:
                    output.write(line)


def process_source(source: dict[str, Any], worker_count: int) -> dict[str, Any]:
    source_id = source["sourceId"]
    expected_page_count = int(source["pageCount"])
    raw_output_path = RAW_PAGES_DIR / f"{source_id}.pages.ndjson"
    segmentation_output_path = SEGMENTATION_DIR / f"{source_id}.headword_candidates.ndjson"
    checkpoint_dir = CHECKPOINTS_DIR / source_id
    chunk_dir = checkpoint_dir / "chunks"
    checkpoint_path = checkpoint_dir / "checkpoint.json"
    chunk_dir.mkdir(parents=True, exist_ok=True)

    if checkpoint_path.exists() and raw_output_path.exists() and segmentation_output_path.exists():
        checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        if checkpoint.get("status") == "complete":
            raw_rows = validate_ndjson(raw_output_path)
            segmentation_rows = validate_ndjson(segmentation_output_path)
            if raw_rows == expected_page_count:
                return {
                    **checkpoint["summary"],
                    "resumedFromCompleteCheckpoint": True,
                    "validatedRawRows": raw_rows,
                    "validatedSegmentationRows": segmentation_rows,
                }

    page_ranges = [
        (start, min(start + CHUNK_SIZE - 1, expected_page_count))
        for start in range(1, expected_page_count + 1, CHUNK_SIZE)
    ]
    actual_workers = max(1, min(worker_count, len(page_ranges)))
    chunk_metas: list[dict[str, Any]] = []

    with ProcessPoolExecutor(max_workers=actual_workers) as executor:
        futures = [
            executor.submit(process_chunk, source, start_page, end_page, str(chunk_dir))
            for start_page, end_page in page_ranges
        ]
        for future in as_completed(futures):
            chunk_metas.append(future.result())

    chunk_metas = sorted(chunk_metas, key=lambda item: item["startPage"])
    concatenate_chunks(chunk_metas, raw_output_path, "rawChunkPath")
    concatenate_chunks(chunk_metas, segmentation_output_path, "segmentationChunkPath")

    raw_rows = validate_ndjson(raw_output_path)
    segmentation_rows = validate_ndjson(segmentation_output_path)
    empty_pages = [page for meta in chunk_metas for page in meta["emptyPages"]]
    near_empty_pages = [page for meta in chunk_metas for page in meta["nearEmptyPages"]]
    suspicious_count = sum(meta["suspiciousCandidateCount"] for meta in chunk_metas)
    confidence_counts = {
        "high": sum(meta["confidenceCounts"]["high"] for meta in chunk_metas),
        "medium": sum(meta["confidenceCounts"]["medium"] for meta in chunk_metas),
        "low": sum(meta["confidenceCounts"]["low"] for meta in chunk_metas),
    }

    summary = {
        "sourceId": source_id,
        "sourceTitle": source["sourceTitle"],
        "year": source["year"],
        "volume": source["volume"],
        "sourceFile": source["sourceFile"],
        "expectedPageCount": expected_page_count,
        "extractedPageCount": raw_rows,
        "pageCountMatchesExpected": raw_rows == expected_page_count,
        "segmentationCandidateCount": segmentation_rows,
        "emptyPageCount": len(empty_pages),
        "nearEmptyPageCount": len(near_empty_pages),
        "emptyPages": empty_pages[:100],
        "nearEmptyPages": near_empty_pages[:100],
        "suspiciousCandidateCount": suspicious_count,
        "suspiciousCandidateRatio": round(suspicious_count / segmentation_rows, 4)
        if segmentation_rows
        else 0,
        "confidenceCounts": confidence_counts,
        "chunkCount": len(chunk_metas),
        "workerCount": actual_workers,
        "rawPagesOutput": windows_path(raw_output_path),
        "segmentationOutput": windows_path(segmentation_output_path),
        "validatedRawRows": raw_rows,
        "validatedSegmentationRows": segmentation_rows,
        "resumedFromCompleteCheckpoint": False,
    }
    checkpoint = {
        "status": "complete",
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "chunks": chunk_metas,
    }
    checkpoint_path.write_text(json.dumps(checkpoint, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    return summary


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows],
        ]
    )


def build_tuning_notes() -> str:
    return "\n".join(
        [
            "# Direct-Text Segmentation Tuning Notes",
            "",
            "Scope: Black 1910 and Black 1891 direct-text extraction only.",
            "",
            "## Tuned Rules",
            "",
            "- Rejected citation-like fragments containing report abbreviations plus digits.",
            "- Rejected short connector fragments such as `OF`, `DE`, `TION`, `MENT`, `WI`, and `RE`.",
            "- Rejected candidates whose first or final word is an incomplete connector.",
            "- Rejected most three-letter-or-shorter candidates except the known legal headword `PER`.",
            "- Kept uppercase-ratio checks and context previews from the proof script.",
            "- Preserved candidate-level output instead of claiming full dictionary-entry segmentation.",
            "",
            "## Reason",
            "",
            "The proof outputs showed useful page text and headword structure, but some Black 1891 pages produce OCR-split fragments. The tuned rules reduce weak fragments while keeping the extraction deterministic and inspectable.",
            "",
        ]
    )


def build_summary_report(report: dict[str, Any]) -> str:
    rows = [
        [
            source["sourceId"],
            source["expectedPageCount"],
            source["extractedPageCount"],
            source["segmentationCandidateCount"],
            source["emptyPageCount"],
            source["nearEmptyPageCount"],
            source["suspiciousCandidateRatio"],
            source["workerCount"],
        ]
        for source in report["sources"]
    ]

    all_page_counts_match = all(source["pageCountMatchesExpected"] for source in report["sources"])
    total_pages = sum(source["extractedPageCount"] for source in report["sources"])
    total_candidates = sum(source["segmentationCandidateCount"] for source in report["sources"])

    return "\n".join(
        [
            "# Direct-Text Lexicon Extraction Summary",
            "",
            "Scope: full page-by-page extraction for Black 1910 and Black 1891 direct-text sources only. No meanings were authored, no OCR sources were processed, no final merged corpus was built, and runtime ontology/boundary content was not modified.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: checkpointed per-source page extraction, raw page NDJSON, tuned headword-candidate NDJSON, validation, and quality reporting.",
            "- Partial: segmentation remains candidate-level and is not yet entry-level dictionary parsing.",
            "- Missing: registry alignment, merged reference corpus, frontend reference index, Bouvier fallback tests, OCR lane, and meaning authoring.",
            "- Not evidenced: legal meaning accuracy or source coverage for all 3,585 boundary terms.",
            "",
            "## Totals",
            "",
            f"- Sources processed: {len(report['sources'])}",
            f"- Pages extracted: {total_pages}",
            f"- Headword candidates: {total_candidates}",
            f"- All page counts matched expected counts: {all_page_counts_match}",
            f"- Worker cap: {report['workerCap']}",
            "",
            "## Source Quality",
            "",
            markdown_table(
                [
                    "Source",
                    "Expected pages",
                    "Extracted pages",
                    "Candidates",
                    "Empty",
                    "Near-empty",
                    "Suspicious ratio",
                    "Workers",
                ],
                rows,
            ),
            "",
            "## Readiness",
            "",
            "- Black 1910 and Black 1891 are ready for registry-alignment proof against the 3,585 boundary terms.",
            "- Bouvier should still be deferred until the Black direct-text lane is aligned and coverage yield is measured.",
            "- Ballentine and Burrill remain deferred until an OCR proof is explicitly approved.",
            "",
            "## Exact Next Prompt",
            "",
            "Task: Build a registry-alignment proof between the direct-text Black reference outputs and the ChatPDM vocabulary boundary registry. Match normalized headword candidates against the 3,585 recognized boundary terms and alias groups, report coverage and unmatched terms, but do not author meanings, build the final merged corpus, process OCR sources, or modify runtime ontology/boundary content.",
            "",
        ]
    )


def main() -> int:
    RAW_PAGES_DIR.mkdir(parents=True, exist_ok=True)
    SEGMENTATION_DIR.mkdir(parents=True, exist_ok=True)
    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    sources = load_sources()
    cpu_count = os.cpu_count() or 1
    worker_cap = max(1, min(DEFAULT_WORKER_CAP, max(1, cpu_count - 2)))
    source_reports = [process_source(source, worker_cap) for source in sources]

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "direct-text full extraction only",
        "meaningAuthoringPerformed": False,
        "runtimeOntologyChanged": False,
        "boundaryContentChanged": False,
        "ocrSourcesProcessed": False,
        "finalMergedCorpusBuilt": False,
        "workerCap": worker_cap,
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
            "root": windows_path(OUTPUT_ROOT),
            "rawPagesDir": windows_path(RAW_PAGES_DIR),
            "segmentationDir": windows_path(SEGMENTATION_DIR),
            "checkpointsDir": windows_path(CHECKPOINTS_DIR),
            "summary": windows_path(EXTRACTION_SUMMARY_PATH),
            "qualityReport": windows_path(QUALITY_REPORT_PATH),
            "tuningNotes": windows_path(TUNING_NOTES_PATH),
        },
    }

    QUALITY_REPORT_PATH.write_text(
        json.dumps(report, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )
    EXTRACTION_SUMMARY_PATH.write_text(build_summary_report(report), encoding="utf-8")
    TUNING_NOTES_PATH.write_text(build_tuning_notes(), encoding="utf-8")

    print(f"Wrote {windows_path(EXTRACTION_SUMMARY_PATH)}")
    print(f"Wrote {windows_path(QUALITY_REPORT_PATH)}")
    print(f"Wrote {windows_path(TUNING_NOTES_PATH)}")
    print(f"Wrote {windows_path(RAW_PAGES_DIR)}")
    print(f"Wrote {windows_path(SEGMENTATION_DIR)}")
    print(f"Wrote {windows_path(CHECKPOINTS_DIR)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
