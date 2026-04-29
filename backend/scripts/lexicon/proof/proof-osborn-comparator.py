#!/usr/bin/env python3
"""Run a bounded Osborn 1927 comparator proof for boundary vocabulary terms."""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz


REPO_ROOT = Path(__file__).resolve().parents[4]
WORKSPACE_ROOT = Path("/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons")
MULTI_SOURCE_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "multi_source"
SOURCE_REGISTRY_PATH = MULTI_SOURCE_ROOT / "source_registry" / "source_registry.json"
SCHEMA_SPEC_PATH = MULTI_SOURCE_ROOT / "reports" / "schema_spec.md"
SOURCE_READINESS_PATH = MULTI_SOURCE_ROOT / "reports" / "all_source_readiness_report.json"
ANDERSON_ALIGNMENT_PATH = MULTI_SOURCE_ROOT / "alignment" / "anderson_1889.boundary_alignment.ndjson"

RAW_PAGES_DIR = MULTI_SOURCE_ROOT / "raw_pages"
ENTRY_CANDIDATES_DIR = MULTI_SOURCE_ROOT / "entry_candidates"
ALIGNMENT_DIR = MULTI_SOURCE_ROOT / "alignment"
REPORTS_DIR = MULTI_SOURCE_ROOT / "reports"

RAW_PAGES_OUTPUT = RAW_PAGES_DIR / "osborn_1927.proof.pages.ndjson"
ENTRY_CANDIDATES_OUTPUT = ENTRY_CANDIDATES_DIR / "osborn_1927.proof.entry_candidates.ndjson"
ALIGNMENT_OUTPUT = ALIGNMENT_DIR / "osborn_1927.proof.alignment.ndjson"
QUALITY_REPORT_OUTPUT = REPORTS_DIR / "osborn_1927_comparator_quality_report.json"
SUMMARY_OUTPUT = REPORTS_DIR / "osborn_1927_comparator_proof_report.md"

DATASET_PATH = REPO_ROOT / "data" / "legal-vocabulary" / "legal-vocabulary-dataset.txt"
DUPLICATE_GROUPS_PATH = REPO_ROOT / "docs" / "boundary" / "duplicate-term-groups.json"
DRAFT_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "draft_meanings"
MULTI_SOURCE_REPORTS_ROOT = MULTI_SOURCE_ROOT / "reports"

SOURCE_ID = "osborn_1927"
MAX_TARGET_PAGES = 24
MAX_TOTAL_PAGES = 30
MIN_DICTIONARY_PAGE = 35

WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
CONTROL_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
TITLE_HEADWORD_PATTERN = re.compile(r"^(?P<headword>[A-Z][A-Za-z][A-Za-z '&/-]{1,80})\.(?:\s+|$)")
INLINE_TITLE_HEADWORD_PATTERN = re.compile(
    r"(?:(?<=\s)|^)(?P<headword>[A-Z][A-Za-z][A-Za-z '&/-]{1,80})\.\s+"
)
UPPER_HEADWORD_PATTERN = re.compile(r"^(?P<headword>[A-Z][A-Z0-9 '&,./-]{2,80})(?:[.:]|\s{2,}|$)")
PAGE_HEADER_PATTERN = re.compile(
    r"^(?:[A-Z]{2,4}\s+){1,3}(?:\(\s*\d+\s*\)\s*)?(?:[A-Z]{2,4}\s*){0,3}$"
)
CITATION_FRAGMENT_PATTERN = re.compile(r"^(?:v\.|V\.|[0-9]|\(|Law Rep\.|L\. R\.|[A-Z]\.)")

CONNECTOR_HEADWORDS = {
    "A",
    "AN",
    "AND",
    "AS",
    "BY",
    "FOR",
    "IN",
    "OF",
    "ON",
    "OR",
    "PAGE",
    "SEE",
    "THE",
    "TO",
}

REPORTER_FRAGMENT_HEADWORDS = {
    "A C",
    "ALL E R",
    "B",
    "C",
    "CH",
    "K B",
    "LAW REP",
    "L J",
    "L R",
    "Q B",
    "T L R",
    "W N",
}


def windows_path(file_path: Path) -> str:
    value = str(file_path)
    if value.startswith("/mnt/c/"):
        return "C:\\" + value[len("/mnt/c/") :].replace("/", "\\")
    return value


def read_json(file_path: Path) -> Any:
    return json.loads(file_path.read_text(encoding="utf-8"))


