#!/usr/bin/env python3
"""
Process PDF files using PyMuPDF to extract structured content.
"""
import sys
import json
from pathlib import Path
from typing import List, Dict, Any
try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({
        "error": "PyMuPDF not installed. Install with: pip install pymupdf"
    }))
    sys.exit(1)


def process_pdf(pdf_path: str):
    # Open the PDF
    doc = fitz.open(pdf_path)
    
    # Extract text from all pages
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    
    # Get page count before closing
    num_pages = len(doc)
    doc.close()
    
    # Split text into chunks (by paragraphs/sections)
    # Simple split by double newlines for now
    raw_chunks = full_text.split('\n\n')
    
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
            "num_pages": num_pages,
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
