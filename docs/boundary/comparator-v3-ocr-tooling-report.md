# Comparator v3 OCR Tooling Report

Scope: OCR availability detection only. No OCR output is trusted as meaning text, and Comparator v3 remains assistive-only.

## CLI Tools

|Tool|Available|Path|
|---|---|---|
|tesseract|false||
|pdftoppm|false||
|convert|false||
|magick|false||

## Python Libraries

|Library|Available|
|---|---|
|fitz|true|
|PIL|true|
|pytesseract|false|
|pdf2image|false|

## Recommendation

- Recommended OCR path: install_or_enable_tesseract_plus_pdf_rendering_before_ocr_repair_lane
- Full OCR can run locally now: false
- OCR repair lane is blocked pending OCR tooling; no fake OCR pages or alignments should be produced.
