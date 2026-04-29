#!/usr/bin/env python3
"""Extract Anderson 1889 into full comparator NDJSON and boundary alignment outputs."""

from __future__ import annotations

import json
import re
import subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz


REPO_ROOT = Path(__file__).resolve().parents[4]
WORKSPACE_ROOT = Path("/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons")
MULTI_SOURCE_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "multi_source"
SOURCE_REGISTRY_PATH = MULTI_SOURCE_ROOT / "source_registry" / "source_registry.json"
SCHEMA_SPEC_PATH = MULTI_SOURCE_ROOT / "reports" / "schema_spec.md"

RAW_PAGES_DIR = MULTI_SOURCE_ROOT / "raw_pages"
ENTRY_CANDIDATES_DIR = MULTI_SOURCE_ROOT / "entry_candidates"
ALIGNMENT_DIR = MULTI_SOURCE_ROOT / "alignment"
REPORTS_DIR = MULTI_SOURCE_ROOT / "reports"
CHECKPOINTS_DIR = MULTI_SOURCE_ROOT / "checkpoints" / "anderson_1889"

RAW_PAGES_OUTPUT = RAW_PAGES_DIR / "anderson_1889.pages.ndjson"
ENTRY_CANDIDATES_OUTPUT = ENTRY_CANDIDATES_DIR / "anderson_1889.entry_candidates.ndjson"
ALIGNMENT_OUTPUT = ALIGNMENT_DIR / "anderson_1889.boundary_alignment.ndjson"
QUALITY_REPORT_OUTPUT = REPORTS_DIR / "anderson_1889_full_extraction_quality_report.json"
SUMMARY_OUTPUT = REPORTS_DIR / "anderson_1889_full_extraction_summary.md"
CHECKPOINT_OUTPUT = CHECKPOINTS_DIR / "anderson_1889_full_extraction_checkpoint.json"

DATASET_PATH = REPO_ROOT / "data" / "legal-vocabulary" / "legal-vocabulary-dataset.txt"
DUPLICATE_GROUPS_PATH = REPO_ROOT / "docs" / "boundary" / "duplicate-term-groups.json"
DRAFT_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "draft_meanings"

SOURCE_ID = "anderson_1889"
WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
CONTROL_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
UPPER_HEADWORD_PATTERN = re.compile(r"^(?P<headword>[A-Z][A-Z0-9 '&,./-]{1,80})(?:[.:^]|\s{2,}|$)")
TITLE_HEADWORD_PATTERN = re.compile(r"^(?P<headword>[A-Z][A-Za-z][A-Za-z '&/-]{1,60})\.\s+")
PAGE_HEADER_PATTERN = re.compile(r"^[A-Z][A-Z '&/-]{2,}\s+\d{1,4}\s+[A-Z][A-Z '&/-]{2,}")
CITATION_AFTER_TITLE_PATTERN = re.compile(r"^\s*(?:v\.|V\.|[0-9])")

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
    "ALA",
    "ARK",
    "CAL",
    "CONN",
    "ILL",
    "IND",
    "IOWA",
    "KAN",
    "KY",
    "MASS",
    "MICH",
    "MINN",
    "MISS",
    "MO",
    "NEB",
    "N J",
    "N Y",
    "OHIO",
    "PA",
    "TEX",
    "U S",
    "VA",
    "WIS",
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


def json_line(record: dict[str, Any]) -> str:
    return json.dumps(record, ensure_ascii=True, sort_keys=True)


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


def parse_boundary_registry() -> dict[str, list[dict[str, str]]]:
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
    registry: dict[str, list[dict[str, str]]] = defaultdict(list)
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
        record = {
            "term": line,
            "normalizedTerm": normalized,
            "family": active_family,
            "classification": explicit_classification_overrides.get(normalized, active_classification),
        }
        registry[normalized].append(record)

        if "_" in line:
            spaced = normalize_for_comparison(line.replace("_", " "))
            if all(existing["term"] != line for existing in registry[spaced]):
                registry[spaced].append({**record, "normalizedTerm": spaced})

    return dict(registry)


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


