import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import MFAVerify from "./MFAVerify";

// Mock session helpers
vi.mock("../auth/session", () => ({
  getChallengeToken: vi.fn(() => null),
  clearChallengeToken: vi.fn(),
  saveAuthToken: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const defaultProps = {
  username: "testuser",
  enrolled: true,
  onMfaOk: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MFAVerify Page", () => {
  it("renders verify mode when user is already enrolled", () => {
    render(<MFAVerify {...defaultProps} enrolled={true} />);
    expect(screen.getByText("Enter MFA Code")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
    expect(screen.getByText("Verify")).toBeInTheDocument();
  });

  it("renders setup mode when user is not enrolled", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        otpAuthUrl: "otpauth://totp/test",
        secret: "TESTSECRET",
        mockCode: "123456",
      }),
    });

    render(<MFAVerify {...defaultProps} enrolled={false} />);
    expect(screen.getByText("Set up MFA")).toBeInTheDocument();
  });

  it("shows error when submitting empty code", async () => {
    render(<MFAVerify {...defaultProps} />);

    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(
        screen.getByText("Please enter the code from your Authenticator app.")
      ).toBeInTheDocument();
    });
  });

  it("shows error on invalid MFA code", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Invalid MFA code. Please try again." }),
    });

    render(<MFAVerify {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(screen.getByText(/Invalid MFA code/i)).toBeInTheDocument();
    });
  });

  it("calls onMfaOk after successful verification", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        authToken: "fake-auth-token",
      }),
    });

    render(<MFAVerify {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(defaultProps.onMfaOk).toHaveBeenCalled();
    });
  });

  it("shows verifying state while submitting", async () => {
    mockFetch.mockResolvedValueOnce(new Promise(() => {}));

    render(<MFAVerify {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(screen.getByText("Verifying...")).toBeInTheDocument();
    });
  });

  it("shows error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<MFAVerify {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("123456"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it("only allows 6 digit input", () => {
    render(<MFAVerify {...defaultProps} />);
    const input = screen.getByPlaceholderText("123456");
    expect(input).toHaveAttribute("maxLength", "6");
  });
});
