#!/usr/bin/env python3
"""Run a bounded Anderson 1889 comparator proof for boundary vocabulary terms."""

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

RAW_PAGES_DIR = MULTI_SOURCE_ROOT / "raw_pages"
ENTRY_CANDIDATES_DIR = MULTI_SOURCE_ROOT / "entry_candidates"
ALIGNMENT_DIR = MULTI_SOURCE_ROOT / "alignment"
REPORTS_DIR = MULTI_SOURCE_ROOT / "reports"

RAW_PAGES_OUTPUT = RAW_PAGES_DIR / "anderson_1889.proof.pages.ndjson"
ENTRY_CANDIDATES_OUTPUT = ENTRY_CANDIDATES_DIR / "anderson_1889.proof.entry_candidates.ndjson"
ALIGNMENT_OUTPUT = ALIGNMENT_DIR / "anderson_1889.proof.alignment.ndjson"
QUALITY_REPORT_OUTPUT = REPORTS_DIR / "anderson_1889_comparator_quality_report.json"
SUMMARY_OUTPUT = REPORTS_DIR / "anderson_1889_comparator_proof_report.md"

DATASET_PATH = REPO_ROOT / "data" / "legal-vocabulary" / "legal-vocabulary-dataset.txt"
DUPLICATE_GROUPS_PATH = REPO_ROOT / "docs" / "boundary" / "duplicate-term-groups.json"
DRAFT_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "draft_meanings"

SOURCE_ID = "anderson_1889"
MAX_TARGET_PAGES = 24
MAX_TOTAL_PAGES = 30

WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
CONTROL_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
UPPER_HEADWORD_PATTERN = re.compile(r"^(?P<headword>[A-Z][A-Z0-9 '&,./-]{1,80})(?:[.:^]|\s{2,}|$)")
TITLE_HEADWORD_PATTERN = re.compile(r"^(?P<headword>[A-Z][A-Za-z][A-Za-z '&/-]{1,60})\.\s+")

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

    for batch in ("001", "002", "003"):
        for lane in ("approved", "revise", "rejected"):
            path = DRAFT_ROOT / "review" / f"{lane}_batch_{batch}.json"
            if not path.exists():
                continue
            for record in read_json(path):
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


def locate_target_pages(
    document: fitz.Document,
    targets: list[dict[str, Any]],
) -> tuple[dict[str, list[int]], dict[str, list[int]]]:
    heading_page_map = {target["normalizedTerm"]: [] for target in targets}
    text_page_map = {target["normalizedTerm"]: [] for target in targets}
    pending_text = set(text_page_map)
    target_norms = set(heading_page_map)

    for page_index in range(document.page_count):
        raw_text = document.load_page(page_index).get_text("text") or ""
        page_number = page_index + 1

        for line in clean_text(raw_text).splitlines():
            extracted = extract_headword(line)
            if not extracted:
                continue
            normalized_headword = normalize_for_comparison(extracted[0])
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
    base_pages = source["boundedSample"]["sampledPages"]
    for page in base_pages:
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


def extract_headword(line: str) -> tuple[str, str] | None:
    cleaned = normalize_space(line.replace("\ufffd", ""))
    if not cleaned or cleaned.isdigit() or len(cleaned) > 120:
        return None

    upper_match = UPPER_HEADWORD_PATTERN.match(cleaned)
    if upper_match:
        headword = upper_match.group("headword").strip(" .,:;^-/")
        if headword and headword.upper() not in CONNECTOR_HEADWORDS and len(headword) >= 3:
            return (headword, "uppercase_entry")

    title_match = TITLE_HEADWORD_PATTERN.match(cleaned)
    if title_match:
        headword = title_match.group("headword").strip(" .,:;^-/")
        if headword and headword.upper() not in CONNECTOR_HEADWORDS and len(headword) >= 3:
            return (headword, "titlecase_entry")

    return None


def segment_page(source: dict[str, Any], page_record: dict[str, Any]) -> list[dict[str, Any]]:
    lines = page_record["cleanText"].splitlines()
    candidates: list[dict[str, Any]] = []

    for index, line in enumerate(lines):
        extracted = extract_headword(line)
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