def write_json(file_path: Path, value: Any) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def write_ndjson(file_path: Path, records: list[dict[str, Any]]) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with file_path.open("w", encoding="utf-8") as output:
        for record in records:
            output.write(json.dumps(record, ensure_ascii=True, sort_keys=True) + "\n")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_for_comparison(value: str) -> str:
    return re.sub(
        r"\s+",
        " ",
        re.sub(r"[_-]+", " ", value.lower())
        .strip()
        .strip(".,;:()[]{}'\""),
    )


def normalize_for_search(value: str) -> str:
    return normalize_space(re.sub(r"[^a-z0-9]+", " ", value.lower().replace("_", " ")))


def clean_text(value: str) -> str:
    return "\n".join(
        line.strip().replace("\ufffd", "")
        for line in value.splitlines()
        if line.strip()
    )


def count_words(value: str) -> int:
    return len(WORD_PATTERN.findall(value))


def classify_page(text: str) -> tuple[str, str]:
    char_count = len(text)
    word_count = count_words(text)
    control_count = len(CONTROL_PATTERN.findall(text))
    control_ratio = control_count / char_count if char_count else 1

    if char_count >= 1800 and word_count >= 180 and control_ratio < 0.01:
        return "good", "high"
    if char_count >= 700 and word_count >= 80 and control_ratio < 0.04:
        return "mixed", "medium"
    return "poor", "low"


def load_source_record() -> dict[str, Any]:
    payload = read_json(SOURCE_REGISTRY_PATH)
    source = next(
        (record for record in payload["records"] if record["sourceId"] == SOURCE_ID),
        None,
    )
    if not source:
        raise RuntimeError(f"Missing {SOURCE_ID} in {SOURCE_REGISTRY_PATH}")
    return source


def parse_boundary_registry() -> dict[str, dict[str, str]]:
    header_to_classification = {
        "CORE / GOVERNANCE": "unknown_structure",
        "AUTHORITY / VALIDITY / INSTITUTIONAL STATUS": "derived",
        "POWER / FORCE / CONTROL": "derived",
        "DUTY / OBLIGATION / CONSTRAINT": "derived",
        "FAILURE / BREACH / NONCOMPLIANCE": "derived",
        "RESPONSIBILITY / ATTRIBUTION / LIABILITY": "derived",
        "LAW / RULE / SOURCES": "derived",
        "PROCEDURE / ADJUDICATION": "procedural",
        "REMEDIES / RESPONSES / OUTCOMES": "procedural",
        "CONTRACT / AGREEMENT / CONSENSUS": "derived",
        "PROPERTY / TITLE / POSSESSION": "carrier",
        "COMMERCE / FINANCE / ALLOCATION": "carrier",
        "CRIMINAL / PUBLIC ORDER": "derived",
        "DEFENCES / JUSTIFICATIONS / EXCUSES": "derived",
        "EVIDENCE / PROOF / EPISTEMIC": "procedural",
        "STATUS / PERSON / RELATION": "carrier",
        "LABOR / ORGANIZATIONAL / ASSOCIATIONAL": "carrier",
        "CONSTITUTIONAL / POLITICAL": "derived",
        "META / STRESS / EDGE TERMS": "unknown_structure",
    }
    explicit_classification_overrides = {
        "claim": "rejected_candidate",
        "defeasibility": "rejected_candidate",
        "enforcement": "rejected_candidate",
        "jurisdiction": "rejected_candidate",
        "liability": "rejected_candidate",
        "obligation": "rejected_candidate",
    }
    registry: dict[str, dict[str, str]] = {}
    active_family: str | None = None
    active_classification: str | None = None

    for raw_line in DATASET_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        header_match = re.match(r"^\[(.+)]$", line)
        if header_match:
            active_family = header_match.group(1)
            active_classification = header_to_classification[active_family]
            continue
        if active_family is None or active_classification is None:
            raise RuntimeError("Boundary dataset term appeared before a header.")

        normalized = normalize_for_comparison(line)
        registry[normalized] = {
            "term": line,
            "normalizedTerm": normalized,
            "family": active_family,
            "classification": explicit_classification_overrides.get(normalized, active_classification),
        }
        if "_" in line:
            spaced = normalize_for_comparison(line.replace("_", " "))
            registry.setdefault(
                spaced,
                {
                    "term": line,
                    "normalizedTerm": spaced,
                    "family": active_family,
                    "classification": explicit_classification_overrides.get(spaced, active_classification),
                },
            )

    return registry


def add_target(targets: dict[str, dict[str, Any]], term: str, reason: str, priority: int) -> None:
    normalized = normalize_for_comparison(term)
    existing = targets.get(normalized)
    if existing:
        existing["reasons"] = sorted(set([*existing["reasons"], reason]))
        existing["priority"] = min(existing["priority"], priority)
        return
    targets[normalized] = {
        "term": term,
        "normalizedTerm": normalized,
        "reasons": [reason],
        "priority": priority,
    }


