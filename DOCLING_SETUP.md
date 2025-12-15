# Docling PDF Processing Setup

This project uses [Docling](https://github.com/DS4SD/docling) to process PDFs into structured chunks before sending them to Gemini for flashcard generation.

## Why Docling?

Docling provides superior PDF parsing compared to simple text extraction:

- **Structure preservation**: Maintains document hierarchy (headings, paragraphs, tables)
- **Better chunking**: Intelligent content segmentation based on document structure
- **Metadata extraction**: Preserves page numbers and bounding boxes
- **Table support**: Properly extracts and formats tables
- **Multi-format support**: Handles PDFs, DOCX, and other document formats

## Setup

### 1. Install Python Dependencies

```bash
# Install Docling and its dependencies
pip install -r scripts/requirements.txt
```

Or install directly:

```bash
pip install docling
```

### 2. Verify Installation

Test the Docling script:

```bash
python3 scripts/process_pdf_docling.py /path/to/your/test.pdf
```

## How It Works

1. **PDF Upload**: User uploads a PDF through the API
2. **Docling Processing**:
   - Python script processes PDF using Docling
   - Extracts structured content with metadata
   - Returns JSON with chunks and their types
3. **Chunk Preparation**:
   - TypeScript utility combines and filters chunks
   - Removes very short chunks (headers, page numbers)
   - Enriches chunks with type information
4. **Gemini Processing**:
   - Better chunks lead to better embeddings
   - Context-aware flashcard generation

## Files

- `scripts/process_pdf_docling.py`: Python script that uses Docling to process PDFs
- `lib/docling.ts`: TypeScript utilities for calling Python script and preparing chunks
- `app/api/queue-card/generate/route.ts`: API route that orchestrates the process

## Configuration

You can adjust chunk sizes in `lib/docling.ts`:

```typescript
prepareChunksForGemini(
  chunks,
  (minChunkSize = 50), // Minimum chunk size to keep
  (targetChunkSize = 800) // Target size for combined chunks
);
```

## Troubleshooting

### Python not found

Ensure Python 3 is installed and accessible as `python3`:

```bash
python3 --version
```

### Docling installation fails

Try installing with specific versions:

```bash
pip install --upgrade pip
pip install docling
```

### Processing timeout

For very large PDFs, you may need to increase the timeout in your deployment settings.

## Benefits Over Previous Approach

| Feature   | Old (Gemini Text Extraction) | New (Docling)         |
| --------- | ---------------------------- | --------------------- |
| Structure | Lost during extraction       | Preserved             |
| Tables    | Poor formatting              | Properly extracted    |
| Chunking  | Fixed 600 char splits        | Semantic boundaries   |
| Speed     | API calls for extraction     | Local processing      |
| Cost      | Uses Gemini API tokens       | Free local processing |
| Quality   | Generic text chunks          | Context-aware chunks  |
