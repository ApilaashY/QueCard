"""
FastAPI service for processing PDFs with Docling
Deploy to Railway, Render, or similar platforms
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import tempfile
import os
from pathlib import Path

try:
    from docling.document_converter import DocumentConverter
    import docling.utils.model_downloader
except ImportError:
    raise ImportError("Docling not installed. Run: pip install docling")

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this with your Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PDFRequest(BaseModel):
    pdf_base64: str

class PDFResponse(BaseModel):
    success: bool
    chunks: list = None
    metadata: dict = None
    error: str = None

@app.get("/")
async def root():
    return {"status": "PDF Processing Service is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/process-pdf", response_model=PDFResponse)
async def process_pdf(request: PDFRequest):
    try:
        # Decode PDF data
        pdf_bytes = base64.b64decode(request.pdf_base64)
        
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
            
            return PDFResponse(
                success=True,
                chunks=chunks,
                metadata={
                    "num_pages": len(result.document.pages) if hasattr(result.document, 'pages') else 0,
                    "num_chunks": len(chunks)
                }
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