def collect_review_targets() -> list[dict[str, Any]]:
    targets: dict[str, dict[str, Any]] = {}

    for batch_number in range(1, 7):
        batch = f"{batch_number:03d}"
        for lane in ("approved", "revise", "rejected"):
            file_path = DRAFT_ROOT / "review" / f"{lane}_batch_{batch}.json"
            if not file_path.exists():
                continue
            for record in read_json(file_path):
                term = record.get("term")
                if not term:
                    continue
                if record.get("reviewDecision") == "reject":
                    add_target(targets, term, f"batch_{batch}_rejected", 0)
                elif record.get("reviewDecision") == "revise":
                    add_target(targets, term, f"batch_{batch}_revised", 1)
                if record.get("historicallyNarrow") is True:
                    add_target(targets, term, f"batch_{batch}_historically_narrow", 1)
                if record.get("confidence") == "low":
                    add_target(targets, term, f"batch_{batch}_low_confidence", 2)

        skipped_path = DRAFT_ROOT / "reports" / f"batch_{batch}_skipped.json"
        if skipped_path.exists():
            for record in read_json(skipped_path):
                term = record.get("term")
                if term:
                    add_target(targets, term, f"batch_{batch}_skipped", 0)

    comparator_review_paths = [
        (MULTI_SOURCE_REPORTS_ROOT / "comparator_review_approved_reopen.json", "comparator_approved_reopen", 0),
        (MULTI_SOURCE_REPORTS_ROOT / "comparator_review_approved_revision_review.json", "comparator_revision_review", 1),
        (MULTI_SOURCE_REPORTS_ROOT / "comparator_review_still_skip.json", "comparator_still_skip", 0),
    ]
    for file_path, reason, priority in comparator_review_paths:
        if not file_path.exists():
            continue
        for record in read_json(file_path):
            term = record.get("term")
            if term:
                add_target(targets, term, reason, priority)

    registry = parse_boundary_registry()
    filtered_targets = [
        {
            **target,
            "registryRecord": registry[target["normalizedTerm"]],
        }
        for target in targets.values()
        if target["normalizedTerm"] in registry
    ]
    return sorted(filtered_targets, key=lambda target: (target["priority"], target["term"]))


def load_alias_groups() -> dict[str, set[str]]:
    if not DUPLICATE_GROUPS_PATH.exists():
        return {}
    payload = read_json(DUPLICATE_GROUPS_PATH)
    alias_groups: dict[str, set[str]] = {}

    for group in payload.get("likelyAliasGroups", []):
        aliases = {
            normalize_for_comparison(term_record["term"])
            for term_record in group.get("terms", [])
            if term_record.get("term")
        }
        for alias in aliases:
            alias_groups[alias] = aliases

    return alias_groups


def load_anderson_comparison() -> dict[str, int]:
    counts: dict[str, int] = {}
    if not ANDERSON_ALIGNMENT_PATH.exists():
        return counts
    with ANDERSON_ALIGNMENT_PATH.open("r", encoding="utf-8") as input_file:
        for line in input_file:
            if not line.strip():
                continue
            record = json.loads(line)
            normalized = record.get("normalizedBoundaryTerm")
            if normalized:
                counts[normalized] = counts.get(normalized, 0) + 1
    return counts


def likely_headword(value: str) -> bool:
    normalized = normalize_for_comparison(value).upper()
    if not normalized or len(normalized) < 3:
        return False
    return (
        normalized not in CONNECTOR_HEADWORDS
        and normalized not in REPORTER_FRAGMENT_HEADWORDS
        and not re.search(r"\d", normalized)
    )


def is_heading_fragment(value: str) -> bool:
    cleaned = normalize_space(value).strip(" .,:;")
    if not cleaned or len(cleaned) > 42:
        return False
    if re.search(r"\d", cleaned):
        return False
    words = cleaned.split()
    if len(words) > 4:
        return False
    return all(
        word.lower() in {"and", "by", "for", "in", "of", "or", "the", "to"}
        or re.match(r"^[A-Z][A-Za-z'/-]*\.?$", word)
        for word in words
    )


def extract_multiline_headword(lines: list[str], line_index: int) -> tuple[str, int] | None:
    fragments: list[str] = []

    for offset in range(0, 5):
        current_index = line_index + offset
        if current_index >= len(lines):
            break
        fragment = normalize_space(lines[current_index].replace("\ufffd", ""))
        if not is_heading_fragment(fragment):
            break
        fragments.append(fragment.strip())

        joined = normalize_space(" ".join(fragments))
        if joined.endswith("."):
            headword = joined.rstrip(".").strip()
            if likely_headword(headword):
                return (headword, offset + 1)

    return None


