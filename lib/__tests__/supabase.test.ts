import { supabase } from "../supabase";

describe("Supabase Client", () => {
  it("should be defined", () => {
    expect(supabase).toBeDefined();
  });

  it("should have the correct methods", () => {
    expect(supabase.from).toBeDefined();
    expect(typeof supabase.from).toBe("function");
  });
});

describe("Supabase Integration", () => {
  // These tests would require actual Supabase credentials
  // For now, we're just testing the structure

  it("should create a query builder", () => {
    const query = supabase.from("pdf_flashcards");
    expect(query).toBeDefined();
  });
});