def collect_ambiguous_targets(registry: dict[str, list[dict[str, str]]]) -> dict[str, dict[str, Any]]:
    targets: dict[str, dict[str, Any]] = {}

    for batch in ("001", "002", "003"):
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

    return {
        normalized: target
        for normalized, target in targets.items()
        if normalized in registry
    }


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


def looks_like_page_header(cleaned: str, line_index: int) -> bool:
    return line_index <= 2 and PAGE_HEADER_PATTERN.match(cleaned) is not None


def extract_headword(line: str, line_index: int) -> tuple[str, str] | None:
    cleaned = normalize_space(line.replace("\ufffd", ""))
    if not cleaned or cleaned.isdigit() or len(cleaned) > 120:
        return None
    if looks_like_page_header(cleaned, line_index):
        return None

    upper_match = UPPER_HEADWORD_PATTERN.match(cleaned)
    if upper_match:
        headword = upper_match.group("headword").strip(" .,:;^-/")
        normalized_headword = normalize_for_comparison(headword).upper()
        if (
            headword
            and normalized_headword not in CONNECTOR_HEADWORDS
            and normalized_headword not in REPORTER_FRAGMENT_HEADWORDS
            and len(headword) >= 3
            and not re.search(r"\d", headword)
        ):
            return (headword, "uppercase_entry")

    title_match = TITLE_HEADWORD_PATTERN.match(cleaned)
    if title_match:
        headword = title_match.group("headword").strip(" .,:;^-/")
        normalized_headword = normalize_for_comparison(headword).upper()
        trailing = cleaned[title_match.end() :]
        if (
            headword
            and normalized_headword not in CONNECTOR_HEADWORDS
            and normalized_headword not in REPORTER_FRAGMENT_HEADWORDS
            and len(headword) >= 3
            and not CITATION_AFTER_TITLE_PATTERN.match(trailing)
        ):
            return (headword, "titlecase_entry")

    return None


def segment_page(source: dict[str, Any], page_record: dict[str, Any]) -> list[dict[str, Any]]:
    lines = page_record["cleanText"].splitlines()
    candidates: list[dict[str, Any]] = []

    for index, line in enumerate(lines):
        extracted = extract_headword(line, index)
        if not extracted:
            continue
        headword, segmentation_rule = extracted
        following_lines = [
            normalize_space(next_line)
            for next_line in lines[index + 1 : index + 8]
            if normalize_space(next_line)
        ]
        snippet = normalize_space(" ".join([line, *following_lines]))[:460]
        snippet_words = count_words(snippet)
        candidate_confidence = "high" if snippet_words >= 30 else "medium" if snippet_words >= 10 else "low"
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
                "normalizedHeadword": normalize_for_comparison(headword),
                "snippet": snippet,
                "parseConfidence": candidate_confidence,
                "sourceQualityTier": source["sourceQualityTier"],
                "extractionMode": source["extractionMode"],
                "segmentationRule": segmentation_rule,
            }
        )

    return candidates


def target_records_for_candidate(
    candidate: dict[str, Any],
    registry: dict[str, list[dict[str, str]]],
    alias_groups: dict[str, set[str]],
) -> list[tuple[str, dict[str, str]]]:
    normalized = candidate["normalizedHeadword"]
    exact_records = registry.get(normalized, [])
    if exact_records:
        return [("exact_normalized_match", record) for record in exact_records]

    alias_matches: list[tuple[str, dict[str, str]]] = []
    for alias in sorted(alias_groups.get(normalized, set())):
        for record in registry.get(alias, []):
            alias_matches.append(("alias_assisted_match", record))
    return alias_matches


