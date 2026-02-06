/** @jest-environment node */
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Mock the modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    books: {
      findUnique: jest.fn(),
    },
    documents: {
      findMany: jest.fn(),
    },
    chats: {
      findMany: jest.fn(),
    },
    card_sets: {
      findMany: jest.fn(),
    },
  },
}));

describe("POST /api/queue-card/fetchSet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/queue-card/fetchSet", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should fetch book details and related entities", async () => {
    const bookId = "book-123";
    const mockBook = { id: bookId, title: "Test Book" };
    const mockDocuments = [{ id: "doc-1", title: "Doc 1" }];
    const mockChats = [
      { user: "Hello", ai_response: "Hi", created_at: new Date() },
    ];
    const mockCardSets = [{ id: "set-1", title: "Set 1", processing: false }];

    (prisma.books.findUnique as jest.Mock).mockResolvedValue(mockBook);
    (prisma.documents.findMany as jest.Mock).mockResolvedValue(mockDocuments);
    (prisma.chats.findMany as jest.Mock).mockResolvedValue(mockChats);
    (prisma.card_sets.findMany as jest.Mock).mockResolvedValue(mockCardSets);

    const request = createMockRequest({ id: bookId });
    const response = await POST(request);
    const data = await response.json();

    expect(prisma.books.findUnique).toHaveBeenCalledWith({
      where: { id: bookId },
    });
    expect(data).toEqual({
      ...mockBook,
      documents: mockDocuments,
      chats: JSON.parse(JSON.stringify(mockChats)), // Date will be serialized
      card_sets: mockCardSets,
    });
    expect(response.status).toBe(200);
  });

  it("should return 400 if ID is missing", async () => {
    const request = createMockRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid or missing 'id' parameter");
  });

  it("should return 404 if book is not found", async () => {
    (prisma.books.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest({ id: "missing" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Book not found");
  });

  it("should return 500 if a DB error occurs", async () => {
    (prisma.books.findUnique as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createMockRequest({ id: "id" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
