#!/usr/bin/env python3
"""Extract Osborn 1927 into full comparator NDJSON and boundary alignment outputs."""

from __future__ import annotations

import importlib.util
import json
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import fitz


REPO_ROOT = Path(__file__).resolve().parents[4]
WORKSPACE_ROOT = Path("/mnt/c/Users/coupy/Desktop/vocabulary-reference-lexicons")
MULTI_SOURCE_ROOT = WORKSPACE_ROOT / "vocabulary_reference_lexicons" / "multi_source"

RAW_PAGES_DIR = MULTI_SOURCE_ROOT / "raw_pages"
ENTRY_CANDIDATES_DIR = MULTI_SOURCE_ROOT / "entry_candidates"
ALIGNMENT_DIR = MULTI_SOURCE_ROOT / "alignment"
REPORTS_DIR = MULTI_SOURCE_ROOT / "reports"
CHECKPOINTS_DIR = MULTI_SOURCE_ROOT / "checkpoints" / "osborn_1927"

RAW_PAGES_OUTPUT = RAW_PAGES_DIR / "osborn_1927.pages.ndjson"
ENTRY_CANDIDATES_OUTPUT = ENTRY_CANDIDATES_DIR / "osborn_1927.entry_candidates.ndjson"
ALIGNMENT_OUTPUT = ALIGNMENT_DIR / "osborn_1927.boundary_alignment.ndjson"
QUALITY_REPORT_OUTPUT = REPORTS_DIR / "osborn_1927_full_extraction_quality_report.json"
SUMMARY_OUTPUT = REPORTS_DIR / "osborn_1927_full_extraction_summary.md"
CHECKPOINT_OUTPUT = CHECKPOINTS_DIR / "osborn_1927_full_extraction_checkpoint.json"

PROOF_MODULE_PATH = REPO_ROOT / "backend" / "scripts" / "lexicon" / "proof" / "proof-osborn-comparator.py"


