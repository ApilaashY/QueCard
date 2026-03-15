/** @jest-environment node */
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

// Mock the modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    books: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock NextResponse.json
jest.spyOn(NextResponse, "json");

jest.mock("@/lib/supabase/admin", () => ({
  tokenToUser: jest
    .fn()
    .mockResolvedValue("98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb"),
}));

describe("POST /api/queue-card/fetchSets", () => {
  const userId = "98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb";
  const cacheKey = `user_sets:${userId}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = () =>
    new NextRequest("http://localhost/api/queue-card/fetchSets", {
      method: "POST",
      headers: { Authorization: "Bearer dummy-token" },
    });

  it("should return sets from cache if available", async () => {
    const mockSets = [{ id: "1", title: "Cached Set" }];
    (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockSets));

    const response = await POST(createMockRequest());
    const data = await response.json();

    expect(redis.get).toHaveBeenCalledWith(cacheKey);
    expect(prisma.books.findMany).not.toHaveBeenCalled();
    expect(data).toEqual({ sets: mockSets });
    expect(response.status).toBe(200);
  });

  it("should fetch from DB and cache if cache is empty", async () => {
    const mockSets = [{ id: "2", title: "DB Set" }];
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.books.findMany as jest.Mock).mockResolvedValue(mockSets);

    const response = await POST(createMockRequest());
    const data = await response.json();

    expect(redis.get).toHaveBeenCalledWith(cacheKey);
    expect(prisma.books.findMany).toHaveBeenCalledWith({
      where: { owner: userId },
      select: { id: true, title: true },
    });
    expect(redis.set).toHaveBeenCalledWith(
      cacheKey,
      JSON.stringify(mockSets),
      "EX",
      600,
    );
    expect(data).toEqual({ sets: mockSets });
    expect(response.status).toBe(200);
  });

  it("should handle Redis errors and still fetch from DB", async () => {
    const mockSets = [{ id: "3", title: "DB Set after Redis error" }];
    (redis.get as jest.Mock).mockRejectedValue(new Error("Redis down"));
    (prisma.books.findMany as jest.Mock).mockResolvedValue(mockSets);

    const response = await POST(createMockRequest());
    const data = await response.json();

    expect(prisma.books.findMany).toHaveBeenCalled();
    expect(data).toEqual({ sets: mockSets });
    expect(response.status).toBe(200);
  });

  it("should return 500 if DB fetch fails", async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.books.findMany as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const response = await POST(createMockRequest());

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("Internal Server Error");
  });
});