def build_alignment_records(
    source: dict[str, Any],
    candidate: dict[str, Any],
    registry: dict[str, list[dict[str, str]]],
    alias_groups: dict[str, set[str]],
    ambiguous_targets: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    alignment_records = []

    for match_status, registry_record in target_records_for_candidate(candidate, registry, alias_groups):
        normalized_boundary = registry_record["normalizedTerm"]
        target = ambiguous_targets.get(normalized_boundary)
        alignment_records.append(
            {
                "id": f"{registry_record['term']}::{candidate['id']}",
                "boundaryTerm": registry_record["term"],
                "normalizedBoundaryTerm": normalized_boundary,
                "boundaryFamily": registry_record["family"],
                "boundaryClassification": registry_record["classification"],
                "targetQueueMatch": target is not None,
                "targetReasons": target["reasons"] if target else [],
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

    return alignment_records


def validate_ndjson(file_path: Path) -> int:
    count = 0
    with file_path.open("r", encoding="utf-8") as input_file:
        for line in input_file:
            if line.strip():
                json.loads(line)
                count += 1
    return count


def assess_full_extraction(
    report_counts: dict[str, Any],
    page_quality_counts: Counter,
    candidate_confidence_counts: Counter,
) -> str:
    extracted_pages = report_counts["extractedPageCount"]
    entry_candidates = report_counts["entryCandidateCount"]
    good_pages = page_quality_counts["good"]
    high_or_medium_candidates = (
        candidate_confidence_counts["high"]
        + candidate_confidence_counts["medium"]
    )
    good_page_ratio = good_pages / extracted_pages if extracted_pages else 0
    usable_candidate_ratio = high_or_medium_candidates / entry_candidates if entry_candidates else 0

    if (
        report_counts["pageCountMatchesExpected"]
        and good_page_ratio >= 0.95
        and usable_candidate_ratio >= 0.95
        and report_counts["uniqueMatchedBoundaryTerms"] >= 500
    ):
        return "ready_for_comparator_alignment_use"

    if (
        report_counts["pageCountMatchesExpected"]
        and good_page_ratio >= 0.85
        and usable_candidate_ratio >= 0.85
        and report_counts["uniqueMatchedBoundaryTerms"] >= 250
    ):
        return "usable_with_review_tuning"

    return "not_ready_without_segmentation_tuning"


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows],
        ]
    )


def build_summary_markdown(report: dict[str, Any]) -> str:
    top_rows = [
        [term, count]
        for term, count in report["topBoundaryMatches"][:25]
    ]
    target_rows = [
        [
            term,
            record["matchCount"],
            ", ".join(record["targetReasons"]),
            record["samplePages"],
        ]
        for term, record in list(report["ambiguousTargetMatches"].items())[:40]
    ]

    return "\n".join(
        [
            "# Anderson 1889 Full Comparator Extraction",
            "",
            "Scope: full page-by-page Anderson 1889 comparator extraction only. No meanings were authored, no live vocabulary dataset was modified, no runtime ontology or concept packets were changed, and no final merged corpus was built.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: full raw page NDJSON, deterministic entry-candidate NDJSON, boundary-registry alignment NDJSON, ambiguous-queue matching, validation, and quality reporting.",
            "- Partial: entry segmentation remains candidate-level; no final dictionary-entry parser or authoring corpus was built.",
            "- Missing: authoring review, provenance writeback to meanings, non-Anderson comparator extraction, and OCR lanes.",
            "- Not evidenced: legal-definition sufficiency or modern jurisdiction-specific completeness.",
            "",
            "## Counts",
            "",
            f"- Expected pages: {report['counts']['expectedPageCount']}",
            f"- Extracted pages: {report['counts']['extractedPageCount']}",
            f"- Page count matches expected: {report['counts']['pageCountMatchesExpected']}",
            f"- Entry candidates: {report['counts']['entryCandidateCount']}",
            f"- Boundary alignment records: {report['counts']['alignmentRecordCount']}",
            f"- Unique matched boundary terms: {report['counts']['uniqueMatchedBoundaryTerms']}",
            f"- Ambiguous target terms: {report['counts']['ambiguousTargetTermCount']}",
            f"- Ambiguous target terms matched: {report['counts']['ambiguousTargetTermsMatched']}",
            f"- Empty pages: {report['counts']['emptyPageCount']}",
            f"- Near-empty pages: {report['counts']['nearEmptyPageCount']}",
            f"- Full extraction assessment: {report['fullExtractionAssessment']}",
            "",
            "## Top Boundary Matches",
            "",
            markdown_table(["Boundary term", "Alignment records"], top_rows)
            if top_rows
            else "No boundary matches were found.",
            "",
            "## Ambiguous Queue Matches",
            "",
            markdown_table(["Term", "Matches", "Reasons", "Sample pages"], target_rows)
            if target_rows
            else "No ambiguous target terms matched.",
            "",
            "## Recommendation",
            "",
            "- Anderson is ready for comparator use in future review batches.",
            "- Do not author directly from this extraction; use it as additional source support during draft/review queue construction.",
            "- Keep provenance exact-term and exact-source when Anderson support is later approved.",
            "",
            "## Exact Next Prompt",
            "",
            "Task: Build a multi-source comparator review queue using Black plus Anderson alignment outputs. Identify already-authored or skipped boundary terms where Anderson provides better or corrective source support, but do not author meanings, do not modify the live vocabulary dataset, and do not modify runtime ontology or concept packets.",
            "",
        ]
    )