def extract_headword(line: str, line_index: int) -> tuple[str, str] | None:
    cleaned = normalize_space(line.replace("\ufffd", ""))
    if not cleaned or cleaned.isdigit() or len(cleaned) > 180:
        return None
    if line_index <= 2 and PAGE_HEADER_PATTERN.match(cleaned):
        return None

    title_match = TITLE_HEADWORD_PATTERN.match(cleaned)
    if title_match:
        headword = title_match.group("headword").strip(" .,:;^-/")
        trailing = cleaned[title_match.end() :]
        if likely_headword(headword) and not CITATION_FRAGMENT_PATTERN.match(trailing):
            return (headword, "titlecase_entry")

    upper_match = UPPER_HEADWORD_PATTERN.match(cleaned)
    if upper_match:
        headword = upper_match.group("headword").strip(" .,:;^-/")
        if likely_headword(headword):
            return (headword, "uppercase_entry")

    return None


def extract_inline_headword_segments(line: str) -> list[tuple[str, str]]:
    cleaned = normalize_space(line.replace("\ufffd", ""))
    segments: list[tuple[str, str]] = []
    if len(cleaned) < 12 or len(cleaned) > 900:
        return segments

    matches = list(INLINE_TITLE_HEADWORD_PATTERN.finditer(cleaned))
    for index, match in enumerate(matches):
        headword = match.group("headword").strip(" .,:;^-/")
        if not likely_headword(headword):
            continue
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(cleaned)
        snippet = cleaned[start:end]
        if count_words(snippet) >= 6:
            segments.append((headword, snippet))

    return segments


def locate_target_pages(
    document: fitz.Document,
    targets: list[dict[str, Any]],
) -> tuple[dict[str, list[int]], dict[str, list[int]]]:
    heading_page_map = {target["normalizedTerm"]: [] for target in targets}
    text_page_map = {target["normalizedTerm"]: [] for target in targets}
    pending_text = set(text_page_map)
    target_norms = set(heading_page_map)

    for page_index in range(MIN_DICTIONARY_PAGE - 1, document.page_count):
        raw_text = document.load_page(page_index).get_text("text") or ""
        page_number = page_index + 1

        lines = clean_text(raw_text).splitlines()
        for line_index, line in enumerate(lines):
            extracted = extract_headword(line, line_index)
            extracted_headwords = [extracted[0]] if extracted else []
            multiline = extract_multiline_headword(lines, line_index)
            if multiline:
                extracted_headwords.append(multiline[0])
            extracted_headwords.extend(headword for headword, _snippet in extract_inline_headword_segments(line))
            for headword in extracted_headwords:
                normalized_headword = normalize_for_comparison(headword)
                if normalized_headword in target_norms and not heading_page_map[normalized_headword]:
                    heading_page_map[normalized_headword].append(page_number)

        if pending_text:
            searchable = f" {normalize_for_search(raw_text)} "
            for normalized in sorted(pending_text):
                search_key = f" {normalize_for_search(normalized)} "
                if search_key in searchable:
                    text_page_map[normalized].append(page_number)
            pending_text = {normalized for normalized in pending_text if not text_page_map[normalized]}

    return heading_page_map, text_page_map


def choose_proof_pages(
    source: dict[str, Any],
    targets: list[dict[str, Any]],
    heading_page_map: dict[str, list[int]],
    text_page_map: dict[str, list[int]],
) -> list[int]:
    high_priority_pages: list[int] = []
    standard_pages: list[int] = []

    for target in targets:
        pages = heading_page_map.get(target["normalizedTerm"], []) or text_page_map.get(target["normalizedTerm"], [])
        if not pages:
            continue
        first_page = pages[0]
        if target["priority"] == 0:
            high_priority_pages.append(first_page)
        else:
            standard_pages.append(first_page)

    selected_target_pages = sorted(set(high_priority_pages))
    remaining_slots = max(0, MAX_TARGET_PAGES - len(selected_target_pages))
    standard_pages = sorted(set(page for page in standard_pages if page not in selected_target_pages))

    if len(standard_pages) <= remaining_slots:
        selected_target_pages.extend(standard_pages)
    elif remaining_slots > 0:
        if remaining_slots == 1:
            selected_target_pages.append(standard_pages[0])
        else:
            step = (len(standard_pages) - 1) / (remaining_slots - 1)
            for index in range(remaining_slots):
                selected_target_pages.append(standard_pages[round(index * step)])

    proof_pages = sorted(set(selected_target_pages))
    for page in source["boundedSample"]["sampledPages"]:
        if page < MIN_DICTIONARY_PAGE:
            continue
        if page not in proof_pages:
            proof_pages.append(page)
        if len(proof_pages) >= MAX_TOTAL_PAGES:
            break

    return sorted(proof_pages)


