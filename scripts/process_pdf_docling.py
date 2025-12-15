#!/usr/bin/env python3
"""
Process PDF files using Docling to extract structured content.
"""
import sys
import json
import re
from pathlib import Path
from typing import List, Dict, Any
try:
    from docling.document_converter import DocumentConverter
    import docling.utils.model_downloader
except ImportError:
    print(json.dumps({
        "error": "Docling not installed. Install with: pip install docling"
    }))
    sys.exit(1)


def process_pdf(pdf_path: str):
    converter = DocumentConverter()
    docling.utils.model_downloader.download_models()
    result = converter.convert(pdf_path)
    
    # Export to markdown
    markdown_content = result.document.export_to_markdown()
    
    # Split markdown into chunks (by paragraphs/sections)
    # Simple split by double newlines for now
    raw_chunks = markdown_content.split('\n\n')
    
    chunks = []
    for i, chunk_content in enumerate(raw_chunks):
        chunk_content = chunk_content.strip()
        if chunk_content:  # Skip empty chunks
            chunks.append({
                "content": chunk_content,
                "type": "text",
                "metadata": {
                    "chunk_index": i
                }
            })
    
    return {
        "success": True,
        "chunks": chunks,
        "metadata": {
            "num_pages": len(result.document.pages) if hasattr(result.document, 'pages') else 0,
            "num_chunks": len(chunks)
        }
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python process_pdf_docling.py <pdf_path>"
        }))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(json.dumps({
            "success": False,
            "error": f"File not found: {pdf_path}"
        }))
        sys.exit(1)
    
    try:
        result = process_pdf(pdf_path)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)
