# Comparator v3 Source Inventory

Scope: read-only inventory for Comparator v3 assistive sources. Black remains primary; these sources do not create meanings, aliases, runtime ontology admissions, concept packet changes, resolver behavior changes, or writeback.

| Source id | Title | Year | Folder exists | Files | Types | Text/OCR exists | Page/line availability | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bouvier_1839_vol_1 | Bouvier's Law Dictionary | 1839 | true | 1 | .pdf | false | 573 PDF pages via PyMuPDF; available after PyMuPDF text line extraction | ready_for_direct_pdf_text_extraction_attempt |
| bouvier_1839_vol_2 | Bouvier's Law Dictionary | 1839 | true | 1 | .pdf | false | 639 PDF pages via PyMuPDF; available after PyMuPDF text line extraction | ready_for_direct_pdf_text_extraction_attempt |
| wharton_1883 | Wharton's Law Lexicon | 1883 | true | 1 | .pdf | false | 902 PDF pages via PyMuPDF; available after PyMuPDF text line extraction | ready_for_direct_pdf_text_extraction_attempt |
| burrill_1860 | Burrill, A Law Dictionary and Glossary | 1860 | true | 1 | .pdf | false | 1404 PDF pages via PyMuPDF; available after PyMuPDF text line extraction | ready_for_direct_pdf_text_extraction_attempt |
| stroud_1903 | Stroud's Judicial Dictionary | 1903 | true | 1 | .pdf | false | 2534 PDF pages via PyMuPDF; available after PyMuPDF text line extraction | ready_for_direct_pdf_text_extraction_attempt |
| ballentine_1916 | Ballentine's Law Dictionary | 1916 | true | 1 | .pdf | false | 646 PDF pages via PyMuPDF; available after PyMuPDF text line extraction | ready_for_direct_pdf_text_extraction_attempt |

## Risks

### bouvier_1839_vol_1

- early nineteenth-century legal terminology
- multi-volume continuation
- OCR/PDF extraction spacing noise
- obsolete or jurisdiction-bound definitions

### bouvier_1839_vol_2

- early nineteenth-century legal terminology
- multi-volume continuation
- OCR/PDF extraction spacing noise
- obsolete or jurisdiction-bound definitions

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