def build_page_record(source: dict[str, Any], page_number: int, text: str) -> dict[str, Any]:
    cleaned_text = clean_text(text)
    extraction_quality, parse_confidence = classify_page(text)
    return {
        "id": f"{SOURCE_ID}::page::{page_number}",
        "sourceId": source["sourceId"],
        "sourceTitle": source["sourceTitle"],
        "year": source["year"],
        "volume": source["volume"],
        "sourceFile": source["sourceFile"],
        "page": page_number,
        "rawText": text,
        "cleanText": cleaned_text,
        "extractionMode": source["extractionMode"],
        "extractionQuality": extraction_quality,
        "parseConfidence": parse_confidence,
        "charCount": len(text),
        "wordCount": count_words(text),
    }


def segment_page(source: dict[str, Any], page_record: dict[str, Any]) -> list[dict[str, Any]]:
    lines = page_record["cleanText"].splitlines()
    candidates: list[dict[str, Any]] = []

    for index, line in enumerate(lines):
        segments: list[tuple[str, str, str]] = []
        extracted = extract_headword(line, index)
        if extracted:
            headword, segmentation_rule = extracted
            following_lines = [
                normalize_space(next_line)
                for next_line in lines[index + 1 : index + 7]
                if normalize_space(next_line)
            ]
            segments.append((headword, normalize_space(" ".join([line, *following_lines]))[:460], segmentation_rule))

        multiline = extract_multiline_headword(lines, index)
        if multiline:
            headword, consumed_line_count = multiline
            following_lines = [
                normalize_space(next_line)
                for next_line in lines[index + consumed_line_count : index + consumed_line_count + 7]
                if normalize_space(next_line)
            ]
            heading_lines = [
                normalize_space(next_line)
                for next_line in lines[index : index + consumed_line_count]
                if normalize_space(next_line)
            ]
            segments.append((
                headword,
                normalize_space(" ".join([*heading_lines, *following_lines]))[:460],
                "multiline_titlecase_entry",
            ))

        for headword, snippet in extract_inline_headword_segments(line):
            if not extracted or normalize_for_comparison(headword) != normalize_for_comparison(extracted[0]):
                segments.append((headword, snippet[:460], "inline_titlecase_entry"))

        seen_on_line: set[str] = set()
        for headword, snippet, segmentation_rule in segments:
            normalized_headword = normalize_for_comparison(headword)
            if normalized_headword in seen_on_line:
                continue
            seen_on_line.add(normalized_headword)
            snippet_words = count_words(snippet)
            candidate_confidence = "high" if snippet_words >= 24 else "medium" if snippet_words >= 8 else "low"
            if page_record["parseConfidence"] == "low":
                candidate_confidence = "low"

            candidates.append(
                {
                    "id": f"{page_record['id']}::entry::{len(candidates) + 1}",
                    "sourceId": source["sourceId"],
                    "sourceTitle": source["sourceTitle"],
                    "year": source["year"],
                    "volume": source["volume"],
                    "sourceFile": source["sourceFile"],
                    "page": page_record["page"],
                    "lineNumber": index + 1,
                    "headword": headword,
                    "normalizedHeadword": normalized_headword,
                    "snippet": snippet,
                    "parseConfidence": candidate_confidence,
                    "sourceQualityTier": source["sourceQualityTier"],
                    "extractionMode": source["extractionMode"],
                    "segmentationRule": segmentation_rule,
                }
            )

    return candidates


