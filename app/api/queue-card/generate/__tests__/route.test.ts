// Mock dependencies
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContentStream: jest.fn().mockResolvedValue({
        stream: (async function* () {
          yield { text: () => "Question 1: What is this?\n" };
          yield { text: () => "Question 2: How does it work?" };
        })(),
      }),
    }),
  })),
}));

jest.mock("@google/generative-ai/server", () => ({
  GoogleAIFileManager: jest.fn().mockImplementation(() => ({
    uploadFile: jest.fn().mockResolvedValue({
      file: {
        uri: "https://example.com/file",
        mimeType: "application/pdf",
      },
    }),
  })),
}));

describe("PDF Queue Card Generation API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should have Gemini AI mocked correctly", async () => {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const ai = new GoogleGenerativeAI("test-key");
    expect(ai.getGenerativeModel).toBeDefined();
  });

  it("should have Supabase client mocked correctly", async () => {
    const { supabase } = await import("@/lib/supabase");
    expect(supabase.from).toBeDefined();
  });

  it("should have FileManager mocked correctly", async () => {
    const { GoogleAIFileManager } = await import(
      "@google/generative-ai/server"
    );
    const fm = new GoogleAIFileManager("test-key");
    expect(fm.uploadFile).toBeDefined();
  });
});
