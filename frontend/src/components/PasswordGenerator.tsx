// Front-End/frontend/src/components/PasswordGenerator.tsx
import { useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider"; // add

type GeneratorOptions = {
  length: number;
  useLower: boolean;
  useUpper: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
};

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

function getRandomInt(max: number) {
  if (window.crypto && window.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

const PasswordGenerator = () => {
  const [options, setOptions] = useState<GeneratorOptions>({
    length: 16,
    useLower: true,
    useUpper: true,
    useNumbers: true,
    useSymbols: false,
  });

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { encryptAndStore } = useCrypto(); // enable one-click save to vault

  const handleChange =
    (key: keyof GeneratorOptions) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (key === "length") {
        const value = Number(e.target.value || 0);
        setOptions((prev) => ({ ...prev, length: value }));
      } else {
        setOptions((prev) => ({ ...prev, [key]: e.target.checked }));
      }
    };

  const generate = () => {
    setError("");
    const pools: string[] = [];

    if (options.useLower) pools.push(LOWER);
    if (options.useUpper) pools.push(UPPER);
    if (options.useNumbers) pools.push(NUMBERS);
    if (options.useSymbols) pools.push(SYMBOLS);

    if (pools.length === 0) {
      setError("Pick at least one character type.");
      setPassword("");
      return;
    }

    const length = Math.min(Math.max(options.length, 4), 64);
    const allChars = pools.join("");

    const chars: string[] = [];

    // ensure at least one of each selected type (why: avoid missing a class)
    for (const pool of pools) {
      chars.push(pool[getRandomInt(pool.length)]);
    }

    // fill the rest
    while (chars.length < length) {
      chars.push(allChars[getRandomInt(allChars.length)]);
    }

    const final = shuffle(chars).join("");
    setPassword(final);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      // clipboard not available
    }
  };

  const saveToVault = async () => {
    if (!password) return;
    try {
      await encryptAndStore(password, {
        label: "generated",
        createdAt: new Date().toISOString(),
        length: options.length,
        lower: options.useLower,
        upper: options.useUpper,
        numbers: options.useNumbers,
        symbols: options.useSymbols,
      });
      alert("Saved to vault.");
    } catch (e: any) {
      alert(`Save failed: ${e?.message ?? String(e)}`);
    }
  };

  return (
    <div className="pwgen">
      <h2 className="pwgen-title">Password generator</h2>
      <p className="pwgen-subtitle">
        Choose the options and we'll generate a password.
      </p>

      <div className="pwgen-grid">
        <label className="pwgen-field">
          <span>Length</span>
          <input
            type="number"
            min={4}
            max={64}
            value={options.length}
            onChange={handleChange("length")}
          />
        </label>

        <label className="pwgen-checkbox">
          <input
            type="checkbox"
            checked={options.useLower}
            onChange={handleChange("useLower")}
          />
          <span>Lowercase (a–z)</span>
        </label>

        <label className="pwgen-checkbox">
          <input
            type="checkbox"
            checked={options.useUpper}
            onChange={handleChange("useUpper")}
          />
          <span>Uppercase (A–Z)</span>
        </label>

        <label className="pwgen-checkbox">
          <input
            type="checkbox"
            checked={options.useNumbers}
            onChange={handleChange("useNumbers")}
          />
          <span>Numbers (0–9)</span>
        </label>

        <label className="pwgen-checkbox">
          <input
            type="checkbox"
            checked={options.useSymbols}
            onChange={handleChange("useSymbols")}
          />
          <span>Symbols (!@#$...)</span>
        </label>
      </div>

      {error && <div className="pwgen-error">{error}</div>}

      <div className="pwgen-actions">
        <button className="primary-btn" onClick={generate}>
          Generate password
        </button>

        <button
          type="button"
          className="pwgen-copy"
          onClick={copyToClipboard}
          disabled={!password}
        >
          Copy
        </button>

        <button
          type="button"
          className="pwgen-copy"
          onClick={saveToVault}
          disabled={!password}
        >
          Save to vault
        </button>
      </div>

      <div className="pwgen-output">
        <span className="pwgen-output-label">Generated password</span>
        <div className="pwgen-output-box">
          {password || (
            <span className="pwgen-placeholder">Nothing yet…</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordGenerator;