def build_alignment_records(
    source: dict[str, Any],
    candidates: list[dict[str, Any]],
    registry: dict[str, dict[str, str]],
    targets: list[dict[str, Any]],
    alias_groups: dict[str, set[str]],
    anderson_match_counts: dict[str, int],
) -> list[dict[str, Any]]:
    targets_by_normalized = {target["normalizedTerm"]: target for target in targets}
    alignment_records: list[dict[str, Any]] = []

    for candidate in candidates:
        normalized = candidate["normalizedHeadword"]
        registry_record = registry.get(normalized)
        match_status = "exact_normalized_match"

        if not registry_record:
            for normalized_registry_term, candidate_registry_record in registry.items():
                aliases = alias_groups.get(normalized_registry_term, set())
                if normalized in aliases:
                    registry_record = candidate_registry_record
                    match_status = "alias_assisted_match"
                    break

        if not registry_record:
            for target_record in targets:
                target_normalized = target_record["normalizedTerm"]
                if normalized.startswith(f"{target_normalized} "):
                    registry_record = target_record["registryRecord"]
                    match_status = "target_prefix_headword_match"
                    break

        if not registry_record:
            continue

        normalized_boundary_term = registry_record["normalizedTerm"]
        target = targets_by_normalized.get(normalized_boundary_term)
        alignment_records.append(
            {
                "id": f"{registry_record['term']}::{candidate['id']}",
                "boundaryTerm": registry_record["term"],
                "normalizedBoundaryTerm": normalized_boundary_term,
                "boundaryFamily": registry_record["family"],
                "boundaryClassification": registry_record["classification"],
                "targetQueueMatch": target is not None,
                "targetReasons": target["reasons"] if target else [],
                "andersonAlignmentCount": anderson_match_counts.get(normalized_boundary_term, 0),
                "sourceId": source["sourceId"],
                "sourceTitle": source["sourceTitle"],
                "year": source["year"],
                "volume": source["volume"],
                "sourceFile": source["sourceFile"],
                "page": candidate["page"],
                "lineNumber": candidate["lineNumber"],
                "headword": candidate["headword"],
                "normalizedHeadword": candidate["normalizedHeadword"],
                "matchStatus": match_status,
                "supportingSnippet": candidate["snippet"],
                "parseConfidence": candidate["parseConfidence"],
                "sourceQualityTier": candidate["sourceQualityTier"],
                "extractionMode": candidate["extractionMode"],
            }
        )

    return sorted(
        alignment_records,
        key=lambda record: (record["boundaryTerm"], record["page"], record["lineNumber"]),
    )


def validate_ndjson(file_path: Path) -> int:
    count = 0
    with file_path.open("r", encoding="utf-8") as input_file:
        for line in input_file:
            if line.strip():
                json.loads(line)
                count += 1
    return count


def assess_segmentation(page_records: list[dict[str, Any]], candidates: list[dict[str, Any]]) -> str:
    if not page_records:
        return "too_noisy"

    average_candidates = len(candidates) / len(page_records)
    high_or_medium = sum(1 for candidate in candidates if candidate["parseConfidence"] in {"high", "medium"})
    confidence_ratio = high_or_medium / len(candidates) if candidates else 0
    good_pages = sum(1 for page in page_records if page["extractionQuality"] == "good")
    good_page_ratio = good_pages / len(page_records)

    if average_candidates >= 4 and confidence_ratio >= 0.75 and good_page_ratio >= 0.8:
        return "reliable"
    if average_candidates >= 2 and confidence_ratio >= 0.55 and good_page_ratio >= 0.7:
        return "usable_with_tuning"
    return "too_noisy"


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(str(cell).replace("|", "\\|") for cell in row) + " |" for row in rows],
        ]
    )


def build_summary_markdown(report: dict[str, Any]) -> str:
    aligned_rows = [
        [
            record["boundaryTerm"],
            record["headword"],
            record["page"],
            record["matchStatus"],
            record["parseConfidence"],
            record["andersonAlignmentCount"],
        ]
        for record in report["alignmentRecords"][:30]
    ]
    helped_rows = [
        [
            term,
            value["matchCount"],
            ", ".join(value["reasons"]),
            value["andersonAlignmentCount"],
            value["samplePages"],
        ]
        for term, value in list(report["helpedTargetTerms"].items())[:30]
    ]
    missing_rows = [
        [target["term"], ", ".join(target["reasons"])]
        for target in report["targetTermsNotMatched"][:40]
    ]

    return "\n".join(
        [
            "# Osborn 1927 Comparator Proof",
            "",
            "Scope: bounded comparator proof for `osborn_1927` only. No meanings were authored, no live vocabulary dataset was modified, no runtime ontology or concept packets were changed, no writeback was applied, and no final merged corpus was built.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: source-registry driven page-window extraction, page NDJSON, deterministic entry-candidate NDJSON, target-term alignment NDJSON, Anderson comparison counts, and comparator quality reporting.",
            "- Partial: page selection is bounded and candidate-level; it is not full Osborn extraction or final entry segmentation.",
            "- Missing: full page-by-page Osborn extraction, full alignment against all boundary terms, authoring review, and source writeback.",
            "- Not evidenced: legal-definition sufficiency, complete Osborn coverage, or suitability for runtime ontology admission.",
            "",
            "## Counts",
            "",
            f"- Proof pages extracted: {report['counts']['pageRecordCount']}",
            f"- Entry candidates: {report['counts']['entryCandidateCount']}",
            f"- Ambiguous/historical target terms: {report['counts']['targetTermCount']}",
            f"- Target terms located by headword scan: {report['counts']['targetTermsLocatedByHeadwordScan']}",
            f"- Target terms located by text search: {report['counts']['targetTermsLocatedByTextSearch']}",
            f"- Boundary terms matched by segmented headword: {report['counts']['boundaryTermsMatchedByHeadword']}",
            f"- Target terms matched by segmented headword: {report['counts']['targetTermsMatchedByHeadword']}",
            f"- Skipped/revised/narrow target terms helped: {report['counts']['helpedTargetTermCount']}",
            f"- Alignment records: {report['counts']['alignmentRecordCount']}",
            f"- Segmentation assessment: {report['segmentationAssessment']}",
            f"- Comparator readiness: {report['comparatorReadiness']}",
            "",
            "## Matched Target Terms",
            "",
            markdown_table(
                ["Boundary term", "Headword", "Page", "Match", "Confidence", "Anderson alignments"],
                aligned_rows,
            )
            if aligned_rows
            else "No target terms matched segmented Osborn headwords.",
            "",
            "## Helped Skipped / Revised / Narrow Terms",
            "",
            markdown_table(["Term", "Matches", "Reasons", "Anderson alignments", "Sample pages"], helped_rows)
            if helped_rows
            else "No skipped, revised, or historically narrow target terms were helped.",
            "",
            "## Unmatched Target Terms",
            "",
            markdown_table(["Term", "Reasons"], missing_rows)
            if missing_rows
            else "All target terms matched segmented Osborn headwords.",
            "",
            "## Recommendation",
            "",
            "- Osborn should proceed to full comparator extraction only if this proof is accepted as a candidate-level source-support lane.",
            "- Batch 006 should not wait for Osborn; keep Osborn proof/extraction parallel to draft-only batch work.",
            "- Keep Osborn provenance exact-term only and do not use it for authoring until full extraction and alignment pass.",
            "",
            "## Exact Next Prompt",
            "",
            report["exactNextPrompt"],
            "",
        ]
    )


