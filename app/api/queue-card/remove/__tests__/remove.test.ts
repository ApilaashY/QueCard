/** @jest-environment node */
import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Mock the modules
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cards: {
      deleteMany: jest.fn(),
    },
    card_sets: {
      delete: jest.fn(),
    },
  },
}));

describe("POST /api/queue-card/remove", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return new NextRequest("http://localhost/api/queue-card/remove", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should remove all cards and the card set", async () => {
    const setId = "set-123";
    (prisma.cards.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
    (prisma.card_sets.delete as jest.Mock).mockResolvedValue({ id: setId });

    const request = createMockRequest({ id: setId });
    const response = await POST(request);
    const data = await response.json();

    expect(prisma.cards.deleteMany).toHaveBeenCalledWith({
      where: { card_set_id: setId },
    });
    expect(prisma.card_sets.delete).toHaveBeenCalledWith({
      where: { id: setId },
    });
    expect(data.message).toBe("Card set removed successfully");
    expect(response.status).toBe(200);
  });

  it("should return 400 if ID is missing", async () => {
    const request = createMockRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Missing card set ID");
  });

  it("should return 500 if a DB error occurs", async () => {
    (prisma.cards.deleteMany as jest.Mock).mockRejectedValue(
      new Error("DB error"),
    );

    const request = createMockRequest({ id: "id" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to remove card set");
  });
});
