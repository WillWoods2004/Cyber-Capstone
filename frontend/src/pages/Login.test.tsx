import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Login from "./Login";

// Mock the crypto provider
vi.mock("../crypto/CryptoProvider", () => ({
  useCrypto: () => ({
    setLegacyMasterPassword: vi.fn(),
    unlockVault: vi.fn(),
    clearKey: vi.fn(),
  }),
}));

// Mock the session helpers
vi.mock("../auth/session", () => ({
  clearSessionTokens: vi.fn(),
  saveChallengeToken: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const defaultProps = {
  onPasswordOk: vi.fn(),
  onShowRegister: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Login Page", () => {
  it("renders the login form correctly", () => {
    render(<Login {...defaultProps} />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your.email@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("********")).toBeInTheDocument();
    expect(screen.getByText("Log in")).toBeInTheDocument();
  });

  it("shows error message on wrong credentials", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Incorrect password." }),
    });

    render(<Login {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByText("Log in"));

    await waitFor(() => {
      expect(screen.getByText(/Incorrect password/i)).toBeInTheDocument();
    });
  });

  it("calls onPasswordOk after successful login", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        mfaEnabled: false,
        challengeToken: "",
      }),
    });

    render(<Login {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "correctpassword" },
    });
    fireEvent.click(screen.getByText("Log in"));

    await waitFor(() => {
      expect(defaultProps.onPasswordOk).toHaveBeenCalled();
    });
  });

  it("locks the form after 5 failed attempts", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Incorrect password." }),
    });

    render(<Login {...defaultProps} />);

    for (let i = 0; i < 5; i++) {
      fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
        target: { value: "test@test.com" },
      });

      const passwordField =
        screen.queryByPlaceholderText("********") ||
        screen.queryByPlaceholderText("Password entry locked");

      if (passwordField) {
        fireEvent.change(passwordField, { target: { value: "wrong" } });
      }

      fireEvent.click(screen.getByText("Log in"));
      await waitFor(() => {});
    }

    await waitFor(() => {
      expect(screen.getByText(/attempt limit reached/i)).toBeInTheDocument();
    });
  });

  it("shows loading state while logging in", async () => {
    mockFetch.mockResolvedValueOnce(new Promise(() => {}));

    render(<Login {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.email@example.com"), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("********"), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByText("Log in"));

    await waitFor(() => {
      expect(screen.getByText("Logging in...")).toBeInTheDocument();
    });
  });

  it("calls onShowRegister when Create one is clicked", () => {
    render(<Login {...defaultProps} />);
    fireEvent.click(screen.getByText("Create one"));
    expect(defaultProps.onShowRegister).toHaveBeenCalled();
  });
});
