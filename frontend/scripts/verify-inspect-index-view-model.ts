import assert from 'node:assert/strict';

import { buildInspectIndexPageViewModel } from '../src/app/pages/inspect-index-page/inspect-index-page.view-model.ts';
import { POLICY_SURFACE_DATA } from '../src/app/policies/policy-surface.data.ts';

function main(): void {
  const viewModel = buildInspectIndexPageViewModel(POLICY_SURFACE_DATA);

  assert.equal(viewModel.title, 'Public system integrity surface.');
  assert.equal(viewModel.traceabilityLabel, 'PUBLIC INTEGRITY SURFACE — REGISTRY BACKED');
  assert.equal(viewModel.snapshotCards.length, 4);
  assert.deepEqual(
    viewModel.snapshotCards,
    [
      {
        label: 'Mapped claims',
        value: '121',
        detail: '121 of 121 published claims currently map to implementation evidence.',
      },
      {
        label: 'Refusal boundaries',
        value: '43',
        detail: 'Cross-policy refusal and boundary claims aggregated from current published claim objects.',
      },
      {
        label: 'Integrity status',
        value: 'registry-backed and fully mapped',
        detail: 'No unmapped or conflicting published claims are present.',
      },
      {
        label: 'Guarantees',
        value: '4',
        detail: 'Implementation-backed guarantee bundles linking directly to live claim objects.',
      },
    ],
    'Inspect index snapshot cards must remain registry-backed and deterministic.',
  );

  assert.equal(viewModel.guarantees.length, 4);
  assert.deepEqual(
    viewModel.guarantees.map((guarantee) => ({
      title: guarantee.title,
      claimIds: guarantee.evidenceLinks.map((link) => link.claimId),
    })),
    [
      {
        title: 'Public runtime access stays bounded',
        claimIds: ['terms-1', 'terms-2'],
      },
      {
        title: 'Unsupported input is refused, not guessed through',
        claimIds: ['acceptable-use-6', 'terms-26'],
      },
      {
        title: 'Feedback lifecycle remains explicit',
        claimIds: ['data-retention-1', 'data-retention-6', 'data-retention-12', 'data-retention-13'],
      },
      {
        title: 'Transport stays internal to the product boundary',
        claimIds: ['cookies-1', 'cookies-2', 'privacy-15'],
      },
    ],
    'Guarantee bundles must stay traceable to stable published claim IDs.',
  );

  assert.deepEqual(
    viewModel.surfaces.map((surface) => ({
      route: surface.route,
      mappedClaims: surface.mappedClaims,
      totalClaims: surface.totalClaims,
      refusalBoundaryCount: surface.refusalBoundaryCount,
      integrityStatus: surface.integrityStatus,
    })),
    [
      {
        route: '/inspect/privacy',
        mappedClaims: 37,
        totalClaims: 37,
        refusalBoundaryCount: 12,
        integrityStatus: 'fully mapped',
      },
      {
        route: '/inspect/data-retention',
        mappedClaims: 13,
        totalClaims: 13,
        refusalBoundaryCount: 0,
        integrityStatus: 'fully mapped',
      },
      {
        route: '/inspect/acceptable-use',
        mappedClaims: 28,
        totalClaims: 28,
        refusalBoundaryCount: 20,
        integrityStatus: 'fully mapped',
      },
      {
        route: '/inspect/cookies',
        mappedClaims: 4,
        totalClaims: 4,
        refusalBoundaryCount: 2,
        integrityStatus: 'fully mapped',
      },
      {
        route: '/inspect/terms',
        mappedClaims: 39,
        totalClaims: 39,
        refusalBoundaryCount: 9,
        integrityStatus: 'fully mapped',
      },
    ],
    'Inspect surfaces must remain cross-policy, composable, and claim-backed.',
  );

  console.log('PASS inspect_index_view_model');
}

main();