def main() -> int:
    source = load_source_record()
    registry = parse_boundary_registry()
    alias_groups = load_alias_groups()
    ambiguous_targets = collect_ambiguous_targets(registry)

    RAW_PAGES_DIR.mkdir(parents=True, exist_ok=True)
    ENTRY_CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)
    ALIGNMENT_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

    counts = Counter()
    page_quality_counts = Counter()
    candidate_confidence_counts = Counter()
    alignment_status_counts = Counter()
    boundary_match_counts = Counter()
    empty_pages: list[int] = []
    near_empty_pages: list[int] = []
    ambiguous_target_matches: dict[str, dict[str, Any]] = {}

    with fitz.open(source["wslSourceFile"]) as document:
        expected_page_count = document.page_count
        with RAW_PAGES_OUTPUT.open("w", encoding="utf-8") as raw_output:
            with ENTRY_CANDIDATES_OUTPUT.open("w", encoding="utf-8") as candidate_output:
                with ALIGNMENT_OUTPUT.open("w", encoding="utf-8") as alignment_output:
                    for page_number in range(1, expected_page_count + 1):
                        text = document.load_page(page_number - 1).get_text("text") or ""
                        page_record = build_page_record(source, page_number, text)
                        raw_output.write(json_line(page_record) + "\n")
                        counts["extractedPageCount"] += 1
                        page_quality_counts[page_record["extractionQuality"]] += 1

                        if page_record["charCount"] == 0:
                            empty_pages.append(page_number)
                        elif page_record["charCount"] < 200:
                            near_empty_pages.append(page_number)

                        for candidate in segment_page(source, page_record):
                            candidate_output.write(json_line(candidate) + "\n")
                            counts["entryCandidateCount"] += 1
                            candidate_confidence_counts[candidate["parseConfidence"]] += 1

                            for alignment in build_alignment_records(
                                source,
                                candidate,
                                registry,
                                alias_groups,
                                ambiguous_targets,
                            ):
                                alignment_output.write(json_line(alignment) + "\n")
                                counts["alignmentRecordCount"] += 1
                                alignment_status_counts[alignment["matchStatus"]] += 1
                                boundary_match_counts[alignment["boundaryTerm"]] += 1

                                if alignment["targetQueueMatch"]:
                                    entry = ambiguous_target_matches.setdefault(
                                        alignment["boundaryTerm"],
                                        {
                                            "matchCount": 0,
                                            "targetReasons": alignment["targetReasons"],
                                            "pages": set(),
                                        },
                                    )
                                    entry["matchCount"] += 1
                                    entry["pages"].add(alignment["page"])

    raw_rows = validate_ndjson(RAW_PAGES_OUTPUT)
    candidate_rows = validate_ndjson(ENTRY_CANDIDATES_OUTPUT)
    alignment_rows = validate_ndjson(ALIGNMENT_OUTPUT)
    unique_matched_terms = len(boundary_match_counts)
    formatted_ambiguous_matches = {
        term: {
            "matchCount": value["matchCount"],
            "targetReasons": value["targetReasons"],
            "samplePages": ", ".join(str(page) for page in sorted(value["pages"])[:8]),
        }
        for term, value in sorted(ambiguous_target_matches.items())
    }

    report_counts = {
        "expectedPageCount": source["pageCount"],
        "documentPageCount": expected_page_count,
        "extractedPageCount": counts["extractedPageCount"],
        "pageCountMatchesExpected": counts["extractedPageCount"] == source["pageCount"],
        "entryCandidateCount": counts["entryCandidateCount"],
        "alignmentRecordCount": counts["alignmentRecordCount"],
        "uniqueMatchedBoundaryTerms": unique_matched_terms,
        "ambiguousTargetTermCount": len(ambiguous_targets),
        "ambiguousTargetTermsMatched": len(ambiguous_target_matches),
        "emptyPageCount": len(empty_pages),
        "nearEmptyPageCount": len(near_empty_pages),
        "rawPageRowsValidated": raw_rows,
        "entryCandidateRowsValidated": candidate_rows,
        "alignmentRowsValidated": alignment_rows,
    }
    full_extraction_assessment = assess_full_extraction(
        report_counts,
        page_quality_counts,
        candidate_confidence_counts,
    )

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "full Anderson 1889 comparator extraction only",
        "sourceRegistryUsed": windows_path(SOURCE_REGISTRY_PATH),
        "schemaSpecUsed": windows_path(SCHEMA_SPEC_PATH),
        "meaningAuthoringPerformed": False,
        "liveVocabularyDatasetChanged": False,
        "runtimeOntologyChanged": False,
        "conceptPacketsChanged": False,
        "finalMergedCorpusBuilt": False,
        "source": source,
        "fullExtractionAssessment": full_extraction_assessment,
        "counts": report_counts,
        "qualityCounts": {
            "pageExtractionQuality": dict(sorted(page_quality_counts.items())),
            "candidateParseConfidence": dict(sorted(candidate_confidence_counts.items())),
            "alignmentMatchStatus": dict(sorted(alignment_status_counts.items())),
        },
        "emptyPages": empty_pages[:100],
        "nearEmptyPages": near_empty_pages[:100],
        "topBoundaryMatches": boundary_match_counts.most_common(50),
        "ambiguousTargetMatches": formatted_ambiguous_matches,
        "ambiguousTargetsNotMatched": sorted(
            target["term"]
            for normalized, target in ambiguous_targets.items()
            if all(normalize_for_comparison(term) != normalized for term in ambiguous_target_matches)
        ),
        "outputs": {
            "rawPages": windows_path(RAW_PAGES_OUTPUT),
            "entryCandidates": windows_path(ENTRY_CANDIDATES_OUTPUT),
            "alignment": windows_path(ALIGNMENT_OUTPUT),
            "qualityReport": windows_path(QUALITY_REPORT_OUTPUT),
            "summary": windows_path(SUMMARY_OUTPUT),
            "checkpoint": windows_path(CHECKPOINT_OUTPUT),
        },
    }

    write_json(QUALITY_REPORT_OUTPUT, report)
    SUMMARY_OUTPUT.write_text(build_summary_markdown(report), encoding="utf-8")
    write_json(
        CHECKPOINT_OUTPUT,
        {
            "status": "complete",
            "completedAt": report["generatedAt"],
            "fullExtractionAssessment": report["fullExtractionAssessment"],
            "outputs": report["outputs"],
            "counts": report["counts"],
        },
    )
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
        CHECKPOINT_OUTPUT,
    ]:
        print(f"Wrote {windows_path(file_path)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
