import { describe, it, expect } from "vitest";
import { deriveMasterKey, encryptEntry, decryptEntry, zeroize } from "../src/crypto";

const te = new TextEncoder();
const td = new TextDecoder();

describe("Crypto SDK", () => {
  it("round-trips AES-GCM", async () => {
    const { key } = await deriveMasterKey("CorrectHorseBatteryStaple!");
    const pt = te.encode("neelan:supersecret");
    const item = await encryptEntry(key, pt, { label: "test" });
    const out = await decryptEntry(key, item);
    expect(td.decode(out)).toBe("neelan:supersecret");
    zeroize(out);
  });

  it("fails on wrong key", async () => {
    const { key } = await deriveMasterKey("CorrectHorseBatteryStaple!");
    const { key: bad } = await deriveMasterKey("WrongPw");
    const pt = te.encode("x");
    const item = await encryptEntry(key, pt);
    await expect(decryptEntry(bad, item)).rejects.toThrow();
  });
});
