import { processPdf, prepareChunksForGemini } from "../pdf-processer";

// Mock fs/promises
jest.mock("fs/promises");

// Mock pdfreader completely
jest.mock("pdfreader", () => {
  return {
    PdfReader: jest.fn(),
  };
});

import { PdfReader } from "pdfreader";
import fs from "fs/promises";

type MockPDFParser = {
  parseBuffer: jest.Mock;
};

describe("PDF Processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processPdf", () => {
    it("should successfully process a PDF and return chunks", async () => {
      // Mock file read
      const mockBuffer = Buffer.from("mock pdf data");
      jest.spyOn(fs, "readFile").mockResolvedValue(mockBuffer);

      // Mock PdfReader
      const mockParseBuffer = jest.fn((buffer, callback) => {
        // Simulate page 1
        callback(null, { page: 1 });
        callback(null, { text: "Introduction" });
        callback(null, { text: " " });
        
        // Simulate page break
        callback(null, { page: 2 });
        callback(null, { text: "This is a test document." });
        callback(null, { text: " " });
        callback(null, { text: "Conclusion" });
        
        // End of parsing
        callback(null, null);
      });

      const mockReader: MockPDFParser = {
        parseBuffer: mockParseBuffer,
      };

      (PdfReader as jest.MockedClass<typeof PdfReader>).mockImplementation(
        () => mockReader as unknown as InstanceType<typeof PdfReader>
      );

      const result = await processPdf("/mock/path/test.pdf");

      expect(result.success).toBe(true);
      expect(result.chunks).toBeDefined();
      expect(result.chunks!.length).toBeGreaterThan(0);
      expect(result.metadata?.num_pages).toBe(2);
    });

    it("should handle empty chunks correctly", async () => {
      const mockBuffer = Buffer.from("mock pdf data");
      jest.spyOn(fs, "readFile").mockResolvedValue(mockBuffer);

      const mockParseBuffer = jest.fn((buffer, callback) => {
        callback(null, { page: 1 });
        callback(null, { text: "Content" });
        callback(null, { text: " " });
        callback(null, { text: "More content" });
        callback(null, null);
      });

      const mockReader: MockPDFParser = {
        parseBuffer: mockParseBuffer,
      };

      (PdfReader as jest.MockedClass<typeof PdfReader>).mockImplementation(
        () => mockReader as unknown as InstanceType<typeof PdfReader>
      );

      const result = await processPdf("/mock/path/test.pdf");

      expect(result.success).toBe(true);
      expect(result.chunks).toBeDefined();
      expect(result.chunks!.length).toBeGreaterThan(0);
    });

    it("should return error when PDF processing fails", async () => {
      const mockBuffer = Buffer.from("mock pdf data");
      jest.spyOn(fs, "readFile").mockResolvedValue(mockBuffer);

      const mockParseBuffer = jest.fn((buffer, callback) => {
        callback(new Error("Invalid PDF format"), null);
      });

      const mockReader: MockPDFParser = {
        parseBuffer: mockParseBuffer,
      };

      (PdfReader as jest.MockedClass<typeof PdfReader>).mockImplementation(
        () => mockReader as unknown as InstanceType<typeof PdfReader>
      );

      const result = await processPdf("/mock/path/invalid.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PDF format");
      expect(result.chunks).toBeUndefined();
    });

    it("should return error when file read fails", async () => {
      jest.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));

      const result = await processPdf("/mock/path/nonexistent.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("File not found");
    });

    it("should include correct metadata for each chunk", async () => {
      const mockBuffer = Buffer.from("mock pdf data");
      jest.spyOn(fs, "readFile").mockResolvedValue(mockBuffer);

      const mockParseBuffer = jest.fn((buffer, callback) => {
        callback(null, { page: 1 });
        callback(null, { text: "First chunk" });
        callback(null, { page: 2 });
        callback(null, { text: "Second chunk" });
        callback(null, null);
      });

      const mockReader: MockPDFParser = {
        parseBuffer: mockParseBuffer,
      };

      (PdfReader as jest.MockedClass<typeof PdfReader>).mockImplementation(
        () => mockReader as unknown as InstanceType<typeof PdfReader>
      );

      const result = await processPdf("/mock/path/test.pdf");

      expect(result.success).toBe(true);
      expect(result.chunks?.[0].metadata.chunk_index).toBe(0);
      expect(result.chunks?.[0].type).toBe("text");
    });
  });

  describe("prepareChunksForGemini", () => {
    it("should filter out very short chunks", () => {
      const chunks = [
        { content: "Hi", type: "text", metadata: {} },
        { content: "This is a longer piece of content that should be included", type: "text", metadata: {} },
      ];

      const result = prepareChunksForGemini(chunks, 50);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain("longer piece of content");
    });

    it("should combine chunks until target size is reached", () => {
      const chunks = [
        { content: "Short chunk one with enough content to pass the minimum", type: "text", metadata: {} },
        { content: "Short chunk two with enough content to pass the minimum", type: "text", metadata: {} },
        { content: "Short chunk three with enough content to pass the minimum", type: "text", metadata: {} },
      ];

      const result = prepareChunksForGemini(chunks, 50, 150);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(chunks.length);
    });

    it("should add type metadata for non-text chunks", () => {
      const chunks = [
        { content: "This is a table with enough content to pass minimum threshold", type: "table", metadata: {} },
      ];

      const result = prepareChunksForGemini(chunks, 50);

      expect(result[0]).toContain("[TABLE]");
      expect(result[0]).toContain("This is a table");
    });

    it("should include the last chunk", () => {
      const chunks = [
        { content: "First chunk with enough content to pass the minimum threshold size", type: "text", metadata: {} },
        { content: "Last chunk with enough content to pass the minimum threshold size", type: "text", metadata: {} },
      ];

      const result = prepareChunksForGemini(chunks, 50, 80);

      expect(result.length).toBeGreaterThan(0);
      expect(result[result.length - 1]).toContain("Last chunk");
    });

    it("should handle empty chunks array", () => {
      const result = prepareChunksForGemini([]);

      expect(result).toHaveLength(0);
    });
  });
});
