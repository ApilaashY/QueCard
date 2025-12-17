import { processPdf, prepareChunksForGemini } from "../pdf-processer";

// Mock fs/promises
jest.mock("fs/promises");

// Mock pdf-parse completely
jest.mock("pdf-parse", () => {
  return {
    PDFParse: jest.fn(),
  };
});

import { PDFParse } from "pdf-parse";
import fs from "fs/promises";

type MockPDFParser = {
  getText: jest.Mock;
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

      // Mock PDFParse
      const mockGetText = jest.fn().mockResolvedValue({
        text: "Introduction\n\nThis is a test document.\n\nConclusion",
        pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
      });

      const mockParser: MockPDFParser = {
        getText: mockGetText,
      };

      (PDFParse as jest.MockedClass<typeof PDFParse>).mockImplementation(
        () => mockParser as unknown as InstanceType<typeof PDFParse>
      );

      // Mock setWorker
      PDFParse.setWorker = jest.fn();

      const result = await processPdf("/mock/path/test.pdf");

      expect(result.success).toBe(true);
      expect(result.chunks).toHaveLength(3);
      expect(result.chunks?.[0].content).toBe("Introduction");
      expect(result.chunks?.[1].content).toBe("This is a test document.");
      expect(result.chunks?.[2].content).toBe("Conclusion");
      expect(result.metadata?.num_pages).toBe(2);
      expect(result.metadata?.num_chunks).toBe(3);
    });

    it("should handle empty chunks correctly", async () => {
      const mockBuffer = Buffer.from("mock pdf data");
      jest.spyOn(fs, "readFile").mockResolvedValue(mockBuffer);

      const mockGetText = jest.fn().mockResolvedValue({
        text: "Content\n\n\n\nMore content",
        pages: [{ pageNumber: 1 }],
      });

      const mockParser: MockPDFParser = {
        getText: mockGetText,
      };

      (PDFParse as jest.MockedClass<typeof PDFParse>).mockImplementation(
        () => mockParser as unknown as InstanceType<typeof PDFParse>
      );

      PDFParse.setWorker = jest.fn();

      const result = await processPdf("/mock/path/test.pdf");

      expect(result.success).toBe(true);
      expect(result.chunks).toHaveLength(2);
      expect(result.chunks?.[0].content).toBe("Content");
      expect(result.chunks?.[1].content).toBe("More content");
    });

    it("should return error when PDF processing fails", async () => {
      const mockBuffer = Buffer.from("mock pdf data");
      jest.spyOn(fs, "readFile").mockResolvedValue(mockBuffer);

      (PDFParse as jest.MockedClass<typeof PDFParse>).mockImplementation(() => {
        throw new Error("Invalid PDF format");
      });

      PDFParse.setWorker = jest.fn();

      const result = await processPdf("/mock/path/invalid.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PDF format");
      expect(result.chunks).toBeUndefined();
    });

    it("should return error when file read fails", async () => {
      jest.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));

      PDFParse.setWorker = jest.fn();

      const result = await processPdf("/mock/path/nonexistent.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toContain("File not found");
    });

    it("should include correct metadata for each chunk", async () => {
      const mockBuffer = Buffer.from("mock pdf data");
      jest.spyOn(fs, "readFile").mockResolvedValue(mockBuffer);

      const mockGetText = jest.fn().mockResolvedValue({
        text: "First chunk\n\nSecond chunk",
        pages: [{ pageNumber: 1 }],
      });

      const mockParser: MockPDFParser = {
        getText: mockGetText,
      };

      (PDFParse as jest.MockedClass<typeof PDFParse>).mockImplementation(
        () => mockParser as unknown as InstanceType<typeof PDFParse>
      );

      PDFParse.setWorker = jest.fn();

      const result = await processPdf("/mock/path/test.pdf");

      expect(result.success).toBe(true);
      expect(result.chunks?.[0].metadata.chunk_index).toBe(0);
      expect(result.chunks?.[1].metadata.chunk_index).toBe(1);
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
