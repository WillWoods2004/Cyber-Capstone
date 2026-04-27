import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import RecentPasswords from "./RecentPasswords";

const mockListItems = vi.fn();
const mockDecryptItem = vi.fn();

vi.mock("../crypto/CryptoProvider", () => ({
  useCrypto: () => ({
    listItems: mockListItems,
    decryptItem: mockDecryptItem,
    isReady: true,
    vaultMode: "shared",
  }),
}));

vi.mock("../utils/security", () => ({
  filterVaultItems: (items: unknown[]) => items,
}));

const mockPasswords = [
  {
    id: "1",
    meta: {
      site: "GitHub",
      username: "testuser",
      savedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  },
  {
    id: "2",
    meta: {
      site: "Gmail",
      username: "user@gmail.com",
      savedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  },
];

describe("RecentPasswords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when no passwords exist", async () => {
    mockListItems.mockResolvedValue([]);
    mockDecryptItem.mockResolvedValue("");

    render(<RecentPasswords currentUser="testuser" />);

    await waitFor(() => {
      expect(screen.getByText("No passwords saved yet.")).toBeInTheDocument();
    });
  });

  it("renders recent password entries", async () => {
    mockListItems.mockResolvedValue(mockPasswords);
    mockDecryptItem
      .mockResolvedValueOnce("StrongPass123!")
      .mockResolvedValueOnce("AnotherPass456!");

    render(<RecentPasswords currentUser="testuser" />);

    await waitFor(() => {
      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByText("Gmail")).toBeInTheDocument();
    });
  });

  it("does not show plaintext passwords", async () => {
    mockListItems.mockResolvedValue(mockPasswords);
    mockDecryptItem
      .mockResolvedValueOnce("StrongPass123!")
      .mockResolvedValueOnce("AnotherPass456!");

    render(<RecentPasswords currentUser="testuser" />);

    await waitFor(() => {
      expect(screen.getAllByText("••••••••••").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("StrongPass123!")).not.toBeInTheDocument();
    expect(screen.queryByText("AnotherPass456!")).not.toBeInTheDocument();
  });
});
