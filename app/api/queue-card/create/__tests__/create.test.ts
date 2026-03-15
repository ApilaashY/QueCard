/** @jest-environment node */
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { NextRequest } from "next/server";

// Mock the modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    books: {
      create: jest.fn(),
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

describe("POST /api/queue-card/create", () => {
  const userId = "98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/queue-card/create", {
      method: "POST",
      headers: { Authorization: "Bearer dummy-token" },
      body: JSON.stringify(body),
    });
  };

  it("should create a new book and invalidate cache", async () => {
    const mockBook = { id: "new-book-id", title: "New Book" };
    (prisma.books.create as jest.Mock).mockResolvedValue(mockBook);

    const request = createMockRequest({ title: "New Book" });
    const response = await POST(request);
    const data = await response.json();

    expect(prisma.books.create).toHaveBeenCalledWith({
      data: {
        title: "New Book",
        owner: userId,
      },
    });
    expect(redis.del).toHaveBeenCalledWith(`user_sets:${userId}`);
    expect(data).toEqual({ id: "new-book-id" });
    expect(response.status).toBe(200);
  });

  it("should return 500 if DB creation fails", async () => {
    (prisma.books.create as jest.Mock).mockRejectedValue(
      new Error("DB creation failed"),
    );

    const request = createMockRequest({ title: "Failing Book" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Internal Server Error");
    expect(redis.del).not.toHaveBeenCalled();
  });
});
