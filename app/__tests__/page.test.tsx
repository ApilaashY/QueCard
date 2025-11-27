import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "../page";

// Mock fetch
global.fetch = jest.fn();

describe("Home Component", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it("renders file input and submit button", () => {
    render(<Home />);

    const fileInput = screen
      .getByRole("button", { name: /generate queue card/i })
      .closest("form")!
      .querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    const submitButton = screen.getByRole("button", {
      name: /generate queue card/i,
    });
    expect(submitButton).toBeInTheDocument();
  });

  it("shows error when no file is selected", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock fetch to prevent actual network call
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Should not be called")
    );

    render(<Home />);

    const form = screen
      .getByRole("button", { name: /generate queue card/i })
      .closest("form")!;

    // Simply submit the form without selecting a file
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(consoleSpy).toHaveBeenCalledWith("No PDF file selected");
      },
      { timeout: 1000 }
    );

    // Ensure fetch was not called
    expect(global.fetch).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // File upload tests are complex in jsdom and are better suited for E2E tests
  // For production apps, use Playwright or Cypress for testing file uploads
  it("has correct form structure for file upload", () => {
    render(<Home />);

    const form = screen
      .getByRole("button", { name: /generate queue card/i })
      .closest("form")!;
    const fileInput = form.querySelector(
      'input[type="file"][name="PDF"]'
    ) as HTMLInputElement;

    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe("application/pdf");
  });
});