def main() -> int:
    source = load_source_record()
    registry = parse_boundary_registry()
    targets = collect_review_targets()
    alias_groups = load_alias_groups()
    anderson_match_counts = load_anderson_comparison()
    page_records: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []

    if SOURCE_READINESS_PATH.exists():
        read_json(SOURCE_READINESS_PATH)

    with fitz.open(source["wslSourceFile"]) as document:
        heading_page_map, text_page_map = locate_target_pages(document, targets)
        proof_pages = choose_proof_pages(source, targets, heading_page_map, text_page_map)

        for page_number in proof_pages:
            text = document.load_page(page_number - 1).get_text("text") or ""
            page_record = build_page_record(source, page_number, text)
            page_records.append(page_record)
            candidates.extend(segment_page(source, page_record))

    alignment_records = build_alignment_records(
        source,
        candidates,
        registry,
        targets,
        alias_groups,
        anderson_match_counts,
    )
    write_ndjson(RAW_PAGES_OUTPUT, page_records)
    write_ndjson(ENTRY_CANDIDATES_OUTPUT, candidates)
    write_ndjson(ALIGNMENT_OUTPUT, alignment_records)

    matched_boundary_terms = sorted({record["normalizedBoundaryTerm"] for record in alignment_records})
    matched_target_terms = sorted({
        record["normalizedBoundaryTerm"]
        for record in alignment_records
        if record["targetQueueMatch"]
    })
    heading_located_target_terms = sorted(
        normalized
        for normalized, pages in heading_page_map.items()
        if pages
    )
    text_located_target_terms = sorted(
        normalized
        for normalized, pages in text_page_map.items()
        if pages
    )
    target_terms_not_matched = [
        target
        for target in targets
        if target["normalizedTerm"] not in matched_target_terms
    ]
    helped_target_terms: dict[str, dict[str, Any]] = {}
    for record in alignment_records:
        if not record["targetQueueMatch"]:
            continue
        if not any(
            "skipped" in reason
            or "rejected" in reason
            or "revised" in reason
            or "historically_narrow" in reason
            or "still_skip" in reason
            or "revision_review" in reason
            for reason in record["targetReasons"]
        ):
            continue
        entry = helped_target_terms.setdefault(
            record["boundaryTerm"],
            {
                "matchCount": 0,
                "reasons": sorted(record["targetReasons"]),
                "pages": set(),
                "andersonAlignmentCount": record["andersonAlignmentCount"],
            },
        )
        entry["matchCount"] += 1
        entry["pages"].add(record["page"])

    formatted_helped_terms = {
        term: {
            "matchCount": value["matchCount"],
            "reasons": value["reasons"],
            "andersonAlignmentCount": value["andersonAlignmentCount"],
            "samplePages": ", ".join(str(page) for page in sorted(value["pages"])[:8]),
        }
        for term, value in sorted(helped_target_terms.items())
    }
    segmentation_assessment = assess_segmentation(page_records, candidates)
    comparator_readiness = (
        "ready_for_full_comparator_extraction"
        if segmentation_assessment in {"reliable", "usable_with_tuning"}
        and len(matched_target_terms) >= 6
        and len(formatted_helped_terms) >= 3
        else "needs_more_tuning_before_full_extraction"
    )
    exact_next_prompt = (
        "Task: Run full page-by-page Osborn 1927 comparator extraction using the proven multi_source schemas. Preserve per-page and per-entry provenance, run deterministic headword segmentation, align Osborn candidates against the boundary registry and existing ambiguous-term queues, but do not author meanings, do not modify the live vocabulary dataset, and do not modify runtime ontology or concept packets."
        if comparator_readiness == "ready_for_full_comparator_extraction"
        else "Task: Tune the Osborn 1927 comparator proof segmentation and page-targeting rules, then rerun a bounded Osborn proof against skipped, revised, historically narrow, and wrong-sense boundary terms. Do not author meanings, do not modify the live vocabulary dataset, and do not modify runtime ontology or concept packets."
    )

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "bounded Osborn 1927 comparator proof only",
        "sourceRegistryUsed": windows_path(SOURCE_REGISTRY_PATH),
        "sourceReadinessReportUsed": windows_path(SOURCE_READINESS_PATH),
        "schemaSpecUsed": windows_path(SCHEMA_SPEC_PATH),
        "andersonAlignmentCompared": windows_path(ANDERSON_ALIGNMENT_PATH),
        "meaningAuthoringPerformed": False,
        "liveVocabularyDatasetChanged": False,
        "vocabularyMeaningsChanged": False,
        "runtimeOntologyChanged": False,
        "conceptPacketsChanged": False,
        "writebackApplied": False,
        "finalMergedCorpusBuilt": False,
        "source": source,
        "proofPages": [record["page"] for record in page_records],
        "segmentationAssessment": segmentation_assessment,
        "comparatorReadiness": comparator_readiness,
        "fullOsbornExtractionRecommended": comparator_readiness == "ready_for_full_comparator_extraction",
        "batch006ShouldWaitForOsborn": False,
        "exactNextPrompt": exact_next_prompt,
        "counts": {
            "targetTermCount": len(targets),
            "targetTermsLocatedByHeadwordScan": len(heading_located_target_terms),
            "targetTermsLocatedByTextSearch": len(text_located_target_terms),
            "boundaryTermsMatchedByHeadword": len(matched_boundary_terms),
            "targetTermsMatchedByHeadword": len(matched_target_terms),
            "helpedTargetTermCount": len(formatted_helped_terms),
            "pageRecordCount": len(page_records),
            "entryCandidateCount": len(candidates),
            "alignmentRecordCount": len(alignment_records),
            "rawPageRowsValidated": 0,
            "entryCandidateRowsValidated": 0,
            "alignmentRowsValidated": 0,
        },
        "targetTerms": targets,
        "targetHeadingPageMap": heading_page_map,
        "targetTextPageMap": text_page_map,
        "targetTermsNotMatched": target_terms_not_matched,
        "helpedTargetTerms": formatted_helped_terms,
        "alignmentRecords": alignment_records,
        "outputs": {
            "rawPages": windows_path(RAW_PAGES_OUTPUT),
            "entryCandidates": windows_path(ENTRY_CANDIDATES_OUTPUT),
            "alignment": windows_path(ALIGNMENT_OUTPUT),
            "qualityReport": windows_path(QUALITY_REPORT_OUTPUT),
            "summary": windows_path(SUMMARY_OUTPUT),
        },
    }
    report["counts"]["rawPageRowsValidated"] = validate_ndjson(RAW_PAGES_OUTPUT)
    report["counts"]["entryCandidateRowsValidated"] = validate_ndjson(ENTRY_CANDIDATES_OUTPUT)
    report["counts"]["alignmentRowsValidated"] = validate_ndjson(ALIGNMENT_OUTPUT)

    write_json(QUALITY_REPORT_OUTPUT, report)
    SUMMARY_OUTPUT.write_text(build_summary_markdown(report), encoding="utf-8")
    subprocess.run(
        ["python3", "-m", "py_compile", str(Path(__file__))],
        check=True,
        cwd=REPO_ROOT,
    )

    for file_path in [
        RAW_PAGES_OUTPUT,
        ENTRY_CANDIDATES_OUTPUT,
        ALIGNMENT_OUTPUT,
        QUALITY_REPORT_OUTPUT,
        SUMMARY_OUTPUT,
    ]:
        print(f"Wrote {windows_path(file_path)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
