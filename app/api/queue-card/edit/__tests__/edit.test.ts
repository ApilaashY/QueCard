/** @jest-environment node */
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mock the modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    card_sets: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    documents: {
      findMany: jest.fn(),
    },
    document_chunks: {
      findMany: jest.fn(),
    },
    cards: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@google/generative-ai", () => {
  const mockGenerateContent = jest.fn();
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockImplementation(() => ({
        generateContent: mockGenerateContent,
      })),
    })),
  };
});

describe("POST /api/queue-card/edit", () => {
  const mockId = "set-123";
  const mockBookId = "book-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    // Note: The route.ts uses Request instead of NextRequest in its signature
    return new Request("http://localhost/api/queue-card/edit", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should successfully edit flashcards with Gemini assistance", async () => {
    // 1. Mock card set existence check
    (prisma.card_sets.findUnique as jest.Mock).mockResolvedValue({
      id: mockId,
      processing: false,
    });

    // 2. Mock documents fetch
    (prisma.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "doc-1" },
    ]);

    // 3. Mock chunks fetch
    (prisma.document_chunks.findMany as jest.Mock).mockResolvedValue([
      { data: "context data" },
    ]);

    // 4. Mock existing cards fetch
    (prisma.cards.findMany as jest.Mock).mockResolvedValue([
      { id: "card-1", question: "old Q", answer: "old A" },
    ]);

    // 5. Mock Gemini response
    const mockModel = new GoogleGenerativeAI("test").getGenerativeModel({
      model: "",
    });
    (mockModel.generateContent as jest.Mock).mockResolvedValue({
      response: {
        text: () =>
          "New Question\nNew Answer\n\nAnother Question\nAnother Answer",
      },
    });

    const request = createMockRequest({
      bookId: mockBookId,
      setId: mockId,
      prompt: "Make them better",
    });
    const response = await POST(request);
    const data = await response.json();

    // Verify processing state changes
    expect(prisma.card_sets.update).toHaveBeenCalledWith({
      where: { id: mockId },
      data: { processing: true },
    });
    expect(prisma.card_sets.update).toHaveBeenCalledWith({
      where: { id: mockId },
      data: { processing: false },
    });

    expect(prisma.cards.deleteMany).toHaveBeenCalledWith({
      where: { card_set_id: mockId },
    });
    expect(prisma.cards.create).toHaveBeenCalledTimes(2);
    expect(data.message).toBe("Flashcards generated successfully");
    expect(response.status).toBe(200);
  });

  it("should return 400 if missing inputs", async () => {
    const request = createMockRequest({ bookId: mockBookId });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Missing book ID or prompt");
  });

  it("should return 404 if card set not found", async () => {
    (prisma.card_sets.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest({
      bookId: mockBookId,
      setId: mockId,
      prompt: "p",
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Card set not found");
  });

  it("should return 400 if card set is already processing", async () => {
    (prisma.card_sets.findUnique as jest.Mock).mockResolvedValue({
      id: mockId,
      processing: true,
    });

    const request = createMockRequest({
      bookId: mockBookId,
      setId: mockId,
      prompt: "p",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      "Can't process card set while it is already processing",
    );
  });

  it("should handle Gemini errors and reset processing state", async () => {
    (prisma.card_sets.findUnique as jest.Mock).mockResolvedValue({
      id: mockId,
      processing: false,
    });
    (prisma.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "doc-1" },
    ]);
    (prisma.document_chunks.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.cards.findMany as jest.Mock).mockResolvedValue([]);

    // Force Gemini error
    const mockModel = new GoogleGenerativeAI("test").getGenerativeModel({
      model: "",
    });
    (mockModel.generateContent as jest.Mock).mockRejectedValue(
      new Error("AI error"),
    );

    const request = createMockRequest({
      bookId: mockBookId,
      setId: mockId,
      prompt: "p",
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    // Should have reset processing state
    expect(prisma.card_sets.update).toHaveBeenCalledWith({
      where: { id: mockId },
      data: { processing: false },
    });
  });
});
