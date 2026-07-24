import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
import { ReadableStream, TransformStream, WritableStream } from "stream/web";

// Polyfill for Next.js edge runtime / web streams in Jest jsdom env
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

if (typeof global.ReadableStream === "undefined") {
  global.ReadableStream = ReadableStream as unknown as typeof global.ReadableStream;
}
if (typeof global.WritableStream === "undefined") {
  global.WritableStream = WritableStream as unknown as typeof global.WritableStream;
}
if (typeof global.TransformStream === "undefined") {
  global.TransformStream = TransformStream as unknown as typeof global.TransformStream;
}

// Mock environment variables for tests
process.env.GEMINI_API_KEY = "test-api-key";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";

// TODO look at this and maybe remove it after diagnosing tests
// Suppress expected console.error noise from deliberate error-path tests
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});
