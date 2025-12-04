import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for Next.js edge runtime
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock environment variables for tests
process.env.GEMINI_API_KEY = "test-api-key";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