def build_alignment_records(
    source: dict[str, Any],
    candidates: list[dict[str, Any]],
    targets: list[dict[str, Any]],
    alias_groups: dict[str, set[str]],
) -> list[dict[str, Any]]:
    targets_by_normalized = {target["normalizedTerm"]: target for target in targets}
    alignment_records: list[dict[str, Any]] = []

    for candidate in candidates:
        normalized = candidate["normalizedHeadword"]
        target = targets_by_normalized.get(normalized)
        match_status = "exact_normalized_match"

        if not target:
            for target_record in targets:
                aliases = alias_groups.get(target_record["normalizedTerm"], set())
                if normalized in aliases:
                    target = target_record
                    match_status = "alias_assisted_match"
                    break

        if not target:
            continue

        registry_record = target["registryRecord"]
        alignment_records.append(
            {
                "id": f"{registry_record['term']}::{candidate['id']}",
                "boundaryTerm": registry_record["term"],
                "normalizedBoundaryTerm": target["normalizedTerm"],
                "boundaryFamily": registry_record["family"],
                "boundaryClassification": registry_record["classification"],
                "targetReasons": target["reasons"],
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

    if average_candidates >= 6 and confidence_ratio >= 0.75:
        return "reliable"
    if average_candidates >= 2.5 and confidence_ratio >= 0.5:
        return "usable_with_tuning"
    return "too_noisy"


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows],
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
        ]
        for record in report["alignmentRecords"][:30]
    ]
    missing_rows = [
        [target["term"], ", ".join(target["reasons"])]
        for target in report["targetTermsNotMatched"][:40]
    ]

    return "\n".join(
        [
            "# Anderson 1889 Comparator Proof",
            "",
            "Scope: bounded comparator proof for `anderson_1889` only. No meanings were authored, no live vocabulary dataset was modified, no runtime ontology or concept packets were changed, and no final merged corpus was built.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: source-registry driven page-window extraction, page NDJSON, deterministic entry-candidate NDJSON, target-term alignment NDJSON, and comparator quality reporting.",
            "- Partial: page selection is bounded and candidate-level; it is not full Anderson extraction or final entry segmentation.",
            "- Missing: full page-by-page Anderson extraction, full alignment against all 3,585 boundary terms, authoring review, and source writeback.",
            "- Not evidenced: legal-definition sufficiency, complete Anderson coverage, or suitability for runtime ontology admission.",
            "",
            "## Counts",
            "",
            f"- Proof pages extracted: {report['counts']['pageRecordCount']}",
            f"- Entry candidates: {report['counts']['entryCandidateCount']}",
            f"- Ambiguous/historical target terms: {report['counts']['targetTermCount']}",
            f"- Target terms located by headword scan: {report['counts']['targetTermsLocatedByHeadwordScan']}",
            f"- Target terms located by text search: {report['counts']['targetTermsLocatedByTextSearch']}",
            f"- Target terms matched by segmented headword: {report['counts']['targetTermsMatchedByHeadword']}",
            f"- Alignment records: {report['counts']['alignmentRecordCount']}",
            f"- Segmentation assessment: {report['segmentationAssessment']}",
            f"- Comparator readiness: {report['comparatorReadiness']}",
            "",
            "## Matched Target Terms",
            "",
            markdown_table(
                ["Boundary term", "Headword", "Page", "Match", "Confidence"],
                aligned_rows,
            )
            if aligned_rows
            else "No target terms matched segmented Anderson headwords.",
            "",
            "## Unmatched Target Terms",
            "",
            markdown_table(["Term", "Reasons"], missing_rows)
            if missing_rows
            else "All target terms matched segmented Anderson headwords.",
            "",
            "## Recommendation",
            "",
            "- Anderson is suitable for a controlled full comparator extraction if the next task keeps this as candidate-level source support and does not author meanings.",
            "- Run full Anderson page extraction only after accepting the Anderson-specific segmentation rules from this proof.",
            "- Continue keeping Bouvier, Ballentine, and Burrill in the OCR backlog until OCR tooling is installed.",
            "",
            "## Exact Next Prompt",
            "",
            "Task: Run full page-by-page Anderson 1889 comparator extraction using the proven multi_source schemas. Preserve per-page and per-entry provenance, run deterministic headword segmentation, align Anderson candidates against the boundary registry and existing ambiguous-term queues, but do not author meanings, do not modify the live vocabulary dataset, and do not modify runtime ontology or concept packets.",
            "",
        ]
    )


def main() -> int:
    source = load_source_record()
    targets = collect_review_targets()
    alias_groups = load_alias_groups()
    page_records: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []

    with fitz.open(source["wslSourceFile"]) as document:
        heading_page_map, text_page_map = locate_target_pages(document, targets)
        proof_pages = choose_proof_pages(source, targets, heading_page_map, text_page_map)

        for page_number in proof_pages:
            text = document.load_page(page_number - 1).get_text("text") or ""
            page_record = build_page_record(source, page_number, text)
            page_records.append(page_record)
            candidates.extend(segment_page(source, page_record))

    alignment_records = build_alignment_records(source, candidates, targets, alias_groups)
    write_ndjson(RAW_PAGES_OUTPUT, page_records)
    write_ndjson(ENTRY_CANDIDATES_OUTPUT, candidates)
    write_ndjson(ALIGNMENT_OUTPUT, alignment_records)

    matched_target_terms = sorted({record["normalizedBoundaryTerm"] for record in alignment_records})
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
    segmentation_assessment = assess_segmentation(page_records, candidates)
    comparator_readiness = (
        "ready_for_full_comparator_extraction"
        if segmentation_assessment in {"reliable", "usable_with_tuning"}
        and len(matched_target_terms) >= 8
        else "needs_more_tuning_before_full_extraction"
    )

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "scope": "bounded Anderson 1889 comparator proof only",
        "sourceRegistryUsed": windows_path(SOURCE_REGISTRY_PATH),
        "schemaSpecUsed": windows_path(SCHEMA_SPEC_PATH),
        "meaningAuthoringPerformed": False,
        "liveVocabularyDatasetChanged": False,
        "runtimeOntologyChanged": False,
        "conceptPacketsChanged": False,
        "finalMergedCorpusBuilt": False,
        "source": source,
        "proofPages": [record["page"] for record in page_records],
        "segmentationAssessment": segmentation_assessment,
        "comparatorReadiness": comparator_readiness,
        "counts": {
            "targetTermCount": len(targets),
            "targetTermsLocatedByHeadwordScan": len(heading_located_target_terms),
            "targetTermsLocatedByTextSearch": len(text_located_target_terms),
            "targetTermsMatchedByHeadword": len(matched_target_terms),
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
