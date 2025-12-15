#!/usr/bin/env python3
"""
Vercel Python serverless function to process PDF files using Docling.
"""
import json
import base64
import tempfile
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler

try:
    from docling.document_converter import DocumentConverter
    import docling.utils.model_downloader
except ImportError:
    # Will be installed by Vercel during build
    pass


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_json = json.loads(post_data.decode('utf-8'))
            
            # Get base64 encoded PDF data
            pdf_base64 = request_json.get('pdf_base64')
            if not pdf_base64:
                self.send_error(400, "Missing pdf_base64 in request body")
                return
            
            # Decode PDF data
            pdf_bytes = base64.b64decode(pdf_base64)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                tmp_file.write(pdf_bytes)
                tmp_path = tmp_file.name
            
            try:
                # Process PDF with Docling
                converter = DocumentConverter()
                docling.utils.model_downloader.download_models()
                result = converter.convert(tmp_path)
                
                # Export to markdown
                markdown_content = result.document.export_to_markdown()
                
                # Split markdown into chunks
                raw_chunks = markdown_content.split('\n\n')
                
                chunks = []
                for i, chunk_content in enumerate(raw_chunks):
                    chunk_content = chunk_content.strip()
                    if chunk_content:
                        chunks.append({
                            "content": chunk_content,
                            "type": "text",
                            "metadata": {
                                "chunk_index": i
                            }
                        })
                
                response_data = {
                    "success": True,
                    "chunks": chunks,
                    "metadata": {
                        "num_pages": len(result.document.pages) if hasattr(result.document, 'pages') else 0,
                        "num_chunks": len(chunks)
                    }
                }
                
                # Send response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode())
                
            finally:
                # Clean up temporary file
                os.unlink(tmp_path)
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {
                "success": False,
                "error": str(e)
            }
            self.wfile.write(json.dumps(error_response).encode())