def load_proof_module() -> Any:
    spec = importlib.util.spec_from_file_location("proof_osborn_comparator", PROOF_MODULE_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load proof module from {PROOF_MODULE_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


proof = load_proof_module()


def write_json(file_path: Path, value: Any) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(json.dumps(value, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def json_line(record: dict[str, Any]) -> str:
    return json.dumps(record, ensure_ascii=True, sort_keys=True)


def validate_ndjson(file_path: Path) -> int:
    count = 0
    with file_path.open("r", encoding="utf-8") as input_file:
        for line in input_file:
            if line.strip():
                json.loads(line)
                count += 1
    return count


def target_records_for_candidate(
    candidate: dict[str, Any],
    registry: dict[str, dict[str, str]],
    alias_groups: dict[str, set[str]],
    ambiguous_targets: dict[str, dict[str, Any]],
) -> list[tuple[str, dict[str, str]]]:
    normalized = candidate["normalizedHeadword"]
    exact_record = registry.get(normalized)
    if exact_record:
        return [("exact_normalized_match", exact_record)]

    alias_matches: list[tuple[str, dict[str, str]]] = []
    for normalized_registry_term, registry_record in registry.items():
        aliases = alias_groups.get(normalized_registry_term, set())
        if normalized in aliases:
            alias_matches.append(("alias_assisted_match", registry_record))
    if alias_matches:
        return alias_matches

    prefix_matches: list[tuple[str, dict[str, str]]] = []
    for normalized_target_term, target in ambiguous_targets.items():
        if normalized.startswith(f"{normalized_target_term} "):
            prefix_matches.append(("target_prefix_headword_match", target["registryRecord"]))
    return prefix_matches


def build_alignment_records(
    source: dict[str, Any],
    candidate: dict[str, Any],
    registry: dict[str, dict[str, str]],
    alias_groups: dict[str, set[str]],
    ambiguous_targets: dict[str, dict[str, Any]],
    anderson_match_counts: dict[str, int],
) -> list[dict[str, Any]]:
    alignment_records = []

    for match_status, registry_record in target_records_for_candidate(
        candidate,
        registry,
        alias_groups,
        ambiguous_targets,
    ):
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
                "andersonAlignmentCount": anderson_match_counts.get(normalized_boundary, 0),
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
        and good_page_ratio >= 0.85
        and usable_candidate_ratio >= 0.85
        and report_counts["uniqueMatchedBoundaryTerms"] >= 250
        and report_counts["ambiguousTargetTermsMatched"] >= 25
    ):
        return "ready_for_comparator_alignment_use"

    if (
        report_counts["pageCountMatchesExpected"]
        and good_page_ratio >= 0.75
        and usable_candidate_ratio >= 0.75
        and report_counts["uniqueMatchedBoundaryTerms"] >= 150
        and report_counts["ambiguousTargetTermsMatched"] >= 15
    ):
        return "usable_with_review_tuning"

    return "not_ready_without_segmentation_tuning"


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    return "\n".join(
        [
            "| " + " | ".join(headers) + " |",
            "| " + " | ".join(["---"] * len(headers)) + " |",
            *["| " + " | ".join(str(cell).replace("|", "\\|") for cell in row) + " |" for row in rows],
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
            record["andersonAlignmentCount"],
            record["samplePages"],
        ]
        for term, record in list(report["ambiguousTargetMatches"].items())[:40]
    ]

    return "\n".join(
        [
            "# Osborn 1927 Full Comparator Extraction",
            "",
            "Scope: full page-by-page Osborn 1927 comparator extraction only. No meanings were authored, no live vocabulary dataset was modified, no runtime ontology or concept packets were changed, no writeback was applied, and no final merged corpus was built.",
            "",
            "## Implemented / Partial / Missing / Not Evidenced",
            "",
            "- Implemented: full raw page NDJSON, deterministic entry-candidate NDJSON, boundary-registry alignment NDJSON, ambiguous-queue matching, Anderson comparison counts, validation, and quality reporting.",
            "- Partial: entry segmentation remains candidate-level; no final dictionary-entry parser or authoring corpus was built.",
            "- Missing: authoring review, provenance writeback to meanings, non-Osborn comparator extraction, and OCR lanes.",
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
            markdown_table(["Term", "Matches", "Reasons", "Anderson alignments", "Sample pages"], target_rows)
            if target_rows
            else "No ambiguous target terms matched.",
            "",
            "## Recommendation",
            "",
            "- Osborn is ready for comparator review use if downstream review keeps it exact-term and candidate-level.",
            "- Do not author directly from this extraction; use it as additional source support during comparator review queue construction.",
            "- Keep Osborn provenance exact-term and exact-source when Osborn support is later approved.",
            "",
            "## Exact Next Prompt",
            "",
            "Task: Build a multi-source comparator review queue update using Black plus Anderson plus Osborn alignment outputs. Identify already-authored, skipped, rejected, historically narrow, or wrong-sense boundary terms where Osborn provides better, corrective, or second-source support, but do not author meanings, do not modify the live vocabulary dataset, and do not modify runtime ontology or concept packets.",
            "",
        ]
    )


def main() -> int:
    source = proof.load_source_record()
    registry = proof.parse_boundary_registry()
    targets = proof.collect_review_targets()
    ambiguous_targets = {target["normalizedTerm"]: target for target in targets}
    alias_groups = proof.load_alias_groups()
    anderson_match_counts = proof.load_anderson_comparison()

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
                        page_record = proof.build_page_record(source, page_number, text)
                        raw_output.write(json_line(page_record) + "\n")
                        counts["extractedPageCount"] += 1
                        page_quality_counts[page_record["extractionQuality"]] += 1

                        if page_record["charCount"] == 0:
                            empty_pages.append(page_number)
                        elif page_record["charCount"] < 200:
                            near_empty_pages.append(page_number)

                        for candidate in proof.segment_page(source, page_record):
                            candidate_output.write(json_line(candidate) + "\n")
                            counts["entryCandidateCount"] += 1
                            candidate_confidence_counts[candidate["parseConfidence"]] += 1

                            for alignment in build_alignment_records(
                                source,
                                candidate,
                                registry,
                                alias_groups,
                                ambiguous_targets,
                                anderson_match_counts,
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
                                            "andersonAlignmentCount": alignment["andersonAlignmentCount"],
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
            "andersonAlignmentCount": value["andersonAlignmentCount"],
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
        "scope": "full Osborn 1927 comparator extraction only",
        "sourceRegistryUsed": proof.windows_path(proof.SOURCE_REGISTRY_PATH),
        "schemaSpecUsed": proof.windows_path(proof.SCHEMA_SPEC_PATH),
        "andersonAlignmentCompared": proof.windows_path(proof.ANDERSON_ALIGNMENT_PATH),
        "meaningAuthoringPerformed": False,
        "liveVocabularyDatasetChanged": False,
        "vocabularyMeaningsChanged": False,
        "runtimeOntologyChanged": False,
        "conceptPacketsChanged": False,
        "writebackApplied": False,
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
            if all(proof.normalize_for_comparison(term) != normalized for term in ambiguous_target_matches)
        ),
        "outputs": {
            "rawPages": proof.windows_path(RAW_PAGES_OUTPUT),
            "entryCandidates": proof.windows_path(ENTRY_CANDIDATES_OUTPUT),
            "alignment": proof.windows_path(ALIGNMENT_OUTPUT),
            "qualityReport": proof.windows_path(QUALITY_REPORT_OUTPUT),
            "summary": proof.windows_path(SUMMARY_OUTPUT),
            "checkpoint": proof.windows_path(CHECKPOINT_OUTPUT),
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
        print(f"Wrote {proof.windows_path(file_path)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
