import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ErrorBox } from "./Error";

describe("Error Component", () => {
  it("renders error message when message is provided", () => {
    render(<ErrorBox message="This is an error" />);
    expect(screen.getByText("This is an error")).toBeInTheDocument();
  });

  it("does not render when message is empty string", () => {
    const { container } = render(<ErrorBox message="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders error box with correct styling class", () => {
    render(<ErrorBox message="Test error" />);
    const errorBox = screen.getByText("Test error").parentElement;
    expect(errorBox).toHaveClass("error-box");
  });

  it("handles special characters in error message", () => {
    render(<ErrorBox message="Error: <script>alert('test')</script>" />);
    expect(screen.getByText("Error: <script>alert('test')</script>")).toBeInTheDocument();
  });
});
