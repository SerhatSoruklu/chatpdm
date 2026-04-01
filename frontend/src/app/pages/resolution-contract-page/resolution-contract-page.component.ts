import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import type {
  ConceptDetailResponse,
  ResolveProductResponse,
} from '../../core/concepts/concept-resolver.types';

type ResolutionType = ResolveProductResponse['type'];
type ReviewAdmission = NonNullable<ConceptDetailResponse['reviewState']>['admission'];

interface ResolutionStateCard {
  type: ResolutionType;
  when: readonly string[];
  guarantees: readonly string[];
  doesNotGuarantee: readonly string[];
}

interface StableFieldRow {
  field: string;
  meaning: string;
  presence: string;
}

interface ContractExample {
  query: string;
  type: ResolutionType;
  queryType: ResolveProductResponse['queryType'];
  reviewState: ReviewAdmission | null;
  meaning: string;
}

@Component({
  selector: 'app-resolution-contract-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resolution-contract-page.component.html',
  styleUrl: './resolution-contract-page.component.css',
})
export class ResolutionContractPageComponent {
  protected readonly resolutionStates: readonly ResolutionStateCard[] = [
    {
      type: 'concept_match',
      when: [
        'The query resolves to one admitted canonical concept.',
      ],
      guarantees: [
        'The concept is live in the current public runtime.',
        'The canonical payload stays bounded by the authored concept contract.',
        'The runtime does not need interpretation metadata to explain the match.',
      ],
      doesNotGuarantee: [
        'Coverage outside the authored concept scope.',
        'Any broader answer surface beyond the canonical concept packet.',
      ],
    },
    {
      type: 'comparison',
      when: [
        'The query is a comparison query for an authored allowlisted pair.',
      ],
      guarantees: [
        'The pair is admitted in the current runtime.',
        'Comparison axes are authored and deterministically ordered.',
        'The output remains bounded to the authored comparison payload.',
      ],
      doesNotGuarantee: [
        'Freeform comparative reasoning.',
        'Comparison of arbitrary or unsupported concept pairs.',
      ],
    },
    {
      type: 'ambiguous_match',
      when: [
        'Multiple nearby canonical concepts remain plausible and the system requires an explicit choice.',
      ],
      guarantees: [
        'Candidate ordering is deterministic.',
        'The runtime stays explicit about ambiguity instead of silently picking one concept.',
      ],
      doesNotGuarantee: [
        'A resolved canonical answer before the ambiguity is narrowed.',
        'Permission to collapse multiple concepts into one output.',
      ],
    },
    {
      type: 'no_exact_match',
      when: [
        'The query is semantically formed enough to inspect, but no exact canonical concept resolves.',
      ],
      guarantees: [
        'The non-match is explicit rather than approximated.',
        'Interpretation metadata explains the miss without pretending the concept exists.',
        'Suggestions remain bounded and deterministic when present.',
      ],
      doesNotGuarantee: [
        'A fallback answer.',
        'Runtime admission for missing or non-allowlisted concepts.',
      ],
    },
    {
      type: 'invalid_query',
      when: [
        'No recognizable concept candidate or supported query structure is detected.',
      ],
      guarantees: [
        'The runtime refuses noise or malformed input without guessing.',
        'No hidden correction or nearest-concept fallback is applied.',
      ],
      doesNotGuarantee: [
        'Interpretation as a real concept query.',
        'Any inferred meaning beyond the entered input.',
      ],
    },
    {
      type: 'unsupported_query_type',
      when: [
        'The query has recognizable structure, but the current runtime does not support that query class.',
      ],
      guarantees: [
        'The refusal is explicit about unsupported structure rather than pretending no concept exists.',
        'Interpretation metadata records the detected query shape.',
      ],
      doesNotGuarantee: [
        'Actor reasoning, relation reasoning, or consequence-chain output.',
        'Silent conversion into a simpler exact-concept query.',
      ],
    },
    {
      type: 'rejected_concept',
      when: [
        'The query targets a concept recorded in the structural rejection registry.',
      ],
      guarantees: [
        'The refusal is explicit and first-class in the runtime contract.',
        'Structural rejection is not collapsed into generic no-match behavior.',
      ],
      doesNotGuarantee: [
        'Canonical concept output.',
        'Runtime admission while the concept remains rejected.',
      ],
    },
  ] as const;

