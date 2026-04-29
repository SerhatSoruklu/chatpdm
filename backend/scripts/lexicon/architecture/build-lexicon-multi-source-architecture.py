#!/usr/bin/env python3
"""Build staged multi-source lexicon extraction architecture artifacts."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz


WORKSPACE_ROOT = Path("/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons")
OUTPUT_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "multi_source"
SOURCE_REGISTRY_DIR = OUTPUT_ROOT / "source_registry"
RAW_PAGES_DIR = OUTPUT_ROOT / "raw_pages"
ENTRY_CANDIDATES_DIR = OUTPUT_ROOT / "entry_candidates"
ALIGNMENT_DIR = OUTPUT_ROOT / "alignment"
REPORTS_DIR = OUTPUT_ROOT / "reports"
OCR_BACKLOG_DIR = OUTPUT_ROOT / "ocr_backlog"

SOURCE_REGISTRY_PATH = SOURCE_REGISTRY_DIR / "source_registry.json"
ARCHITECTURE_REPORT_PATH = REPORTS_DIR / "multi_source_architecture_report.md"
SCHEMA_SPEC_PATH = REPORTS_DIR / "schema_spec.md"
READINESS_REPORT_PATH = REPORTS_DIR / "all_source_readiness_report.json"
LANE_ORDER_PATH = REPORTS_DIR / "recommended_lane_order.md"
OCR_BACKLOG_PATH = OCR_BACKLOG_DIR / "ocr_backlog.json"

DIRECT_TEXT_QUALITY_REPORT_PATH = (
    WORKSPACE_ROOT
    / "vocabulary_reference_lexicons"
    / "direct_text"
    / "reports"
    / "extraction_quality_report.json"
)
BOUVIER_QUALITY_REPORT_PATH = (
    WORKSPACE_ROOT
    / "vocabulary_reference_lexicons"
    / "bouvier_comparator_prep"
    / "reports"
    / "bouvier_comparator_quality_report.json"
)

WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
HEADWORD_PATTERN = re.compile(r"^[A-Z][A-Z0-9 '&.,/-]{1,80}(?:\.|:)?(?:\s|$)")
CONTROL_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")


@dataclass(frozen=True)
class SourceSpec:
    source_id: str
    source_group_id: str
    source_title: str
    year: int
    volume: str | int | None
    folder_name: str
    likely_main_file: str
    notes: str


SOURCE_SPECS: tuple[SourceSpec, ...] = (
    SourceSpec(
        "blacks_1910",
        "black",
        "Black's Law Dictionary, 2nd Edition",
        1910,
        None,
        "blacks_law_dictionary_2nd_edition_1910",
        "blackx27s-law-dictionary-2nd-edition-1910_compress.pdf",
        "Current active direct-text lane with completed full page extraction.",
    ),
    SourceSpec(
        "black_1891_a",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "A",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_a.pdf",
        "Current active direct-text lane, split volume A.",
    ),
    SourceSpec(
        "black_1891_b",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "B",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_b.pdf",
        "Current active direct-text lane, split volume B.",
    ),
    SourceSpec(
        "black_1891_c",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "C",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_c.pdf",
        "Current active direct-text lane, split volume C.",
    ),
    SourceSpec(
        "black_1891_d-e",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "D-E",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_d_e.pdf",
        "Current active direct-text lane, split volume D-E.",
    ),
    SourceSpec(
        "black_1891_f-h",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "F-H",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_f_h.pdf",
        "Current active direct-text lane, split volume F-H.",
    ),
    SourceSpec(
        "black_1891_i-j",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "I-J",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_i_j.pdf",
        "Current active direct-text lane, split volume I-J.",
    ),
    SourceSpec(
        "black_1891_k-m",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "K-M",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_k_m.pdf",
        "Current active direct-text lane, split volume K-M.",
    ),
    SourceSpec(
        "black_1891_n-o",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "N-O",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_n_o.pdf",
        "Current active direct-text lane, split volume N-O.",
    ),
    SourceSpec(
        "black_1891_p-q",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "P-Q",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_p_q.pdf",
        "Current active direct-text lane, split volume P-Q.",
    ),
    SourceSpec(
        "black_1891_r-s",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "R-S",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_r_s.pdf",
        "Current active direct-text lane, split volume R-S.",
    ),
    SourceSpec(
        "black_1891_t-z",
        "black_1891",
        "A Dictionary of Law",
        1891,
        "T-Z",
        "dictionary_of_black_1891",
        "dictionary_of_black_1891_00_t_z.pdf",
        "Current active direct-text lane, split volume T-Z.",
    ),
    SourceSpec(
        "bouvier_1839_v1",
        "bouvier_1839",
        "Bouvier's Law Dictionary",
        1839,
        1,
        "bouviers_law_dictionary_1839_vol_1",
        "bouvierlawdictionary01.pdf",
        "Comparator candidate, but prior proof found OCR required.",
    ),
    SourceSpec(
        "bouvier_1839_v2",
        "bouvier_1839",
        "Bouvier's Law Dictionary",
        1839,
        2,
        "bouviers_law_dictionary_1839_vol_2",
        "bouvierlawdictionary02.pdf",
        "Comparator candidate, but prior proof found OCR required.",
    ),
    SourceSpec(
        "ballentine_1916",
        "ballentine_1916",
        "Ballentine's Law Dictionary",
        1916,
        None,
        "ballentines_law_dictionary_1916_first_edition",
        "lawdictionar_ball_1916_00.pdf",
        "OCR-first source in the original audit.",
    ),
    SourceSpec(
        "burrill_1860",
        "burrill_1860",
        "A Law Dictionary and Glossary",
        1860,
        None,
        "burrill_a_law_dictionary_and_glossary_1860",
        "lawdictionar_burr_1860_00.pdf",
        "OCR-first source in the original audit.",
    ),
    SourceSpec(
        "wharton_1883",
        "wharton_1883",
        "Wharton's Law Lexicon",
        1883,
        None,
        "whartons_law_lexicon_1883",
        "WHARTONS_LAW-LEXICON-1883.pdf",
        "Newly included comparator candidate.",
    ),
    SourceSpec(
        "anderson_1889",
        "anderson_1889",
        "Anderson's Law Dictionary",
        1889,
        None,
        "andersons_law_dictionary_1889",
        "Andersons_Law _Dictionary.pdf",
        "Newly included comparator candidate.",
    ),
    SourceSpec(
        "stroud_1903",
        "stroud_1903",
        "Stroud's Judicial Dictionary",
        1903,
        None,
        "strouds_judicial_dictionary_1903",
        "Strouds_Judicial_Dictionary.pdf",
        "Newly included comparator candidate.",
    ),
    SourceSpec(
        "osborn_1927",
        "osborn_1927",
        "A Concise Law Dictionary",
        1927,
        None,
        "osborns_a_concise_law_dictionary_1927",
        "A_Concise_Law_DictionaryOsbornP.G.pdf",
        "Newly included concise comparator candidate.",
    ),
)


def windows_path(file_path: Path) -> str:
    value = str(file_path)
    if value.startswith("/mnt/c/"):
        return "C:\\" + value[len("/mnt/c/") :].replace("/", "\\")
    return value


def read_json_if_present(file_path: Path) -> Any | None:
    if not file_path.exists():
        return None
    return json.loads(file_path.read_text(encoding="utf-8"))


def write_json(file_path: Path, value: Any) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def sample_pages(page_count: int) -> list[int]:
    if page_count <= 0:
        return []
    candidates = [
        max(1, int(page_count * 0.08)),
        max(1, int(page_count * 0.18)),
        max(1, int(page_count * 0.36)),
        max(1, int(page_count * 0.55)),
        max(1, int(page_count * 0.74)),
        max(1, int(page_count * 0.9)),
    ]
    return sorted(dict.fromkeys(min(page_count, candidate) for candidate in candidates))


def count_headword_candidates(text: str) -> int:
    lines = [normalize_space(line.replace("\ufffd", "")) for line in text.splitlines()]
    return sum(1 for line in lines if HEADWORD_PATTERN.match(line) and len(line) <= 90)


def assess_pdf(source_file_path: Path) -> dict[str, Any]:
    if not source_file_path.exists():
        return {
            "available": False,
            "pageCount": 0,
            "sampledPages": [],
            "averageChars": 0,
            "averageWords": 0,
            "averageHeadwordCandidates": 0,
            "averageImages": 0,
            "averageControlCharRatio": 0,
            "sampleMetrics": [],
        }

    sample_metrics: list[dict[str, Any]] = []
    with fitz.open(source_file_path) as document:
        page_count = document.page_count
        for page_number in sample_pages(page_count):
            page = document.load_page(page_number - 1)
            raw_text = page.get_text("text") or ""
            char_count = len(raw_text)
            control_count = len(CONTROL_PATTERN.findall(raw_text))
            word_count = len(WORD_PATTERN.findall(raw_text))
            sample_metrics.append(
                {
                    "page": page_number,
                    "charCount": char_count,
                    "wordCount": word_count,
                    "headwordCandidateCount": count_headword_candidates(raw_text),
                    "imageCount": len(page.get_images(full=True)),
                    "controlCharRatio": round(control_count / char_count, 4) if char_count else 0,
                    "textPreview": normalize_space(raw_text[:220]),
                }
            )

    divisor = len(sample_metrics) or 1
    return {
        "available": True,
        "pageCount": page_count,
        "sampledPages": [metric["page"] for metric in sample_metrics],
        "averageChars": round(sum(metric["charCount"] for metric in sample_metrics) / divisor, 2),
        "averageWords": round(sum(metric["wordCount"] for metric in sample_metrics) / divisor, 2),
        "averageHeadwordCandidates": round(
            sum(metric["headwordCandidateCount"] for metric in sample_metrics) / divisor,
            2,
        ),
        "averageImages": round(sum(metric["imageCount"] for metric in sample_metrics) / divisor, 2),
        "averageControlCharRatio": round(
            sum(metric["controlCharRatio"] for metric in sample_metrics) / divisor,
            4,
        ),
        "sampleMetrics": sample_metrics,
    }


def direct_text_evidence_by_source() -> dict[str, dict[str, Any]]:
    payload = read_json_if_present(DIRECT_TEXT_QUALITY_REPORT_PATH)
    if not payload:
        return {}
    return {source["sourceId"]: source for source in payload.get("sources", [])}


def bouvier_evidence_by_source() -> dict[str, dict[str, Any]]:
    payload = read_json_if_present(BOUVIER_QUALITY_REPORT_PATH)
    if not payload:
        return {}
    return {source["sourceId"]: source for source in payload.get("sources", [])}


def classify_from_sample(metrics: dict[str, Any]) -> tuple[str, str, str, str]:
    average_words = metrics["averageWords"]
    average_candidates = metrics["averageHeadwordCandidates"]
    control_ratio = metrics["averageControlCharRatio"]

    if average_words >= 180 and average_candidates >= 3 and control_ratio < 0.02:
        return ("direct_text", "comparator_ready", "provisional", "ready_for_direct_text")
    if average_words >= 80 and control_ratio < 0.05:
        return ("mixed", "usable_with_tuning", "provisional", "usable_with_tuning")
    if average_words >= 20 and control_ratio < 0.08:
        return ("mixed", "usable_with_tuning", "noisy", "usable_with_tuning")
    return ("ocr", "ocr_required", "noisy", "ocr_required")


def build_source_record(
    spec: SourceSpec,
    direct_text_evidence: dict[str, dict[str, Any]],
    bouvier_evidence: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    folder_path = WORKSPACE_ROOT / spec.folder_name
    source_file_path = folder_path / spec.likely_main_file
    metrics = assess_pdf(source_file_path)
    extraction_mode, readiness_status, quality_tier, readiness_class = classify_from_sample(metrics)
    prior_evidence = "bounded_pymupdf_sample"

    if spec.source_id in direct_text_evidence:
        evidence = direct_text_evidence[spec.source_id]
        extraction_mode = "direct_text"
        readiness_status = "active"
        quality_tier = "proven_clean"
        readiness_class = "ready_for_direct_text"
        prior_evidence = "full_black_direct_text_extraction"
        metrics["pageCount"] = evidence.get("expectedPageCount", metrics["pageCount"])
        metrics["fullExtraction"] = {
            "extractedPageCount": evidence.get("extractedPageCount"),
            "segmentationCandidateCount": evidence.get("segmentationCandidateCount"),
            "suspiciousCandidateRatio": evidence.get("suspiciousCandidateRatio"),
        }

    if spec.source_id in bouvier_evidence:
        evidence = bouvier_evidence[spec.source_id]
        extraction_mode = "ocr"
        readiness_status = "ocr_required"
        quality_tier = "noisy"
        readiness_class = "ocr_required"
        prior_evidence = "bouvier_comparator_direct_text_failure"
        metrics["pageCount"] = evidence.get("pageCount", metrics["pageCount"])
        metrics["bouvierProof"] = {
            "headwordCandidateCount": evidence.get("headwordCandidateCount"),
            "recognizedWords": evidence.get("totalWords"),
            "segmentationAssessment": evidence.get("segmentationAssessment"),
            "comparatorReadiness": evidence.get("comparatorReadiness"),
        }

    return {
        "sourceId": spec.source_id,
        "sourceGroupId": spec.source_group_id,
        "sourceTitle": spec.source_title,
        "year": spec.year,
        "volume": spec.volume,
        "folderPath": windows_path(folder_path),
        "wslFolderPath": str(folder_path),
        "likelyMainFile": spec.likely_main_file,
        "sourceFile": windows_path(source_file_path),
        "wslSourceFile": str(source_file_path),
        "pageCount": metrics["pageCount"],
        "extractionMode": extraction_mode,
        "readinessStatus": readiness_status,
        "sourceQualityTier": quality_tier,
        "readinessClass": readiness_class,
        "notes": spec.notes,
        "priorEvidence": prior_evidence,
        "boundedSample": {
            "available": metrics["available"],
            "sampledPages": metrics["sampledPages"],
            "averageChars": metrics["averageChars"],
            "averageWords": metrics["averageWords"],
            "averageHeadwordCandidates": metrics["averageHeadwordCandidates"],
            "averageImages": metrics["averageImages"],
            "averageControlCharRatio": metrics["averageControlCharRatio"],
            "sampleMetrics": metrics["sampleMetrics"],
        },
        **({"fullExtraction": metrics["fullExtraction"]} if "fullExtraction" in metrics else {}),
        **({"bouvierProof": metrics["bouvierProof"]} if "bouvierProof" in metrics else {}),
    }


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows],
        ]
    )


def build_schema_spec() -> str:
    return "\n".join(
        [
            "# Multi-Source Lexicon Schema Specification",
            "",
            "Scope: staged source extraction and alignment only. These schemas preserve source/file/page provenance and do not author meanings or build a merged corpus.",
            "",
            "## Source Registry Record",
            "",
            "```json",
            json.dumps(
                {
                    "sourceId": "string",
                    "sourceGroupId": "string",
                    "sourceTitle": "string",
                    "year": 0,
                    "volume": "string|number|null",
                    "folderPath": "string",
                    "wslFolderPath": "string",
                    "likelyMainFile": "string",
                    "sourceFile": "string",
                    "wslSourceFile": "string",
                    "pageCount": 0,
                    "extractionMode": "direct_text|mixed|ocr",
                    "readinessStatus": "active|comparator_ready|usable_with_tuning|ocr_required|parked",
                    "sourceQualityTier": "proven_clean|provisional|noisy",
                    "readinessClass": "ready_for_direct_text|usable_with_tuning|ocr_required|not_ready_with_current_tooling",
                    "notes": "string",
                    "priorEvidence": "string",
                },
                indent=2,
            ),
            "```",
            "",
            "## Raw Page NDJSON Record",
            "",
            "```json",
            json.dumps(
                {
                    "id": "sourceId::page::1",
                    "sourceId": "string",
                    "sourceTitle": "string",
                    "year": 0,
                    "volume": None,
                    "sourceFile": "string",
                    "page": 1,
                    "rawText": "string",
                    "cleanText": "string",
                    "extractionMode": "direct_text|mixed|ocr",
                    "extractionQuality": "good|mixed|poor",
                    "parseConfidence": "high|medium|low",
                },
                indent=2,
            ),
            "```",
            "",
            "## Entry Candidate NDJSON Record",
            "",
            "```json",
            json.dumps(
                {
                    "id": "sourceId::page::1::entry::1",
                    "sourceId": "string",
                    "page": 1,
                    "headword": "string",
                    "normalizedHeadword": "string",
                    "snippet": "string",
                    "parseConfidence": "high|medium|low",
                    "sourceQualityTier": "proven_clean|provisional|noisy",
                    "extractionMode": "direct_text|mixed|ocr",
                },
                indent=2,
            ),
            "```",
            "",
            "## Alignment NDJSON Record",
            "",
            "```json",
            json.dumps(
                {
                    "id": "boundaryTerm::sourceId::headword",
                    "boundaryTerm": "string",
                    "normalizedBoundaryTerm": "string",
                    "sourceId": "string",
                    "sourceTitle": "string",
                    "year": 0,
                    "volume": None,
                    "sourceFile": "string",
                    "page": 1,
                    "headword": "string",
                    "normalizedHeadword": "string",
                    "matchStatus": "exact_normalized_match|alias_assisted_match|probable_review_match|no_match",
                    "supportingSnippet": "string",
                    "parseConfidence": "high|medium|low",
                    "sourceQualityTier": "proven_clean|provisional|noisy",
                },
                indent=2,
            ),
            "```",
            "",
            "## Authored Meaning Provenance",
            "",
            "```json",
            json.dumps(
                {
                    "meaningSources": [
                        {
                            "sourceId": "string",
                            "sourceTitle": "string",
                            "year": 0,
                            "page": 1,
                            "supportNote": "string",
                            "referenceRole": "supporting_lexicon_reference",
                        }
                    ]
                },
                indent=2,
            ),
            "```",
            "",
            "## Provenance Rules",
            "",
            "- Store provenance beside each authored boundary meaning at the exact reviewed term surface.",
            "- Do not fan out provenance to alias surfaces unless that alias row was explicitly aligned and reviewed.",
            "- Keep source records separated by `sourceId`; no final merged corpus is created in this phase.",
            "- Use `referenceRole` to distinguish supporting lexicon references from runtime ontology admission.",
            "",
        ]
    )


def group_counts(records: list[dict[str, Any]], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for record in records:
        value = str(record[key])
        counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items()))


def choose_next_comparator(records: list[dict[str, Any]]) -> str:
    candidates = [
        record
        for record in records
        if record["sourceGroupId"] not in {"black", "black_1891"}
        and record["readinessClass"] in {"ready_for_direct_text", "usable_with_tuning"}
    ]
    ranked = sorted(
        candidates,
        key=lambda record: (
            0 if record["sourceQualityTier"] == "proven_clean" else 1 if record["sourceQualityTier"] == "provisional" else 2,
            0 if record["readinessClass"] == "ready_for_direct_text" else 1,
            -record["boundedSample"]["averageWords"],
            record["year"],
        ),
    )
    return ranked[0]["sourceId"] if ranked else "none_ready"


def build_architecture_report(records: list[dict[str, Any]], next_comparator: str) -> str:
    rows = [
        [
            record["sourceId"],
            record["sourceTitle"],
            record["year"],
            record["volume"] if record["volume"] is not None else "-",
            record["pageCount"],
            record["extractionMode"],
            record["readinessClass"],
            record["sourceQualityTier"],
        ]
        for record in records
    ]

    return "\n".join(
        [
            "# Multi-Source Lexicon Extraction Architecture",
            "",
            "Scope: architecture and bounded readiness mapping for all in-scope lexicon books. No meanings were authored, no live vocabulary dataset was changed, no runtime ontology or concept packets were modified, and no final merged corpus was built.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: source registry model, staged corpus layout, canonical schemas, all-source readiness map, OCR backlog, and lane recommendations.",
            "- Partial: non-Black readiness is based on bounded PyMuPDF sampling only; it is not full extraction proof.",
            "- Missing: OCR setup, OCR page extraction, per-source segmentation tuning for non-Black sources, multi-source alignment proof, and final merged authoring corpus.",
            "- Not evidenced: legal meaning accuracy, modern source sufficiency, or source coverage for all boundary terms.",
            "",
            "## Staged Corpus Layout",
            "",
            f"- Source registry: `{windows_path(SOURCE_REGISTRY_DIR)}`",
            f"- Raw pages: `{windows_path(RAW_PAGES_DIR)}`",
            f"- Entry candidates: `{windows_path(ENTRY_CANDIDATES_DIR)}`",
            f"- Alignment: `{windows_path(ALIGNMENT_DIR)}`",
            f"- Reports: `{windows_path(REPORTS_DIR)}`",
            f"- OCR backlog: `{windows_path(OCR_BACKLOG_DIR)}`",
            "",
            "Each extraction lane must write per-source files such as `raw_pages/{sourceId}.pages.ndjson`, `entry_candidates/{sourceId}.entry_candidates.ndjson`, and `alignment/{sourceId}.alignment.ndjson`. The architecture intentionally avoids flattening all sources into one undifferentiated corpus.",
            "",
            "## Source Readiness",
            "",
            markdown_table(
                [
                    "Source ID",
                    "Title",
                    "Year",
                    "Volume",
                    "Pages",
                    "Mode",
                    "Readiness",
                    "Quality tier",
                ],
                rows,
            ),
            "",
            "## Lane Recommendation",
            "",
            "- Current active authoring lane: Black 1910 plus Black 1891 split PDFs.",
            f"- Next comparator lane: `{next_comparator}`.",
            "- OCR backlog remains separate until OCR tooling is installed and validated.",
            "- Do not start a full merged multi-source corpus yet; add one comparator lane at a time.",
            "",
            "## Provenance Discipline",
            "",
            "- Future authoring batches should persist `meaningSources` beside `meaningInLaw` for each exact reviewed term.",
            "- Source provenance must include source ID, source title, year, page, support note, and reference role.",
            "- Alias surfaces must not inherit provenance unless the alias row is explicitly mapped and reviewed.",
            "- UI copy should continue to label source metadata as reference-only and not runtime ontology admission.",
            "",
        ]
    )


def build_lane_order_report(records: list[dict[str, Any]], next_comparator: str) -> str:
    ocr_rows = [
        [record["sourceId"], record["sourceTitle"], record["year"], record["pageCount"]]
        for record in records
        if record["readinessClass"] == "ocr_required"
    ]
    usable_rows = [
        [record["sourceId"], record["sourceTitle"], record["year"], record["readinessClass"], record["sourceQualityTier"]]
        for record in records
        if record["sourceGroupId"] not in {"black", "black_1891"}
        and record["readinessClass"] in {"ready_for_direct_text", "usable_with_tuning"}
    ]

    return "\n".join(
        [
            "# Recommended Multi-Source Lane Order",
            "",
            "## Active Now",
            "",
            "- `blacks_1910`",
            "- `black_1891_*` split PDFs",
            "",
            "## Next Comparator",
            "",
            f"- `{next_comparator}` should be prepared first as a bounded comparator lane, because it is the best non-Black candidate under current direct-text tooling.",
            "",
            "## Non-Black Direct/Mixed Candidates",
            "",
            markdown_table(["Source ID", "Title", "Year", "Readiness", "Quality tier"], usable_rows)
            if usable_rows
            else "No non-Black direct/mixed candidates passed bounded sampling.",
            "",
            "## OCR Backlog",
            "",
            markdown_table(["Source ID", "Title", "Year", "Pages"], ocr_rows)
            if ocr_rows
            else "No OCR backlog sources identified.",
            "",
            "## Recommendation",
            "",
            "- Batch 004 can continue with Black-backed references while the next comparator lane is proofed.",
            "- Full extraction should start only for the selected non-Black comparator after a small segmentation proof passes.",
            "- OCR sources should wait for a separate OCR setup/proof task with Tesseract or an equivalent local OCR path.",
            "",
        ]
    )


def command_available(command: str) -> bool:
    return shutil.which(command) is not None


def validate_generated_json(paths: list[Path]) -> None:
    for file_path in paths:
        json.loads(file_path.read_text(encoding="utf-8"))


def main() -> int:
    for directory in [
        SOURCE_REGISTRY_DIR,
        RAW_PAGES_DIR,
        ENTRY_CANDIDATES_DIR,
        ALIGNMENT_DIR,
        REPORTS_DIR,
        OCR_BACKLOG_DIR,
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    direct_text_evidence = direct_text_evidence_by_source()
    bouvier_evidence = bouvier_evidence_by_source()
    records = [
        build_source_record(spec, direct_text_evidence, bouvier_evidence)
        for spec in SOURCE_SPECS
    ]
    records = sorted(records, key=lambda record: (record["sourceGroupId"], record["sourceId"]))
    next_comparator = choose_next_comparator(records)
    generated_at = datetime.now(timezone.utc).isoformat()

    source_registry = {
        "generatedAt": generated_at,
        "schemaVersion": "multi_source_source_registry_v1",
        "workspaceRoot": windows_path(WORKSPACE_ROOT),
        "wslWorkspaceRoot": str(WORKSPACE_ROOT),
        "records": records,
    }
    readiness_report = {
        "generatedAt": generated_at,
        "scope": "all in-scope lexicon sources, bounded direct-text readiness only",
        "meaningAuthoringPerformed": False,
        "liveVocabularyDatasetChanged": False,
        "runtimeOntologyChanged": False,
        "conceptPacketsChanged": False,
        "finalMergedCorpusBuilt": False,
        "tooling": {
            "pymupdf": True,
            "tesseract": command_available("tesseract"),
            "pdftotext": command_available("pdftotext"),
            "pdfinfo": command_available("pdfinfo"),
        },
        "counts": {
            "sourceRecordCount": len(records),
            "byReadinessClass": group_counts(records, "readinessClass"),
            "byExtractionMode": group_counts(records, "extractionMode"),
            "bySourceQualityTier": group_counts(records, "sourceQualityTier"),
        },
        "nextComparatorLane": next_comparator,
        "sources": records,
    }
    ocr_backlog = {
        "generatedAt": generated_at,
        "sources": [
            record
            for record in records
            if record["readinessClass"] == "ocr_required"
        ],
    }

    write_json(SOURCE_REGISTRY_PATH, source_registry)
    write_json(READINESS_REPORT_PATH, readiness_report)
    write_json(OCR_BACKLOG_PATH, ocr_backlog)
    ARCHITECTURE_REPORT_PATH.write_text(
        build_architecture_report(records, next_comparator),
        encoding="utf-8",
    )
    SCHEMA_SPEC_PATH.write_text(build_schema_spec(), encoding="utf-8")
    LANE_ORDER_PATH.write_text(build_lane_order_report(records, next_comparator), encoding="utf-8")

    validate_generated_json([SOURCE_REGISTRY_PATH, READINESS_REPORT_PATH, OCR_BACKLOG_PATH])
    subprocess.run(
        ["python3", "-m", "py_compile", str(Path(__file__))],
        check=True,
        cwd=Path(__file__).resolve().parents[4],
    )

    for file_path in [
        ARCHITECTURE_REPORT_PATH,
        SOURCE_REGISTRY_PATH,
        SCHEMA_SPEC_PATH,
        READINESS_REPORT_PATH,
        LANE_ORDER_PATH,
        OCR_BACKLOG_PATH,
    ]:
        print(f"Wrote {windows_path(file_path)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
