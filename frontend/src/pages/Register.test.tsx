import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Register from "./Register";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const defaultProps = {
  onRegistered: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Register Page", () => {

  // --- RENDERING ---
  it("renders the registration form correctly", () => {
    render(<Register {...defaultProps} />);
    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("your.username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Create a strong password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Repeat your password")).toBeInTheDocument();
    expect(screen.getByText("Create account")).toBeInTheDocument();
  });

  // --- EMPTY FIELDS ---
  it("shows error when all fields are empty", async () => {
    render(<Register {...defaultProps} />);

    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(screen.getByText("All fields are required.")).toBeInTheDocument();
    });
  });

  // --- PASSWORDS DO NOT MATCH ---
  it("shows error when passwords do not match", async () => {
    render(<Register {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
      target: { value: "DifferentPassword" },
    });
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
  });

  // --- PASSWORD TOO SHORT ---
  it("shows error when password is less than 8 characters", async () => {
    render(<Register {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(
        screen.getByText("Password should be at least 8 characters long.")
      ).toBeInTheDocument();
    });
  });

  // --- SUCCESSFUL REGISTRATION ---
  it("calls onRegistered after successful registration", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    render(<Register {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(defaultProps.onRegistered).toHaveBeenCalledWith("testuser");
    });
  });

  // --- SERVER ERROR ---
  it("shows error when server returns failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, message: "Username already taken." }),
    });

    render(<Register {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(screen.getByText("Username already taken.")).toBeInTheDocument();
    });
  });

  // --- LOADING STATE ---
  it("shows loading state while registering", async () => {
    mockFetch.mockResolvedValueOnce(new Promise(() => {})); // never resolves

    render(<Register {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(screen.getByText("Creating account...")).toBeInTheDocument();
    });
  });

  // --- NETWORK ERROR ---
  it("shows error on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<Register {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText("your.username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText("Create a strong password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Repeat your password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() => {
      expect(screen.getByText("Network error. Try again.")).toBeInTheDocument();
    });
  });

  // --- CANCEL BUTTON ---
  it("calls onCancel when Sign in is clicked", () => {
    render(<Register {...defaultProps} />);
    fireEvent.click(screen.getByText("Sign in"));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

});