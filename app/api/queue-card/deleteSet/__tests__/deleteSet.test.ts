/** @jest-environment node */
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { NextRequest } from "next/server";

// Mock the modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    books: {
      findUniqueOrThrow: jest.fn(),
      delete: jest.fn(),
    },
    documents: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    document_chunks: {
      deleteMany: jest.fn(),
    },
    chats: {
      deleteMany: jest.fn(),
    },
    card_sets: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    cards: {
      deleteMany: jest.fn(),
    },
    podcasts: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    del: jest.fn(),
  },
}));

jest.mock("@/lib/supabase/admin", () => ({
  tokenToUser: jest.fn().mockResolvedValue("98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb"),
}));

describe("POST /api/queue-card/deleteSet", () => {
  const userId = "98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/queue-card/deleteSet", {
      method: "POST",
      headers: { Authorization: "Bearer dummy-token" },
      body: JSON.stringify(body),
    });
  };

  it("should delete the set and all related data", async () => {
    const bookId = "book-123";
    (prisma.books.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: bookId,
    });
    (prisma.documents.findMany as jest.Mock).mockResolvedValue([
      { id: "doc-1" },
      { id: "doc-2" },
    ]);
    (prisma.card_sets.findMany as jest.Mock).mockResolvedValue([
      { id: "cs-1" },
      { id: "cs-2" },
    ]);

    const request = createMockRequest({ id: bookId });
    const response = await POST(request);
    const data = await response.json();

    expect(redis.del).toHaveBeenCalledWith(`user_sets:${userId}`);
    expect(prisma.books.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: bookId },
    });
    expect(prisma.documents.findMany).toHaveBeenCalledWith({
      where: { book_id: bookId },
      select: { id: true },
    });
    // Checks that it deletes chunks for each document
    expect(prisma.document_chunks.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.documents.deleteMany).toHaveBeenCalledWith({
      where: { book_id: bookId },
    });
    expect(prisma.chats.deleteMany).toHaveBeenCalledWith({
      where: { book_id: bookId },
    });
    expect(prisma.card_sets.findMany).toHaveBeenCalledWith({
      where: { book_id: bookId },
    });
    expect(prisma.cards.deleteMany).toHaveBeenCalledWith({
      where: { card_set_id: "cs-1" },
    });
    expect(prisma.cards.deleteMany).toHaveBeenCalledWith({
      where: { card_set_id: "cs-2" },
    });
    expect(prisma.card_sets.deleteMany).toHaveBeenCalledWith({
      where: { book_id: bookId },
    });
    expect(prisma.podcasts.deleteMany).toHaveBeenCalledWith({
      where: { book_id: bookId },
    });
    expect(prisma.books.delete).toHaveBeenCalledWith({ where: { id: bookId } });

    expect(data).toEqual({ success: true });
    expect(response.status).toBe(200);
  });

  it("should return 404 if set is not found", async () => {
    (prisma.books.findUniqueOrThrow as jest.Mock).mockRejectedValue(
      new Error("Not found"),
    );

    const request = createMockRequest({ id: "non-existent" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text).toBe("Card set not found");
  });

  it("should return 400 if ID is missing", async () => {
    const request = createMockRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toBe("ID is required or invalid");
  });

  it("should return 500 if an error occurs during deletion", async () => {
    (prisma.books.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: "id",
    });
    (prisma.documents.findMany as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createMockRequest({ id: "id" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Can't find the card set or cards");
  });
});
