/** @jest-environment node */
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Mock the modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cards: {
      findMany: jest.fn(),
    },
  },
}));

describe("POST /api/queue-card/fetchCardSet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/queue-card/fetchCardSet", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should fetch cards for a card set", async () => {
    const setId = "set-123";
    const mockCards = [
      { id: "1", question: "Q1", answer: "A1" },
      { id: "2", question: "Q2", answer: "A2" },
    ];
    (prisma.cards.findMany as jest.Mock).mockResolvedValue(mockCards);

    const request = createMockRequest({ id: setId });
    const response = await POST(request);
    const data = await response.json();

    expect(prisma.cards.findMany).toHaveBeenCalledWith({
      where: { card_set_id: setId },
      orderBy: { order: "asc" },
      select: { id: true, question: true, answer: true },
    });
    expect(data).toEqual({ cards: mockCards });
    expect(response.status).toBe(200);
  });

  it("should return 400 if ID is missing", async () => {
    const request = createMockRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid or missing 'id' parameter");
  });

  it("should return 404 if no cards are found", async () => {
    (prisma.cards.findMany as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest({ id: "empty-set" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("No cards found");
  });

  it("should return 404 if a DB error occurs", async () => {
    (prisma.cards.findMany as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createMockRequest({ id: "id" });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Can't fetch cards");
  });
});
