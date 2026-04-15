import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import RecentPasswords from "./RecentPasswords";

// Mock the crypto provider
const mockListItems = vi.fn();
const mockDecryptItem = vi.fn();

vi.mock("../crypto/CryptoProvider", () => ({
  useCrypto: () => ({
    listItems: mockListItems,
    decryptItem: mockDecryptItem,
    isReady: true,
  }),
}));

const mockPasswords = [
  {
    meta: {
      site: "GitHub",
      username: "testuser",
      savedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
  },
  {
    meta: {
      site: "Gmail