  protected readonly stableFields: readonly StableFieldRow[] = [
    {
      field: 'query',
      meaning: 'Original user input preserved exactly as received.',
      presence: 'Always present. Stable top-level field.',
    },
    {
      field: 'normalizedQuery',
      meaning: 'Deterministic normalized form of the input under the declared normalizer version.',
      presence: 'Always present. Stable top-level field.',
    },
    {
      field: 'type',
      meaning: 'Semantic outcome type returned by the runtime.',
      presence: 'Always present. Stable top-level field.',
    },
    {
      field: 'queryType',
      meaning: 'Deterministic classification of the query shape.',
      presence: 'Always present. Stable top-level field.',
    },
    {
      field: 'interpretation',
      meaning: 'Structured query-shape metadata. It explains the detected shape without fabricating an answer.',
      presence: 'Always present. Null for direct concept_match and comparison results. Structured for refusal and rejection results.',
    },
    {
      field: 'resolution',
      meaning: 'Typed resolution metadata for match, ambiguity, non-match, and rejection flows.',
      presence: 'Present for concept_match, ambiguous_match, no_exact_match, invalid_query, unsupported_query_type, and rejected_concept. Omitted for comparison.',
    },
    {
      field: 'message',
      meaning: 'Canonical runtime message for ambiguity, no-match, or rejection results.',
      presence: 'Present for ambiguous_match, no_exact_match, invalid_query, unsupported_query_type, and rejected_concept only.',
    },
    {
      field: 'answer',
      meaning: 'Canonical concept payload with authored meaning, governance state, registers, contexts, sources, and related concepts.',
      presence: 'Present only for concept_match.',
    },
    {
      field: 'comparison',
      meaning: 'Authored comparison payload for an allowlisted concept pair.',
      presence: 'Present only for comparison.',
    },
    {
      field: 'rejection',
      meaning: 'Structural rejection payload with status, decision type, and finality.',
      presence: 'Present only for rejected_concept.',
    },
    {
      field: 'reviewState',
      meaning: 'Lifecycle metadata exposed through concept detail, not through the main resolver outcome.',
      presence: 'Detail-surface only. May appear for concepts that are reviewed or blocked without being live.',
    },
    {
      field: 'contractVersion',
      meaning: 'Declared semantic contract version for the runtime result.',
      presence: 'Always present. Stable top-level field.',
    },
  ] as const;

  protected readonly refusalPrinciples = [
    'Refusal is part of the runtime contract, not a transport failure.',
    'Meaningless input, semantically unmatched input, and unsupported query structures are refused through distinct top-level result types.',
    'The runtime does not guess, soften invalid structure, or synthesize unsupported output.',
  ] as const;

  protected readonly reviewStateTruths = [
    'Authored concept detail may be visible without runtime admission.',
    'reviewState is lifecycle metadata, not runtime admission.',
    'Visible-only or review-backed detail may coexist with a no_exact_match result without changing the top-level runtime type.',
  ] as const;

  protected readonly examples: readonly ContractExample[] = [
    {
      query: 'authority',
      type: 'concept_match',
      queryType: 'exact_concept_query',
      reviewState: null,
      meaning: 'Single admitted concept resolved with authoritative canonical payload.',
    },
    {
      query: 'authority vs power',
      type: 'comparison',
      queryType: 'comparison_query',
      reviewState: null,
      meaning: 'Allowlisted authored comparison returned as a bounded comparison payload.',
    },
    {
      query: 'law',
      type: 'concept_match',
      queryType: 'exact_concept_query',
      reviewState: 'phase2_stable',
      meaning: 'Single admitted concept resolved with authored canonical output while review metadata remains available on the detail surface.',
    },
    {
      query: 'violation',
      type: 'no_exact_match',
      queryType: 'exact_concept_query',
      reviewState: 'visible_only_derived',
      meaning: 'Derived authored detail remains inspectable on the detail surface while the public runtime refuses primitive resolution.',
    },
    {
      query: 'agreement',
      type: 'no_exact_match',
      queryType: 'exact_concept_query',
      reviewState: null,
      meaning: 'Visible-only authored detail can be inspected on the detail surface while the public runtime still refuses live resolution.',
    },
    {
      query: 'fdsfsdfsdfsdfsdfsdf',
      type: 'invalid_query',
      queryType: 'invalid_query',
      reviewState: null,
      meaning: 'Continuous noise input is refused as invalid_query instead of being treated as a semantic miss.',
    },
    {
      query: 'who creates law?',
      type: 'unsupported_query_type',
      queryType: 'role_or_actor_query',
      reviewState: null,
      meaning: 'The query has recognizable structure, but actor reasoning is not supported in the current runtime.',
    },
    {
      query: 'obligation',
      type: 'rejected_concept',
      queryType: 'exact_concept_query',
      reviewState: null,
      meaning: 'Permanent structural rejection is exposed explicitly instead of being collapsed into generic non-match.',
    },
  ] as const;

  protected reviewStateLabel(reviewState: ReviewAdmission): string {
    switch (reviewState) {
      case 'blocked':
        return 'blocked';
      case 'visible_only_derived':
        return 'visible_only_derived';
      case 'phase1_passed':
        return 'phase1_passed';
      case 'phase2_stable':
        return 'phase2_stable';
      case 'pending_overlap_scan':
        return 'pending_overlap_scan';
      case 'overlap_scan_passed':
        return 'overlap_scan_passed';
      case 'overlap_scan_failed_conflict':
        return 'overlap_scan_failed_conflict';
      case 'overlap_scan_failed_duplicate':
        return 'overlap_scan_failed_duplicate';
      case 'overlap_scan_failed_compression':
        return 'overlap_scan_failed_compression';
      case 'overlap_scan_boundary_required':
        return 'overlap_scan_boundary_required';
      default:
        return reviewState;
    }
  }
}
