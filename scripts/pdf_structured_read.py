#!/usr/bin/env python3
"""Extract, chunk, and serialize PDF text for structured reading."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import fitz


SOURCE_ROOT = Path("/home/serhat/code/chatpdm/chatpdm-sources")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract PDF text, chunk it deterministically, and emit structured JSON."
    )
    parser.add_argument("pdf", help="PDF filename or absolute path")
    parser.add_argument("--page-start", type=int, default=1, help="1-based start page")
    parser.add_argument("--page-end", type=int, default=None, help="1-based end page, inclusive")
    parser.add_argument(
        "--chars-per-chunk",
        type=int,
        default=2400,
        help="Maximum characters per chunk",
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=200,
        help="Character overlap between adjacent chunks",
    )
    parser.add_argument("--output", help="Optional JSON output file")
    return parser.parse_args()


def resolve_pdf_path(raw_path: str) -> Path:
    candidate = Path(raw_path)
    if candidate.is_absolute() and candidate.exists():
        return candidate
    if candidate.exists():
        return candidate.resolve()

    source_candidate = SOURCE_ROOT / raw_path
    if source_candidate.exists():
        return source_candidate.resolve()

    raise FileNotFoundError(f"PDF not found: {raw_path}")


def normalize_page_text(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    paragraphs: list[str] = []
    current: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue
        current.append(stripped)

    if current:
        paragraphs.append(" ".join(current))

    return "\n\n".join(paragraphs)


def extract_pages(doc: fitz.Document, start_page: int, end_page: int) -> list[dict[str, Any]]:
    pages: list[dict[str, Any]] = []
    for page_number in range(start_page, end_page + 1):
        page = doc.load_page(page_number - 1)
        text = normalize_page_text(page.get_text("text"))
        pages.append(
            {
                "page": page_number,
                "text": text,
                "char_count": len(text),
            }
        )
    return pages


def chunk_pages(
    pages: list[dict[str, Any]], chars_per_chunk: int, overlap: int
) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    chunk_index = 1
    buffer = ""
    buffer_start_page: int | None = None
    buffer_end_page: int | None = None

    def flush() -> None:
        nonlocal chunk_index, buffer, buffer_start_page, buffer_end_page
        text = buffer.strip()
        if not text:
            buffer = ""
            buffer_start_page = None
            buffer_end_page = None
            return

        chunks.append(
            {
                "chunk_id": f"chunk-{chunk_index:04d}",
                "page_start": buffer_start_page,
                "page_end": buffer_end_page,
                "char_count": len(text),
                "text": text,
            }
        )
        chunk_index += 1

        if overlap > 0 and len(text) > overlap:
            buffer = text[-overlap:]
            buffer_start_page = buffer_end_page
        else:
            buffer = ""
            buffer_start_page = None
            buffer_end_page = None

    for page in pages:
        paragraphs = [p for p in page["text"].split("\n\n") if p.strip()]
        for paragraph in paragraphs:
            candidate = paragraph if not buffer else f"{buffer}\n\n{paragraph}"
            if len(candidate) <= chars_per_chunk:
                buffer = candidate
                if buffer_start_page is None:
                    buffer_start_page = page["page"]
                buffer_end_page = page["page"]
                continue

            flush()
            if len(paragraph) <= chars_per_chunk:
                buffer = paragraph
                buffer_start_page = page["page"]
                buffer_end_page = page["page"]
                continue

            slice_start = 0
            while slice_start < len(paragraph):
                slice_end = min(slice_start + chars_per_chunk, len(paragraph))
                text_slice = paragraph[slice_start:slice_end].strip()
                if text_slice:
                    chunks.append(
                        {
                            "chunk_id": f"chunk-{chunk_index:04d}",
                            "page_start": page["page"],
                            "page_end": page["page"],
                            "char_count": len(text_slice),
                            "text": text_slice,
                        }
                    )
                    chunk_index += 1
                if slice_end >= len(paragraph):
                    break
                slice_start = max(slice_end - overlap, slice_start + 1)

            buffer = ""
            buffer_start_page = None
            buffer_end_page = None

    flush()
    return chunks


def main() -> int:
    args = parse_args()
    pdf_path = resolve_pdf_path(args.pdf)

    with fitz.open(pdf_path) as doc:
        page_start = max(1, args.page_start)
        page_end = args.page_end or doc.page_count
        if page_end < page_start:
            raise ValueError("page-end must be greater than or equal to page-start")
        if page_end > doc.page_count:
            page_end = doc.page_count

        pages = extract_pages(doc, page_start, page_end)

    chunks = chunk_pages(pages, args.chars_per_chunk, args.overlap)

    payload = {
        "source_pdf": str(pdf_path),
        "page_start": page_start,
        "page_end": page_end,
        "page_count": len(pages),
        "chunk_count": len(chunks),
        "pages": pages,
        "chunks": chunks,
    }

    output = json.dumps(payload, indent=2, ensure_ascii=True)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
