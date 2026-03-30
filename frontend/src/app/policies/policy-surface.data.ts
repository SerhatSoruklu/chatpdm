import type { PolicySurfaceRegistry } from './policy-surface.types';

export const POLICY_SURFACE_DATA = {
  "privacy": {
    "key": "privacy",
    "route": "/inspect/privacy",
    "title": "Privacy Policy",
    "subtitle": "Inspectable privacy behavior",
    "intro": "Current rendered policy claims covering feedback event storage, browser session storage, internal proxy header transport, request controls, and runtime refusal boundaries.",
    "sourceTitle": "Privacy Policy — Data Handling",
    "scopeBullets": [
      "feedback event storage",
      "browser session storage",
      "internal proxy header transport",
      "request controls",
      "runtime refusal boundaries"
    ],
    "claims": [
      {
        "id": "privacy-1",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields I",
        "policySentence": "The platform stores `sessionId` in feedback event documents.",
        "canonicalClaim": "The platform stores `sessionId` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:7-11`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:7-11",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "7-11"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-2",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields I",
        "policySentence": "The platform stores `rawQuery` in feedback event documents.",
        "canonicalClaim": "The platform stores `rawQuery` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:12-16`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "sha256",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:12-16",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "12-16"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-3",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields I",
        "policySentence": "The platform stores `normalizedQuery` in feedback event documents.",
        "canonicalClaim": "The platform stores `normalizedQuery` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:17-21`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "sha256",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:17-21",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "17-21"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-4",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields I",
        "policySentence": "The platform stores `responseType` in feedback event documents.",
        "canonicalClaim": "The platform stores `responseType` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:22-26`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:22-26",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "22-26"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-5",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields I",
        "policySentence": "The platform stores `feedbackType` in feedback event documents.",
        "canonicalClaim": "The platform stores `feedbackType` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:27-31`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:27-31",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "27-31"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-6",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields II",
        "policySentence": "The platform stores `resolvedConceptId` in feedback event documents when provided.",
        "canonicalClaim": "The platform stores `resolvedConceptId` in feedback event documents when provided.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:32-36`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:32-36",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "32-36"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-7",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields II",
        "policySentence": "The platform stores `candidateConceptIds` in feedback event documents when provided.",
        "canonicalClaim": "The platform stores `candidateConceptIds` in feedback event documents when provided.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:37-40`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:37-40",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "37-40"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-8",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields II",
        "policySentence": "The platform stores `suggestionConceptIds` in feedback event documents when provided.",
        "canonicalClaim": "The platform stores `suggestionConceptIds` in feedback event documents when provided.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:41-44`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:41-44",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "41-44"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-9",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields II",
        "policySentence": "The platform stores `contractVersion` in feedback event documents.",
        "canonicalClaim": "The platform stores `contractVersion` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:45-49`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:45-49",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "45-49"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-10",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields II",
        "policySentence": "The platform stores `normalizerVersion` in feedback event documents.",
        "canonicalClaim": "The platform stores `normalizerVersion` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:50-54`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:50-54",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "50-54"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-11",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields III",
        "policySentence": "The platform stores `matcherVersion` in feedback event documents.",
        "canonicalClaim": "The platform stores `matcherVersion` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:55-59`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:55-59",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "55-59"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-12",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields III",
        "policySentence": "The platform stores `conceptSetVersion` in feedback event documents.",
        "canonicalClaim": "The platform stores `conceptSetVersion` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:60-64`; `backend/src/modules/feedback/store.js:5-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:60-64",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "60-64"
          },
          {
            "source": "backend/src/modules/feedback/store.js:5-20",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "5-20"
          }
        ]
      },
      {
        "id": "privacy-13",
        "policyFile": "privacy.md",
        "section": "Data Storage — Feedback event fields III",
        "policySentence": "The platform stores `createdAt` in feedback event documents.",
        "canonicalClaim": "The platform stores `createdAt` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:65-69`; `backend/src/modules/feedback/service.js:136-142`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:65-69",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "65-69"
          },
          {
            "source": "backend/src/modules/feedback/service.js:136-142",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "136-142"
          }
        ]
      },
      {
        "id": "privacy-14",
        "policyFile": "privacy.md",
        "section": "Data Storage — Browser local storage",
        "policySentence": "The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.",
        "canonicalClaim": "The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.",
        "claimClass": "stores",
        "systemMapping": "`frontend/src/app/core/feedback/feedback-session.service.ts:4,16-18,23-33`",
        "status": "mapped",
        "notes": "Browser-side storage.",
        "specialNotes": [
          "Browser-side storage."
        ],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "session_bound",
          "retentionReason": "Declared browser-scoped session continuity for the feedback flow.",
          "deletionTrigger": "browser_clear",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext"
        },
        "traces": [
          {
            "source": "frontend/src/app/core/feedback/feedback-session.service.ts:4,16-18,23-33",
            "path": "frontend/src/app/core/feedback/feedback-session.service.ts",
            "lines": "4,16-18,23-33"
          }
        ]
      },
      {
        "id": "privacy-15",
        "policyFile": "privacy.md",
        "section": "Data Handling — Internal proxy transport",
        "policySentence": "The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.",
        "canonicalClaim": "The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.",
        "claimClass": "shares",
        "systemMapping": "`frontend/src/server.ts:123-145`",
        "status": "mapped",
        "notes": "internal SSR transport only",
        "specialNotes": [
          "internal SSR transport only",
          "not third-party disclosure"
        ],
        "hasInternalTransportNote": true,
        "lifecycle": {
          "lifecycleClass": "transport_only",
          "retentionReason": "Declared request-bound SSR transport within the product boundary.",
          "deletionTrigger": "request_complete",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "frontend/src/server.ts:123-145",
            "path": "frontend/src/server.ts",
            "lines": "123-145"
          }
        ]
      },
      {
        "id": "privacy-16",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — Backend request controls",
        "policySentence": "The platform enforces Helmet security middleware on backend requests.",
        "canonicalClaim": "The platform enforces Helmet security middleware on backend requests.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/app.js:17-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/app.js:17-20",
            "path": "backend/src/app.js",
            "lines": "17-20"
          }
        ]
      },
      {
        "id": "privacy-17",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — Backend request controls",
        "policySentence": "The platform enforces CORS on backend requests.",
        "canonicalClaim": "The platform enforces CORS on backend requests.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/app.js:26-27`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/app.js:26-27",
            "path": "backend/src/app.js",
            "lines": "26-27"
          }
        ]
      },
      {
        "id": "privacy-18",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — Backend request controls",
        "policySentence": "The platform enforces backend JSON body size limits of `64kb`.",
        "canonicalClaim": "The platform enforces backend JSON body size limits of `64kb`.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/app.js:26-27`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/app.js:26-27",
            "path": "backend/src/app.js",
            "lines": "26-27"
          }
        ]
      },
      {
        "id": "privacy-19",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — Backend request controls",
        "policySentence": "The platform enforces SSR `/api/*` JSON body size limits of `32kb`.",
        "canonicalClaim": "The platform enforces SSR `/api/*` JSON body size limits of `32kb`.",
        "claimClass": "enforces",
        "systemMapping": "`frontend/src/server.ts:43-45`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "frontend/src/server.ts:43-45",
            "path": "frontend/src/server.ts",
            "lines": "43-45"
          }
        ]
      },
      {
        "id": "privacy-20",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — CORS settings",
        "policySentence": "The platform enforces CORS credentials.",
        "canonicalClaim": "The platform enforces CORS credentials.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/security/cors.js:6-27`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/security/cors.js:6-27",
            "path": "backend/src/security/cors.js",
            "lines": "6-27"
          }
        ]
      },
      {
        "id": "privacy-21",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — CORS settings",
        "policySentence": "The platform enforces CORS methods `GET`, `POST`, and `OPTIONS`.",
        "canonicalClaim": "The platform enforces CORS methods `GET`, `POST`, and `OPTIONS`.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/security/cors.js:22-26`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/security/cors.js:22-26",
            "path": "backend/src/security/cors.js",
            "lines": "22-26"
          }
        ]
      },
      {
        "id": "privacy-22",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — CORS settings",
        "policySentence": "The platform enforces CORS headers `Content-Type` and `Accept`.",
        "canonicalClaim": "The platform enforces CORS headers `Content-Type` and `Accept`.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/security/cors.js:22-26`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/security/cors.js:22-26",
            "path": "backend/src/security/cors.js",
            "lines": "22-26"
          }
        ]
      },
      {
        "id": "privacy-23",
        "policyFile": "privacy.md",
        "section": "Behavior Controls — CORS settings",
        "policySentence": "The platform enforces CORS `maxAge` of `86400`.",
        "canonicalClaim": "The platform enforces CORS `maxAge` of `86400`.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/security/cors.js:22-26`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/security/cors.js:22-26",
            "path": "backend/src/security/cors.js",
            "lines": "22-26"
          }
        ]
      },
      {
        "id": "privacy-24",
        "policyFile": "privacy.md",
        "section": "Boundaries — Invalid request refusal",
        "policySentence": "The platform refuses concept resolution requests when query parameter `q` is missing.",
        "canonicalClaim": "The platform refuses concept resolution requests when query parameter `q` is missing.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-27`",
        "status": "mapped",
        "notes": "Shared validation branch.",
        "specialNotes": [
          "Shared validation branch."
        ],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-27",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-27"
          }
        ]
      },
      {
        "id": "privacy-25",
        "policyFile": "privacy.md",
        "section": "Boundaries — Invalid request refusal",
        "policySentence": "The platform refuses concept resolution requests when query parameter `q` is empty.",
        "canonicalClaim": "The platform refuses concept resolution requests when query parameter `q` is empty.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-27`",
        "status": "mapped",
        "notes": "Shared validation branch.",
        "specialNotes": [
          "Shared validation branch."
        ],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-27",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-27"
          }
        ]
      },
      {
        "id": "privacy-26",
        "policyFile": "privacy.md",
        "section": "Boundaries — Invalid request refusal",
        "policySentence": "The platform refuses concept resolution requests when query parameter `q` is not a string.",
        "canonicalClaim": "The platform refuses concept resolution requests when query parameter `q` is not a string.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-27`",
        "status": "mapped",
        "notes": "Shared validation branch.",
        "specialNotes": [
          "Shared validation branch."
        ],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-27",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-27"
          }
        ]
      },
      {
        "id": "privacy-27",
        "policyFile": "privacy.md",
        "section": "Boundaries — Invalid request refusal",
        "policySentence": "The platform refuses invalid feedback submissions with HTTP `400`.",
        "canonicalClaim": "The platform refuses invalid feedback submissions with HTTP `400`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:16-28`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:16-28",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "16-28"
          }
        ]
      },
      {
        "id": "privacy-28",
        "policyFile": "privacy.md",
        "section": "Boundaries — Invalid request refusal",
        "policySentence": "The platform refuses invalid feedback submissions with error code `invalid_feedback`.",
        "canonicalClaim": "The platform refuses invalid feedback submissions with error code `invalid_feedback`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:21-27`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:21-27",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "21-27"
          }
        ]
      },
      {
        "id": "privacy-29",
        "policyFile": "privacy.md",
        "section": "Boundaries — Unsupported query refusal",
        "policySentence": "The platform refuses unsupported complex queries.",
        "canonicalClaim": "The platform refuses unsupported complex queries.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:191-195`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:191-195",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "191-195"
          }
        ]
      },
      {
        "id": "privacy-30",
        "policyFile": "privacy.md",
        "section": "Boundaries — Unsupported query refusal",
        "policySentence": "The platform refuses relation queries.",
        "canonicalClaim": "The platform refuses relation queries.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:173-179`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:173-179",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "173-179"
          }
        ]
      },
      {
        "id": "privacy-31",
        "policyFile": "privacy.md",
        "section": "Boundaries — Unsupported query refusal",
        "policySentence": "The platform refuses role or actor queries.",
        "canonicalClaim": "The platform refuses role or actor queries.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:182-188`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:182-188",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "182-188"
          }
        ]
      },
      {
        "id": "privacy-32",
        "policyFile": "privacy.md",
        "section": "Boundaries — Unsupported query refusal",
        "policySentence": "The platform refuses canonical lookup requests when no authored concept ID is provided.",
        "canonicalClaim": "The platform refuses canonical lookup requests when no authored concept ID is provided.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:198-204`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:198-204",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "198-204"
          }
        ]
      },
      {
        "id": "privacy-33",
        "policyFile": "privacy.md",
        "section": "Boundaries — Unsupported query refusal",
        "policySentence": "The platform refuses canonical lookup requests when no authored concept exists for the requested ID.",
        "canonicalClaim": "The platform refuses canonical lookup requests when no authored concept exists for the requested ID.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:206-210`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:206-210",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "206-210"
          }
        ]
      },
      {
        "id": "privacy-34",
        "policyFile": "privacy.md",
        "section": "Boundaries — Scope and comparison refusal",
        "policySentence": "The platform refuses comparison queries outside the allowlisted comparison set.",
        "canonicalClaim": "The platform refuses comparison queries outside the allowlisted comparison set.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/comparison-resolver.js:20-22,46-55`; `backend/src/modules/concepts/resolver.js:109-130`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/comparison-resolver.js:20-22,46-55",
            "path": "backend/src/modules/concepts/comparison-resolver.js",
            "lines": "20-22,46-55"
          },
          {
            "source": "backend/src/modules/concepts/resolver.js:109-130",
            "path": "backend/src/modules/concepts/resolver.js",
            "lines": "109-130"
          }
        ]
      },
      {
        "id": "privacy-35",
        "policyFile": "privacy.md",
        "section": "Conditions — Scope-triggered controls",
        "policySentence": "The platform enforces governance-domain scope handling for governance-scoped concepts with non-governance signals.",
        "canonicalClaim": "The platform enforces governance-domain scope handling for governance-scoped concepts with non-governance signals.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/modules/concepts/governance-scope-enforcer.js:108-133`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/governance-scope-enforcer.js:108-133",
            "path": "backend/src/modules/concepts/governance-scope-enforcer.js",
            "lines": "108-133"
          }
        ]
      },
      {
        "id": "privacy-36",
        "policyFile": "privacy.md",
        "section": "Conditions — Scope-triggered controls",
        "policySentence": "The platform enforces product-response validation before resolver output returns.",
        "canonicalClaim": "The platform enforces product-response validation before resolver output returns.",
        "claimClass": "enforces",
        "systemMapping": "`backend/src/modules/concepts/resolver.js:18,106,179`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/resolver.js:18,106,179",
            "path": "backend/src/modules/concepts/resolver.js",
            "lines": "18,106,179"
          }
        ]
      },
      {
        "id": "privacy-37",
        "policyFile": "privacy.md",
        "section": "Conditions — Scope-triggered controls",
        "policySentence": "The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.",
        "canonicalClaim": "The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/resolver.js:87-107`; `backend/src/modules/concepts/governance-scope-enforcer.js:44-45,108-133`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/resolver.js:87-107",
            "path": "backend/src/modules/concepts/resolver.js",
            "lines": "87-107"
          },
          {
            "source": "backend/src/modules/concepts/governance-scope-enforcer.js:44-45,108-133",
            "path": "backend/src/modules/concepts/governance-scope-enforcer.js",
            "lines": "44-45,108-133"
          }
        ]
      }
    ],
    "summary": {
      "totalClaims": 37,
      "mappedClaims": 37,
      "claimClasses": [
        "stores",
        "shares",
        "enforces",
        "refuses"
      ],
      "internalTransportNoteCount": 1
    }
  },
  "terms": {
    "key": "terms",
    "route": "/inspect/terms",
    "title": "Terms of Service",
    "subtitle": "Runtime rules and allowed use",
    "intro": "Current rendered policy claims covering concept resolution access, feedback submission access, feedback input schema, response type limits, and comparison output limits.",
    "sourceTitle": "Terms of Service — Runtime Operations",
    "scopeBullets": [
      "concept resolution access",
      "feedback submission access",
      "feedback input schema",
      "response type limits",
      "comparison output limits"
    ],
    "claims": [
      {
        "id": "terms-1",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Endpoint access",
        "policySentence": "The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.",
        "canonicalClaim": "The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-31`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-31",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-31"
          }
        ]
      },
      {
        "id": "terms-2",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Endpoint access",
        "policySentence": "The platform allows feedback submission through `POST /api/v1/feedback`.",
        "canonicalClaim": "The platform allows feedback submission through `POST /api/v1/feedback`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:16-19`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:16-19",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "16-19"
          }
        ]
      },
      {
        "id": "terms-3",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields I",
        "policySentence": "The platform allows feedback field `sessionId`.",
        "canonicalClaim": "The platform allows feedback field `sessionId`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-4",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields I",
        "policySentence": "The platform allows feedback field `rawQuery`.",
        "canonicalClaim": "The platform allows feedback field `rawQuery`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-5",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields I",
        "policySentence": "The platform allows feedback field `normalizedQuery`.",
        "canonicalClaim": "The platform allows feedback field `normalizedQuery`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-6",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields I",
        "policySentence": "The platform allows feedback field `responseType`.",
        "canonicalClaim": "The platform allows feedback field `responseType`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-7",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields I",
        "policySentence": "The platform allows feedback field `feedbackType`.",
        "canonicalClaim": "The platform allows feedback field `feedbackType`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-8",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields II",
        "policySentence": "The platform allows feedback field `resolvedConceptId`.",
        "canonicalClaim": "The platform allows feedback field `resolvedConceptId`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-9",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields II",
        "policySentence": "The platform allows feedback field `candidateConceptIds`.",
        "canonicalClaim": "The platform allows feedback field `candidateConceptIds`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-10",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields II",
        "policySentence": "The platform allows feedback field `suggestionConceptIds`.",
        "canonicalClaim": "The platform allows feedback field `suggestionConceptIds`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-11",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields II",
        "policySentence": "The platform allows feedback field `contractVersion`.",
        "canonicalClaim": "The platform allows feedback field `contractVersion`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-12",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields II",
        "policySentence": "The platform allows feedback field `normalizerVersion`.",
        "canonicalClaim": "The platform allows feedback field `normalizerVersion`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-13",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields III",
        "policySentence": "The platform allows feedback field `matcherVersion`.",
        "canonicalClaim": "The platform allows feedback field `matcherVersion`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-14",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback fields III",
        "policySentence": "The platform allows feedback field `conceptSetVersion`.",
        "canonicalClaim": "The platform allows feedback field `conceptSetVersion`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-46`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-46",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-46"
          }
        ]
      },
      {
        "id": "terms-15",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback response types",
        "policySentence": "The platform allows feedback response type `concept_match`.",
        "canonicalClaim": "The platform allows feedback response type `concept_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:3`; `backend/src/modules/feedback/service.js:67-69`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:3",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "3"
          },
          {
            "source": "backend/src/modules/feedback/service.js:67-69",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "67-69"
          }
        ]
      },
      {
        "id": "terms-16",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback response types",
        "policySentence": "The platform allows feedback response type `ambiguous_match`.",
        "canonicalClaim": "The platform allows feedback response type `ambiguous_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:3`; `backend/src/modules/feedback/service.js:67-69`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:3",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "3"
          },
          {
            "source": "backend/src/modules/feedback/service.js:67-69",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "67-69"
          }
        ]
      },
      {
        "id": "terms-17",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Feedback response types",
        "policySentence": "The platform allows feedback response type `no_exact_match`.",
        "canonicalClaim": "The platform allows feedback response type `no_exact_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:3`; `backend/src/modules/feedback/service.js:67-69`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:3",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "3"
          },
          {
            "source": "backend/src/modules/feedback/service.js:67-69",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "67-69"
          }
        ]
      },
      {
        "id": "terms-18",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Concept match options",
        "policySentence": "The platform allows feedback option `clear` for `concept_match`.",
        "canonicalClaim": "The platform allows feedback option `clear` for `concept_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          }
        ]
      },
      {
        "id": "terms-19",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Concept match options",
        "policySentence": "The platform allows feedback option `unclear` for `concept_match`.",
        "canonicalClaim": "The platform allows feedback option `unclear` for `concept_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          }
        ]
      },
      {
        "id": "terms-20",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Concept match options",
        "policySentence": "The platform allows feedback option `wrong_concept` for `concept_match`.",
        "canonicalClaim": "The platform allows feedback option `wrong_concept` for `concept_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          }
        ]
      },
      {
        "id": "terms-21",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Ambiguous match options",
        "policySentence": "The platform allows feedback option `found_right_one` for `ambiguous_match`.",
        "canonicalClaim": "The platform allows feedback option `found_right_one` for `ambiguous_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          }
        ]
      },
      {
        "id": "terms-22",
        "policyFile": "terms.md",
        "section": "Data and Behavior — Ambiguous match options",
        "policySentence": "The platform allows feedback option `still_not_right` for `ambiguous_match`.",
        "canonicalClaim": "The platform allows feedback option `still_not_right` for `ambiguous_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          }
        ]
      },
      {
        "id": "terms-23",
        "policyFile": "terms.md",
        "section": "Data and Behavior — No exact match options",
        "policySentence": "The platform allows feedback option `expected` for `no_exact_match`.",
        "canonicalClaim": "The platform allows feedback option `expected` for `no_exact_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          }
        ]
      },
      {
        "id": "terms-24",
        "policyFile": "terms.md",
        "section": "Data and Behavior — No exact match options",
        "policySentence": "The platform allows feedback option `should_exist` for `no_exact_match`.",
        "canonicalClaim": "The platform allows feedback option `should_exist` for `no_exact_match`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          }
        ]
      },
      {
        "id": "terms-25",
        "policyFile": "terms.md",
        "section": "Boundaries — Origin and payload constraints",
        "policySentence": "The platform does not allow CORS requests from origins outside the normalized allowed origin set.",
        "canonicalClaim": "The platform does not allow CORS requests from origins outside the normalized allowed origin set.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/security/cors.js:7-20`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/security/cors.js:7-20",
            "path": "backend/src/security/cors.js",
            "lines": "7-20"
          }
        ]
      },
      {
        "id": "terms-26",
        "policyFile": "terms.md",
        "section": "Boundaries — Origin and payload constraints",
        "policySentence": "The platform does not allow feedback payload keys outside the approved field set.",
        "canonicalClaim": "The platform does not allow feedback payload keys outside the approved field set.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:33-52`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:33-52",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "33-52"
          }
        ]
      },
      {
        "id": "terms-27",
        "policyFile": "terms.md",
        "section": "Boundaries — Origin and payload constraints",
        "policySentence": "The platform does not allow unsupported `responseType` values.",
        "canonicalClaim": "The platform does not allow unsupported `responseType` values.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:67-69`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:67-69",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "67-69"
          }
        ]
      },
      {
        "id": "terms-28",
        "policyFile": "terms.md",
        "section": "Boundaries — Origin and payload constraints",
        "policySentence": "The platform does not allow invalid `feedbackType` and `responseType` combinations.",
        "canonicalClaim": "The platform does not allow invalid `feedbackType` and `responseType` combinations.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:71-77`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:71-77",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "71-77"
          }
        ]
      },
      {
        "id": "terms-29",
        "policyFile": "terms.md",
        "section": "Boundaries — Concept match constraints",
        "policySentence": "The platform does not allow candidate concept IDs on `concept_match` feedback.",
        "canonicalClaim": "The platform does not allow candidate concept IDs on `concept_match` feedback.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:92-97`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:92-97",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "92-97"
          }
        ]
      },
      {
        "id": "terms-30",
        "policyFile": "terms.md",
        "section": "Boundaries — Concept match constraints",
        "policySentence": "The platform does not allow suggestion concept IDs on `concept_match` feedback.",
        "canonicalClaim": "The platform does not allow suggestion concept IDs on `concept_match` feedback.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:92-97`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:92-97",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "92-97"
          }
        ]
      },
      {
        "id": "terms-31",
        "policyFile": "terms.md",
        "section": "Boundaries — Ambiguous match constraints",
        "policySentence": "The platform does not allow `ambiguous_match` feedback with fewer than two candidate concept IDs.",
        "canonicalClaim": "The platform does not allow `ambiguous_match` feedback with fewer than two candidate concept IDs.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:100-105`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:100-105",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "100-105"
          }
        ]
      },
      {
        "id": "terms-32",
        "policyFile": "terms.md",
        "section": "Boundaries — Ambiguous match constraints",
        "policySentence": "The platform does not allow suggestion concept IDs on `ambiguous_match` feedback.",
        "canonicalClaim": "The platform does not allow suggestion concept IDs on `ambiguous_match` feedback.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:107-109`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:107-109",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "107-109"
          }
        ]
      },
      {
        "id": "terms-33",
        "policyFile": "terms.md",
        "section": "Boundaries — No exact match constraints",
        "policySentence": "The platform does not allow candidate concept IDs on `no_exact_match` feedback.",
        "canonicalClaim": "The platform does not allow candidate concept IDs on `no_exact_match` feedback.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/feedback/service.js:112-115`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:112-115",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "112-115"
          }
        ]
      },
      {
        "id": "terms-34",
        "policyFile": "terms.md",
        "section": "Boundaries — Comparison constraints",
        "policySentence": "The platform does not allow comparison output for non-allowlisted concept pairs.",
        "canonicalClaim": "The platform does not allow comparison output for non-allowlisted concept pairs.",
        "claimClass": "does_not_allow",
        "systemMapping": "`backend/src/modules/concepts/comparison-resolver.js:20-22,46-55`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/comparison-resolver.js:20-22,46-55",
            "path": "backend/src/modules/concepts/comparison-resolver.js",
            "lines": "20-22,46-55"
          }
        ]
      }
    ],
    "termsTruth": {
      "endpointContracts": [
        {
          "claimId": "terms-1",
          "operation": "concept_resolution",
          "method": "GET",
          "path": "/api/v1/concepts/resolve",
          "requiredQueryParam": "q",
          "evidence": [
            {
              "source": "backend/src/routes/api/v1/concepts.route.js:16-31",
              "path": "backend/src/routes/api/v1/concepts.route.js",
              "lines": "16-31"
            }
          ]
        },
        {
          "claimId": "terms-2",
          "operation": "feedback_submission",
          "method": "POST",
          "path": "/api/v1/feedback",
          "evidence": [
            {
              "source": "backend/src/routes/api/v1/feedback.route.js:16-19",
              "path": "backend/src/routes/api/v1/feedback.route.js",
              "lines": "16-19"
            }
          ]
        }
      ],
      "fieldContracts": [
        {
          "claimId": "terms-3",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "sessionId",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-4",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "rawQuery",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-5",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "normalizedQuery",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-6",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "responseType",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-7",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-8",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "resolvedConceptId",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-9",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "candidateConceptIds",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-10",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "suggestionConceptIds",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-11",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "contractVersion",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-12",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "normalizerVersion",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-13",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "matcherVersion",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-14",
          "fieldContractType": "request_field",
          "scope": "feedback_submission",
          "fieldName": "conceptSetVersion",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-46",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-46"
            }
          ]
        },
        {
          "claimId": "terms-15",
          "fieldContractType": "enum_value",
          "scope": "feedback_submission",
          "fieldName": "responseType",
          "allowedValue": "concept_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:3",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "3"
            },
            {
              "source": "backend/src/modules/feedback/service.js:67-69",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "67-69"
            }
          ]
        },
        {
          "claimId": "terms-16",
          "fieldContractType": "enum_value",
          "scope": "feedback_submission",
          "fieldName": "responseType",
          "allowedValue": "ambiguous_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:3",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "3"
            },
            {
              "source": "backend/src/modules/feedback/service.js:67-69",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "67-69"
            }
          ]
        },
        {
          "claimId": "terms-17",
          "fieldContractType": "enum_value",
          "scope": "feedback_submission",
          "fieldName": "responseType",
          "allowedValue": "no_exact_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:3",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "3"
            },
            {
              "source": "backend/src/modules/feedback/service.js:67-69",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "67-69"
            }
          ]
        },
        {
          "claimId": "terms-18",
          "fieldContractType": "conditional_option",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "allowedValue": "clear",
          "conditionField": "responseType",
          "conditionValue": "concept_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:5-8",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "5-8"
            }
          ]
        },
        {
          "claimId": "terms-19",
          "fieldContractType": "conditional_option",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "allowedValue": "unclear",
          "conditionField": "responseType",
          "conditionValue": "concept_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:5-8",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "5-8"
            }
          ]
        },
        {
          "claimId": "terms-20",
          "fieldContractType": "conditional_option",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "allowedValue": "wrong_concept",
          "conditionField": "responseType",
          "conditionValue": "concept_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:5-8",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "5-8"
            }
          ]
        },
        {
          "claimId": "terms-21",
          "fieldContractType": "conditional_option",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "allowedValue": "found_right_one",
          "conditionField": "responseType",
          "conditionValue": "ambiguous_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:5-8",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "5-8"
            }
          ]
        },
        {
          "claimId": "terms-22",
          "fieldContractType": "conditional_option",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "allowedValue": "still_not_right",
          "conditionField": "responseType",
          "conditionValue": "ambiguous_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:5-8",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "5-8"
            }
          ]
        },
        {
          "claimId": "terms-23",
          "fieldContractType": "conditional_option",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "allowedValue": "expected",
          "conditionField": "responseType",
          "conditionValue": "no_exact_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:5-8",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "5-8"
            }
          ]
        },
        {
          "claimId": "terms-24",
          "fieldContractType": "conditional_option",
          "scope": "feedback_submission",
          "fieldName": "feedbackType",
          "allowedValue": "should_exist",
          "conditionField": "responseType",
          "conditionValue": "no_exact_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/constants.js:5-8",
              "path": "backend/src/modules/feedback/constants.js",
              "lines": "5-8"
            }
          ]
        }
      ],
      "platformRules": [
        {
          "claimId": "terms-25",
          "ruleType": "cors_origin_allowlist",
          "subject": "cross_origin_request",
          "effect": "reject_outside_normalized_allowed_origin_set",
          "evidence": [
            {
              "source": "backend/src/security/cors.js:7-20",
              "path": "backend/src/security/cors.js",
              "lines": "7-20"
            }
          ]
        }
      ],
      "runtimeBoundaries": [
        {
          "claimId": "terms-34",
          "boundaryType": "comparison_output_allowlist",
          "subject": "comparison_output",
          "effect": "blocked",
          "condition": "non_allowlisted_concept_pairs",
          "evidence": [
            {
              "source": "backend/src/modules/concepts/comparison-resolver.js:20-22,46-55",
              "path": "backend/src/modules/concepts/comparison-resolver.js",
              "lines": "20-22,46-55"
            }
          ]
        }
      ],
      "refusalBoundaries": [
        {
          "claimId": "terms-26",
          "boundaryType": "payload_keys_outside_approved_field_set",
          "scope": "feedback_submission",
          "fieldName": "payload",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:33-52",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "33-52"
            }
          ]
        },
        {
          "claimId": "terms-27",
          "boundaryType": "unsupported_response_type",
          "scope": "feedback_submission",
          "fieldName": "responseType",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:67-69",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "67-69"
            }
          ]
        },
        {
          "claimId": "terms-28",
          "boundaryType": "invalid_feedback_type_response_type_combination",
          "scope": "feedback_submission",
          "relatedFields": [
            "feedbackType",
            "responseType"
          ],
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:71-77",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "71-77"
            }
          ]
        },
        {
          "claimId": "terms-29",
          "boundaryType": "disallowed_candidate_ids",
          "scope": "feedback_submission",
          "fieldName": "candidateConceptIds",
          "conditionField": "responseType",
          "conditionValue": "concept_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:92-97",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "92-97"
            }
          ]
        },
        {
          "claimId": "terms-30",
          "boundaryType": "disallowed_suggestion_ids",
          "scope": "feedback_submission",
          "fieldName": "suggestionConceptIds",
          "conditionField": "responseType",
          "conditionValue": "concept_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:92-97",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "92-97"
            }
          ]
        },
        {
          "claimId": "terms-31",
          "boundaryType": "minimum_candidate_ids",
          "scope": "feedback_submission",
          "fieldName": "candidateConceptIds",
          "conditionField": "responseType",
          "conditionValue": "ambiguous_match",
          "minimumCount": 2,
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:100-105",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "100-105"
            }
          ]
        },
        {
          "claimId": "terms-32",
          "boundaryType": "disallowed_suggestion_ids",
          "scope": "feedback_submission",
          "fieldName": "suggestionConceptIds",
          "conditionField": "responseType",
          "conditionValue": "ambiguous_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:107-109",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "107-109"
            }
          ]
        },
        {
          "claimId": "terms-33",
          "boundaryType": "disallowed_candidate_ids",
          "scope": "feedback_submission",
          "fieldName": "candidateConceptIds",
          "conditionField": "responseType",
          "conditionValue": "no_exact_match",
          "evidence": [
            {
              "source": "backend/src/modules/feedback/service.js:112-115",
              "path": "backend/src/modules/feedback/service.js",
              "lines": "112-115"
            }
          ]
        }
      ]
    },
    "summary": {
      "totalClaims": 34,
      "mappedClaims": 34,
      "claimClasses": [
        "allows",
        "does_not_allow"
      ],
      "internalTransportNoteCount": 0
    }
  },
  "cookies": {
    "key": "cookies",
    "route": "/inspect/cookies",
    "title": "Cookie Policy",
    "subtitle": "Browser and SSR cookie behavior",
    "intro": "Current rendered policy claims covering internal proxy cookie transport, internal proxy set-cookie transport, and product-internal SSR handling.",
    "sourceTitle": "Cookie Policy — Internal Proxy Transport",
    "scopeBullets": [
      "internal proxy cookie transport",
      "internal proxy set-cookie transport",
      "product-internal SSR handling"
    ],
    "claims": [
      {
        "id": "cookies-1",
        "policyFile": "cookies.md",
        "section": "Data Handling — Internal proxy forwarding",
        "policySentence": "The platform shares incoming `cookie` headers with the API proxy target through the SSR layer.",
        "canonicalClaim": "The platform shares incoming `cookie` headers with the API proxy target through the SSR layer.",
        "claimClass": "shares",
        "systemMapping": "`frontend/src/server.ts:123-135`",
        "status": "mapped",
        "notes": "internal SSR transport only",
        "specialNotes": [
          "internal SSR transport only",
          "not third-party disclosure"
        ],
        "hasInternalTransportNote": true,
        "lifecycle": {
          "lifecycleClass": "transport_only",
          "retentionReason": "Declared request-bound SSR transport within the product boundary.",
          "deletionTrigger": "request_complete",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "frontend/src/server.ts:123-135",
            "path": "frontend/src/server.ts",
            "lines": "123-135"
          }
        ]
      },
      {
        "id": "cookies-2",
        "policyFile": "cookies.md",
        "section": "Data Handling — Internal proxy forwarding",
        "policySentence": "The platform shares upstream `set-cookie` headers with the client response through the SSR layer.",
        "canonicalClaim": "The platform shares upstream `set-cookie` headers with the client response through the SSR layer.",
        "claimClass": "shares",
        "systemMapping": "`frontend/src/server.ts:103-120`",
        "status": "mapped",
        "notes": "internal SSR transport only",
        "specialNotes": [
          "internal SSR transport only",
          "not third-party disclosure"
        ],
        "hasInternalTransportNote": true,
        "lifecycle": {
          "lifecycleClass": "transport_only",
          "retentionReason": "Declared request-bound SSR transport within the product boundary.",
          "deletionTrigger": "request_complete",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "frontend/src/server.ts:103-120",
            "path": "frontend/src/server.ts",
            "lines": "103-120"
          }
        ]
      },
      {
        "id": "cookies-3",
        "policyFile": "cookies.md",
        "section": "Boundaries — Conditional forwarding",
        "policySentence": "The platform does not allow SSR forwarding of cookie headers when the incoming request omits them.",
        "canonicalClaim": "The platform does not allow SSR forwarding of cookie headers when the incoming request omits them.",
        "claimClass": "does_not_share",
        "systemMapping": "`frontend/src/server.ts:123-135`",
        "status": "mapped",
        "notes": "internal SSR transport only",
        "specialNotes": [
          "internal SSR transport only",
          "not third-party disclosure"
        ],
        "hasInternalTransportNote": true,
        "lifecycle": {
          "lifecycleClass": "transport_only",
          "retentionReason": "Declared request-bound SSR transport within the product boundary.",
          "deletionTrigger": "request_complete",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "frontend/src/server.ts:123-135",
            "path": "frontend/src/server.ts",
            "lines": "123-135"
          }
        ]
      },
      {
        "id": "cookies-4",
        "policyFile": "cookies.md",
        "section": "Boundaries — Conditional forwarding",
        "policySentence": "The platform does not allow SSR forwarding of upstream set-cookie headers when upstream responses omit them.",
        "canonicalClaim": "The platform does not allow SSR forwarding of upstream set-cookie headers when upstream responses omit them.",
        "claimClass": "does_not_share",
        "systemMapping": "`frontend/src/server.ts:114-119`",
        "status": "mapped",
        "notes": "internal SSR transport only",
        "specialNotes": [
          "internal SSR transport only",
          "not third-party disclosure"
        ],
        "hasInternalTransportNote": true,
        "lifecycle": {
          "lifecycleClass": "transport_only",
          "retentionReason": "Declared request-bound SSR transport within the product boundary.",
          "deletionTrigger": "request_complete",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "frontend/src/server.ts:114-119",
            "path": "frontend/src/server.ts",
            "lines": "114-119"
          }
        ]
      }
    ],
    "cookiesTruth": [
      {
        "claimId": "cookies-1",
        "flowType": "request_forward",
        "mechanism": "cookie_header",
        "essentiality": "essential",
        "ssrRelevance": "direct",
        "browserRelevance": "request_origin",
        "transportPlacement": "browser_to_upstream_via_ssr",
        "transportRole": "request_transport",
        "browserNoteRelevance": "direct",
        "evidence": [
          {
            "source": "frontend/src/server.ts:123-135",
            "path": "frontend/src/server.ts",
            "lines": "123-135"
          }
        ]
      },
      {
        "claimId": "cookies-2",
        "flowType": "response_forward",
        "mechanism": "set_cookie_header",
        "essentiality": "essential",
        "ssrRelevance": "direct",
        "browserRelevance": "response_target",
        "transportPlacement": "upstream_to_browser_via_ssr",
        "transportRole": "response_transport",
        "browserNoteRelevance": "direct",
        "evidence": [
          {
            "source": "frontend/src/server.ts:103-120",
            "path": "frontend/src/server.ts",
            "lines": "103-120"
          }
        ]
      },
      {
        "claimId": "cookies-3",
        "flowType": "request_omit",
        "mechanism": "cookie_header",
        "essentiality": "essential",
        "ssrRelevance": "direct",
        "browserRelevance": "request_origin",
        "transportPlacement": "browser_to_upstream_via_ssr",
        "transportRole": "request_transport",
        "browserNoteRelevance": "direct",
        "evidence": [
          {
            "source": "frontend/src/server.ts:123-135",
            "path": "frontend/src/server.ts",
            "lines": "123-135"
          }
        ]
      },
      {
        "claimId": "cookies-4",
        "flowType": "response_omit",
        "mechanism": "set_cookie_header",
        "essentiality": "essential",
        "ssrRelevance": "direct",
        "browserRelevance": "response_target",
        "transportPlacement": "upstream_to_browser_via_ssr",
        "transportRole": "response_transport",
        "browserNoteRelevance": "direct",
        "evidence": [
          {
            "source": "frontend/src/server.ts:114-119",
            "path": "frontend/src/server.ts",
            "lines": "114-119"
          }
        ]
      }
    ],
    "summary": {
      "totalClaims": 4,
      "mappedClaims": 4,
      "claimClasses": [
        "shares",
        "does_not_share"
      ],
      "internalTransportNoteCount": 4
    }
  },
  "data-retention": {
    "key": "data-retention",
    "route": "/inspect/data-retention",
    "title": "Data Retention / Data Usage",
    "subtitle": "Lifecycle, storage, and expiry evidence",
    "intro": "Current rendered policy claims covering feedback persistence lifecycle and expiry, browser session continuity for feedback controls, request-bound SSR transport evidence, and session-bound export and delete controls.",
    "sourceTitle": "Data Retention / Data Usage",
    "scopeBullets": [
      "feedback persistence lifecycle and expiry",
      "browser session continuity for feedback controls",
      "request-bound SSR transport evidence",
      "session-bound export and delete controls"
    ],
    "claims": [
      {
        "id": "data-retention-1",
        "policyFile": "data-retention.md",
        "section": "Runtime Snapshot",
        "policySentence": "The platform derives `expiresAt` before feedback event persistence.",
        "canonicalClaim": "The platform derives `expiresAt` before feedback event persistence.",
        "claimClass": "derives",
        "systemMapping": "`backend/src/modules/feedback/lifecycle-contract.js:105-116`; `backend/src/modules/feedback/service.js:149-160`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/lifecycle-contract.js:105-116",
            "path": "backend/src/modules/feedback/lifecycle-contract.js",
            "lines": "105-116"
          },
          {
            "source": "backend/src/modules/feedback/service.js:149-160",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "149-160"
          }
        ]
      },
      {
        "id": "data-retention-2",
        "policyFile": "data-retention.md",
        "section": "Runtime Snapshot",
        "policySentence": "The platform stores `expiresAt` in feedback event documents.",
        "canonicalClaim": "The platform stores `expiresAt` in feedback event documents.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:74-82`; `backend/src/modules/feedback/store.js:47-66,174-191`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:74-82",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "74-82"
          },
          {
            "source": "backend/src/modules/feedback/store.js:47-66,174-191",
            "path": "backend/src/modules/feedback/store.js",
            "lines": "47-66,174-191"
          }
        ]
      },
      {
        "id": "data-retention-3",
        "policyFile": "data-retention.md",
        "section": "Runtime Snapshot",
        "policySentence": "The platform exposes feedback export and delete controls by `sessionId`.",
        "canonicalClaim": "The platform exposes feedback export and delete controls by `sessionId`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:12-17,45-93`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:12-17,45-93",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "12-17,45-93"
          }
        ]
      },
      {
        "id": "data-retention-4",
        "policyFile": "data-retention.md",
        "section": "Lifecycle Bands — Short-lived persistence",
        "policySentence": "The platform stores `rawQuery` in feedback event documents as a `sha256` digest.",
        "canonicalClaim": "The platform stores `rawQuery` in feedback event documents as a `sha256` digest.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/lifecycle-contract.js:73-79,89-145`; `backend/src/modules/feedback/feedback-event.model.js:13-21`; `backend/src/modules/feedback/service.js:149-158`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "sha256",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/lifecycle-contract.js:73-79,89-145",
            "path": "backend/src/modules/feedback/lifecycle-contract.js",
            "lines": "73-79,89-145"
          },
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:13-21",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "13-21"
          },
          {
            "source": "backend/src/modules/feedback/service.js:149-158",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "149-158"
          }
        ]
      },
      {
        "id": "data-retention-5",
        "policyFile": "data-retention.md",
        "section": "Lifecycle Bands — Short-lived persistence",
        "policySentence": "The platform stores `normalizedQuery` in feedback event documents as a `sha256` digest.",
        "canonicalClaim": "The platform stores `normalizedQuery` in feedback event documents as a `sha256` digest.",
        "claimClass": "stores",
        "systemMapping": "`backend/src/modules/feedback/lifecycle-contract.js:73-79,93-145`; `backend/src/modules/feedback/feedback-event.model.js:22-30`; `backend/src/modules/feedback/service.js:149-160`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "short_lived",
          "ttlDays": 30,
          "retentionReason": "Declared short-lived retention window for feedback event review and contract calibration.",
          "deletionTrigger": "ttl_expiry",
          "enforcementStatus": "declared_only",
          "storageForm": "sha256",
          "controls": {
            "exportBy": "sessionId",
            "deleteBy": "sessionId",
            "auditTrail": "whitelist_only_operational_metadata"
          }
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/lifecycle-contract.js:73-79,93-145",
            "path": "backend/src/modules/feedback/lifecycle-contract.js",
            "lines": "73-79,93-145"
          },
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:22-30",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "22-30"
          },
          {
            "source": "backend/src/modules/feedback/service.js:149-160",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "149-160"
          }
        ]
      },
      {
        "id": "data-retention-6",
        "policyFile": "data-retention.md",
        "section": "Lifecycle Bands — Short-lived persistence",
        "policySentence": "The platform deletes feedback event documents through a TTL index on `expiresAt`.",
        "canonicalClaim": "The platform deletes feedback event documents through a TTL index on `expiresAt`.",
        "claimClass": "deletes",
        "systemMapping": "`backend/src/modules/feedback/feedback-event.model.js:89-95`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/feedback-event.model.js:89-95",
            "path": "backend/src/modules/feedback/feedback-event.model.js",
            "lines": "89-95"
          }
        ]
      },
      {
        "id": "data-retention-7",
        "policyFile": "data-retention.md",
        "section": "Lifecycle Bands — Session-bound continuity",
        "policySentence": "The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.",
        "canonicalClaim": "The platform stores a feedback session identifier in browser local storage under `chatpdm-beta-session-id`.",
        "claimClass": "stores",
        "systemMapping": "`frontend/src/app/core/feedback/feedback-session.service.ts:4-33`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "session_bound",
          "retentionReason": "Declared browser-scoped session continuity for the feedback flow.",
          "deletionTrigger": "browser_clear",
          "enforcementStatus": "declared_only",
          "storageForm": "plaintext"
        },
        "traces": [
          {
            "source": "frontend/src/app/core/feedback/feedback-session.service.ts:4-33",
            "path": "frontend/src/app/core/feedback/feedback-session.service.ts",
            "lines": "4-33"
          }
        ]
      },
      {
        "id": "data-retention-8",
        "policyFile": "data-retention.md",
        "section": "Lifecycle Bands — Transport-only flow",
        "policySentence": "The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.",
        "canonicalClaim": "The platform shares incoming `x-forwarded-for` headers with the API proxy target through the SSR layer.",
        "claimClass": "shares",
        "systemMapping": "`frontend/src/server.ts:123-145`",
        "status": "mapped",
        "notes": "internal SSR transport only",
        "specialNotes": [
          "internal SSR transport only",
          "not third-party disclosure"
        ],
        "hasInternalTransportNote": true,
        "lifecycle": {
          "lifecycleClass": "transport_only",
          "retentionReason": "Declared request-bound SSR transport within the product boundary.",
          "deletionTrigger": "request_complete",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "frontend/src/server.ts:123-145",
            "path": "frontend/src/server.ts",
            "lines": "123-145"
          }
        ]
      },
      {
        "id": "data-retention-9",
        "policyFile": "data-retention.md",
        "section": "Retention Path",
        "policySentence": "The platform minimizes `rawQuery` before persistence.",
        "canonicalClaim": "The platform minimizes `rawQuery` before persistence.",
        "claimClass": "minimizes",
        "systemMapping": "`backend/src/modules/feedback/lifecycle-contract.js:89-145`; `backend/src/modules/feedback/service.js:149-158`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/lifecycle-contract.js:89-145",
            "path": "backend/src/modules/feedback/lifecycle-contract.js",
            "lines": "89-145"
          },
          {
            "source": "backend/src/modules/feedback/service.js:149-158",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "149-158"
          }
        ]
      },
      {
        "id": "data-retention-10",
        "policyFile": "data-retention.md",
        "section": "Retention Path",
        "policySentence": "The platform minimizes `normalizedQuery` before persistence.",
        "canonicalClaim": "The platform minimizes `normalizedQuery` before persistence.",
        "claimClass": "minimizes",
        "systemMapping": "`backend/src/modules/feedback/lifecycle-contract.js:93-145`; `backend/src/modules/feedback/service.js:149-160`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/lifecycle-contract.js:93-145",
            "path": "backend/src/modules/feedback/lifecycle-contract.js",
            "lines": "93-145"
          },
          {
            "source": "backend/src/modules/feedback/service.js:149-160",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "149-160"
          }
        ]
      },
      {
        "id": "data-retention-11",
        "policyFile": "data-retention.md",
        "section": "Retention Path",
        "policySentence": "The platform derives `expiresAt` from `createdAt` using the live feedback lifecycle contract before persistence.",
        "canonicalClaim": "The platform derives `expiresAt` from `createdAt` using the live feedback lifecycle contract before persistence.",
        "claimClass": "derives",
        "systemMapping": "`backend/src/modules/feedback/lifecycle-contract.js:12-117`; `backend/src/modules/feedback/service.js:149-160`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/lifecycle-contract.js:12-117",
            "path": "backend/src/modules/feedback/lifecycle-contract.js",
            "lines": "12-117"
          },
          {
            "source": "backend/src/modules/feedback/service.js:149-160",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "149-160"
          }
        ]
      },
      {
        "id": "data-retention-12",
        "policyFile": "data-retention.md",
        "section": "Controls",
        "policySentence": "The platform allows feedback export by `sessionId`.",
        "canonicalClaim": "The platform allows feedback export by `sessionId`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:45-68`; `backend/src/modules/feedback/service.js:170-190`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:45-68",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "45-68"
          },
          {
            "source": "backend/src/modules/feedback/service.js:170-190",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "170-190"
          }
        ]
      },
      {
        "id": "data-retention-13",
        "policyFile": "data-retention.md",
        "section": "Controls",
        "policySentence": "The platform allows feedback deletion by `sessionId`.",
        "canonicalClaim": "The platform allows feedback deletion by `sessionId`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:70-93`; `backend/src/modules/feedback/service.js:193-213`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:70-93",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "70-93"
          },
          {
            "source": "backend/src/modules/feedback/service.js:193-213",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "193-213"
          }
        ]
      }
    ],
    "summary": {
      "totalClaims": 13,
      "mappedClaims": 13,
      "claimClasses": [
        "derives",
        "stores",
        "allows",
        "deletes",
        "shares",
        "minimizes"
      ],
      "internalTransportNoteCount": 1
    }
  },
  "acceptable-use": {
    "key": "acceptable-use",
    "route": "/inspect/acceptable-use",
    "title": "Acceptable Use",
    "subtitle": "Runtime scope, refusal, and feedback constraints",
    "intro": "Current rendered policy claims covering public concept resolution access, comparison output limited to authored allowlisted pairs, refusal of unsupported query forms and out-of-scope usage, and feedback submission and session-bound feedback controls.",
    "sourceTitle": "Acceptable Use",
    "scopeBullets": [
      "public concept resolution access",
      "comparison output limited to authored allowlisted pairs",
      "refusal of unsupported query forms and out-of-scope usage",
      "feedback submission and session-bound feedback controls"
    ],
    "claims": [
      {
        "id": "acceptable-use-1",
        "policyFile": "acceptable-use.md",
        "section": "Runtime Scope",
        "policySentence": "The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.",
        "canonicalClaim": "The platform allows concept resolution through `GET /api/v1/concepts/resolve?q=...`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-31`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-31",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-31"
          }
        ]
      },
      {
        "id": "acceptable-use-2",
        "policyFile": "acceptable-use.md",
        "section": "Runtime Scope",
        "policySentence": "The platform allows comparison output only for authored allowlisted concept pairs with authored comparison axes.",
        "canonicalClaim": "The platform allows comparison output only for authored allowlisted concept pairs with authored comparison axes.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/concepts/comparison-resolver.js:20-55`; `backend/src/modules/concepts/resolver.js:112-123`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/comparison-resolver.js:20-55",
            "path": "backend/src/modules/concepts/comparison-resolver.js",
            "lines": "20-55"
          },
          {
            "source": "backend/src/modules/concepts/resolver.js:112-123",
            "path": "backend/src/modules/concepts/resolver.js",
            "lines": "112-123"
          }
        ]
      },
      {
        "id": "acceptable-use-3",
        "policyFile": "acceptable-use.md",
        "section": "Runtime Scope",
        "policySentence": "The platform allows feedback submission through `POST /api/v1/feedback`.",
        "canonicalClaim": "The platform allows feedback submission through `POST /api/v1/feedback`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:20-23`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:20-23",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "20-23"
          }
        ]
      },
      {
        "id": "acceptable-use-4",
        "policyFile": "acceptable-use.md",
        "section": "Runtime Scope",
        "policySentence": "The platform allows feedback export by `sessionId`.",
        "canonicalClaim": "The platform allows feedback export by `sessionId`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:45-68`; `backend/src/modules/feedback/service.js:170-190`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:45-68",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "45-68"
          },
          {
            "source": "backend/src/modules/feedback/service.js:170-190",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "170-190"
          }
        ]
      },
      {
        "id": "acceptable-use-5",
        "policyFile": "acceptable-use.md",
        "section": "Runtime Scope",
        "policySentence": "The platform allows feedback deletion by `sessionId`.",
        "canonicalClaim": "The platform allows feedback deletion by `sessionId`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:70-93`; `backend/src/modules/feedback/service.js:193-213`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:70-93",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "70-93"
          },
          {
            "source": "backend/src/modules/feedback/service.js:193-213",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "193-213"
          }
        ]
      },
      {
        "id": "acceptable-use-6",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses concept resolution requests when query parameter `q` is missing.",
        "canonicalClaim": "The platform refuses concept resolution requests when query parameter `q` is missing.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-27`",
        "status": "mapped",
        "notes": "Shared validation branch.",
        "specialNotes": [
          "Shared validation branch."
        ],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-27",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-27"
          }
        ]
      },
      {
        "id": "acceptable-use-7",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses concept resolution requests when query parameter `q` is empty.",
        "canonicalClaim": "The platform refuses concept resolution requests when query parameter `q` is empty.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-27`",
        "status": "mapped",
        "notes": "Shared validation branch.",
        "specialNotes": [
          "Shared validation branch."
        ],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-27",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-27"
          }
        ]
      },
      {
        "id": "acceptable-use-8",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses concept resolution requests when query parameter `q` is not a string.",
        "canonicalClaim": "The platform refuses concept resolution requests when query parameter `q` is not a string.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/concepts.route.js:16-27`",
        "status": "mapped",
        "notes": "Shared validation branch.",
        "specialNotes": [
          "Shared validation branch."
        ],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/concepts.route.js:16-27",
            "path": "backend/src/routes/api/v1/concepts.route.js",
            "lines": "16-27"
          }
        ]
      },
      {
        "id": "acceptable-use-9",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses unsupported complex queries.",
        "canonicalClaim": "The platform refuses unsupported complex queries.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:191-195,357-365`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:191-195,357-365",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "191-195,357-365"
          }
        ]
      },
      {
        "id": "acceptable-use-10",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses relation queries.",
        "canonicalClaim": "The platform refuses relation queries.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:173-179,330-335`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:173-179,330-335",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "173-179,330-335"
          }
        ]
      },
      {
        "id": "acceptable-use-11",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses role or actor queries.",
        "canonicalClaim": "The platform refuses role or actor queries.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:182-188,314-319`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:182-188,314-319",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "182-188,314-319"
          }
        ]
      },
      {
        "id": "acceptable-use-12",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses canonical lookup requests when no authored concept ID is provided.",
        "canonicalClaim": "The platform refuses canonical lookup requests when no authored concept ID is provided.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:198-204,287-294`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:198-204,287-294",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "198-204,287-294"
          }
        ]
      },
      {
        "id": "acceptable-use-13",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses canonical lookup requests when no authored concept exists for the requested ID.",
        "canonicalClaim": "The platform refuses canonical lookup requests when no authored concept exists for the requested ID.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/query-shape-classifier.js:206-210,287-294`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/query-shape-classifier.js:206-210,287-294",
            "path": "backend/src/modules/concepts/query-shape-classifier.js",
            "lines": "206-210,287-294"
          }
        ]
      },
      {
        "id": "acceptable-use-14",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses comparison output for non-allowlisted concept pairs by returning `no_exact_match`.",
        "canonicalClaim": "The platform refuses comparison output for non-allowlisted concept pairs by returning `no_exact_match`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/comparison-resolver.js:46-55`; `backend/src/modules/concepts/resolver.js:112-132`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/comparison-resolver.js:46-55",
            "path": "backend/src/modules/concepts/comparison-resolver.js",
            "lines": "46-55"
          },
          {
            "source": "backend/src/modules/concepts/resolver.js:112-132",
            "path": "backend/src/modules/concepts/resolver.js",
            "lines": "112-132"
          }
        ]
      },
      {
        "id": "acceptable-use-15",
        "policyFile": "acceptable-use.md",
        "section": "Unsupported or Refused Use",
        "policySentence": "The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.",
        "canonicalClaim": "The platform refuses non-governance usage of governance-scoped concepts by returning `no_exact_match`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/concepts/resolver.js:90-109`; `backend/src/modules/concepts/governance-scope-enforcer.js:44-48,108-133`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/concepts/resolver.js:90-109",
            "path": "backend/src/modules/concepts/resolver.js",
            "lines": "90-109"
          },
          {
            "source": "backend/src/modules/concepts/governance-scope-enforcer.js:44-48,108-133",
            "path": "backend/src/modules/concepts/governance-scope-enforcer.js",
            "lines": "44-48,108-133"
          }
        ]
      },
      {
        "id": "acceptable-use-16",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform exposes feedback operations `submit`, `export_by_session`, and `delete_by_session`.",
        "canonicalClaim": "The platform exposes feedback operations `submit`, `export_by_session`, and `delete_by_session`.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:12-17`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:12-17",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "12-17"
          }
        ]
      },
      {
        "id": "acceptable-use-17",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform allows only `concept_match`, `ambiguous_match`, and `no_exact_match` as feedback `responseType` values.",
        "canonicalClaim": "The platform allows only `concept_match`, `ambiguous_match`, and `no_exact_match` as feedback `responseType` values.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:3`; `backend/src/modules/feedback/service.js:80-84`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:3",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "3"
          },
          {
            "source": "backend/src/modules/feedback/service.js:80-84",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "80-84"
          }
        ]
      },
      {
        "id": "acceptable-use-18",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform allows feedback options only from the response-type-specific allowlist.",
        "canonicalClaim": "The platform allows feedback options only from the response-type-specific allowlist.",
        "claimClass": "allows",
        "systemMapping": "`backend/src/modules/feedback/constants.js:5-8`; `backend/src/modules/feedback/service.js:84-89`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/constants.js:5-8",
            "path": "backend/src/modules/feedback/constants.js",
            "lines": "5-8"
          },
          {
            "source": "backend/src/modules/feedback/service.js:84-89",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "84-89"
          }
        ]
      },
      {
        "id": "acceptable-use-19",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses feedback payload keys outside the approved field set.",
        "canonicalClaim": "The platform refuses feedback payload keys outside the approved field set.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/feedback/service.js:46-64`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:46-64",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "46-64"
          }
        ]
      },
      {
        "id": "acceptable-use-20",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses invalid `feedbackType` and `responseType` combinations.",
        "canonicalClaim": "The platform refuses invalid `feedbackType` and `responseType` combinations.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/feedback/service.js:84-89`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:84-89",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "84-89"
          }
        ]
      },
      {
        "id": "acceptable-use-21",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses candidate or suggestion concept IDs on `concept_match` feedback.",
        "canonicalClaim": "The platform refuses candidate or suggestion concept IDs on `concept_match` feedback.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/feedback/service.js:105-111`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:105-111",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "105-111"
          }
        ]
      },
      {
        "id": "acceptable-use-22",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses `ambiguous_match` feedback with fewer than two candidate concept IDs.",
        "canonicalClaim": "The platform refuses `ambiguous_match` feedback with fewer than two candidate concept IDs.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/feedback/service.js:113-122`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:113-122",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "113-122"
          }
        ]
      },
      {
        "id": "acceptable-use-23",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses suggestion concept IDs on `ambiguous_match` feedback.",
        "canonicalClaim": "The platform refuses suggestion concept IDs on `ambiguous_match` feedback.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/feedback/service.js:113-122`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:113-122",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "113-122"
          }
        ]
      },
      {
        "id": "acceptable-use-24",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses candidate concept IDs on `no_exact_match` feedback.",
        "canonicalClaim": "The platform refuses candidate concept IDs on `no_exact_match` feedback.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/feedback/service.js:125-131`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:125-131",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "125-131"
          }
        ]
      },
      {
        "id": "acceptable-use-25",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses invalid feedback submissions with HTTP `400`.",
        "canonicalClaim": "The platform refuses invalid feedback submissions with HTTP `400`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:20-32`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:20-32",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "20-32"
          }
        ]
      },
      {
        "id": "acceptable-use-26",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses invalid feedback submissions with error code `invalid_feedback`.",
        "canonicalClaim": "The platform refuses invalid feedback submissions with error code `invalid_feedback`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:25-30`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:25-30",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "25-30"
          }
        ]
      },
      {
        "id": "acceptable-use-27",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses invalid feedback session control requests with error code `invalid_feedback_session_control`.",
        "canonicalClaim": "The platform refuses invalid feedback session control requests with error code `invalid_feedback_session_control`.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/routes/api/v1/feedback.route.js:45-57,70-82`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:45-57,70-82",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "45-57,70-82"
          }
        ]
      },
      {
        "id": "acceptable-use-28",
        "policyFile": "acceptable-use.md",
        "section": "Feedback Surface Boundaries",
        "policySentence": "The platform refuses session control requests when `sessionId` is not a non-empty string.",
        "canonicalClaim": "The platform refuses session control requests when `sessionId` is not a non-empty string.",
        "claimClass": "refuses",
        "systemMapping": "`backend/src/modules/feedback/service.js:216-224`; `backend/src/routes/api/v1/feedback.route.js:45-57,70-82`",
        "status": "mapped",
        "notes": "",
        "specialNotes": [],
        "hasInternalTransportNote": false,
        "lifecycle": {
          "lifecycleClass": "not_applicable",
          "deletionTrigger": "not_stored",
          "enforcementStatus": "declared_only"
        },
        "traces": [
          {
            "source": "backend/src/modules/feedback/service.js:216-224",
            "path": "backend/src/modules/feedback/service.js",
            "lines": "216-224"
          },
          {
            "source": "backend/src/routes/api/v1/feedback.route.js:45-57,70-82",
            "path": "backend/src/routes/api/v1/feedback.route.js",
            "lines": "45-57,70-82"
          }
        ]
      }
    ],
    "summary": {
      "totalClaims": 28,
      "mappedClaims": 28,
      "claimClasses": [
        "allows",
        "refuses"
      ],
      "internalTransportNoteCount": 0
    }
  }
} satisfies PolicySurfaceRegistry;
