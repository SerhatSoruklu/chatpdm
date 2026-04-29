# Comparator v3 Parser Readiness

Scope: parser-readiness only. Comparator v3 sources are assistive context and cannot create meanings, aliases, writeback, runtime ontology admission, concept packet changes, or resolver behavior changes.

| Source id | Page marker | Headword pattern | Line structure | Entry boundary confidence | Parse confidence |
| --- | --- | --- | --- | --- | --- |
| bouvier_1839_vol_1 | PyMuPDF page index + 1; no source-authored page marker is trusted without review | uppercase or title-case line start ending with punctuation or strong whitespace boundary | direct PDF text lines, trimmed; entry segmentation remains candidate-level | blocked_without_ocr_or_source_specific_segmentation | not_ready_in_direct_text_lane |
| bouvier_1839_vol_2 | PyMuPDF page index + 1; no source-authored page marker is trusted without review | uppercase or title-case line start ending with punctuation or strong whitespace boundary | direct PDF text lines, trimmed; entry segmentation remains candidate-level | blocked_without_ocr_or_source_specific_segmentation | not_ready_in_direct_text_lane |
| wharton_1883 | PyMuPDF page index + 1; no source-authored page marker is trusted without review | uppercase or title-case line start ending with punctuation or strong whitespace boundary | direct PDF text lines, trimmed; entry segmentation remains candidate-level | medium | usable_for_exact_headword_alignment_with_review |
| burrill_1860 | PyMuPDF page index + 1; no source-authored page marker is trusted without review | uppercase or title-case line start ending with punctuation or strong whitespace boundary | direct PDF text lines, trimmed; entry segmentation remains candidate-level | blocked_without_ocr_or_source_specific_segmentation | not_ready_in_direct_text_lane |
| stroud_1903 | PyMuPDF page index + 1; no source-authored page marker is trusted without review | uppercase or title-case line start ending with punctuation or strong whitespace boundary | direct PDF text lines, trimmed; entry segmentation remains candidate-level | medium_low | usable_for_exact_headword_alignment_with_review |
| ballentine_1916 | PyMuPDF page index + 1; no source-authored page marker is trusted without review | uppercase or title-case line start ending with punctuation or strong whitespace boundary | direct PDF text lines, trimmed; entry segmentation remains candidate-level | blocked_without_ocr_or_source_specific_segmentation | not_ready_in_direct_text_lane |

## Known Risks

### bouvier_1839_vol_1

- early nineteenth-century legal terminology
- multi-volume continuation
- OCR/PDF extraction spacing noise
- obsolete or jurisdiction-bound definitions
- direct text extraction did not produce usable headword candidates

### bouvier_1839_vol_2

- early nineteenth-century legal terminology
- multi-volume continuation
- OCR/PDF extraction spacing noise
- obsolete or jurisdiction-bound definitions
- direct text extraction did not produce usable headword candidates

### wharton_1883

- English-law and historical scope
- page header and column noise
- hyphenation and split-entry extraction
- obsolete legal usage

### burrill_1860

- glossary-heavy historical definitions
- abbreviation and citation noise
- split columns
- obsolete common-law usage
- direct text extraction did not produce usable headword candidates

### stroud_1903

- judicial/example-heavy entries
- case citation density
- English-law scope
- definitions may be interpretive rather than lexical

### ballentine_1916

- early twentieth-century legal usage
- OCR/PDF extraction line noise
- page header/footer noise
- modern-scope overread risk
- direct text extraction did not produce usable headword candidates
