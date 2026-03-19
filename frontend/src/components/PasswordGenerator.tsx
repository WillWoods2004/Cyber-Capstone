import { useEffect, useRef, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";

type GeneratorOptions = {
  length: number;
  useLower: boolean;
  useUpper: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
};

type PasswordGeneratorProps = {
  currentUser: string;
};

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";

const GENERATED_PASSWORD_TIMEOUT_MS = 2 * 60 * 1000;
const WARNING_BEFORE_CLEAR_MS = 30 * 1000;

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

export default function PasswordGenerator({ currentUser }: PasswordGeneratorProps) {
  const [options, setOptions] = useState<GeneratorOptions>({
    length: 16,
    useLower: true,
    useUpper: true,
    useNumbers: true,
    useSymbols: false,
  });

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [timeoutMessage, setTimeoutMessage] = useState("");

  const { encryptAndStore } = useCrypto();

  const clearClipboardTimeoutRef = useRef<number | null>(null);
  const clearMessageTimeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const passwordClearTimeoutRef = useRef<number | null>(null);

  const clearGeneratedPasswordTimers = () => {
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (passwordClearTimeoutRef.current) {
      window.clearTimeout(passwordClearTimeoutRef.current);
      passwordClearTimeoutRef.current = null;
    }
  };

  const startGeneratedPasswordTimer = () => {
    clearGeneratedPasswordTimers();
    setTimeoutMessage("");

    warningTimeoutRef.current = window.setTimeout(() => {
      setTimeoutMessage("Warning: this generated password will be removed in 30 seconds unless you save it.");
    }, GENERATED_PASSWORD_TIMEOUT_MS - WARNING_BEFORE_CLEAR_MS);

    passwordClearTimeoutRef.current = window.setTimeout(() => {
      setPassword("");
      setCopyMessage("");
      setTimeoutMessage("Generated password was cleared for security because it was not saved in time.");
    }, GENERATED_PASSWORD_TIMEOUT_MS);
  };

  useEffect(() => {
    return () => {
      clearGeneratedPasswordTimers();

      if (clearClipboardTimeoutRef.current) {
        window.clearTimeout(clearClipboardTimeoutRef.current);
      }
      if (clearMessageTimeoutRef.current) {
        window.clearTimeout(clearMessageTimeoutRef.current);
      }
    };
  }, []);

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
    setCopyMessage("");
    setTimeoutMessage("");

    const pools: string[] = [];

    if (options.useLower) pools.push(LOWER);
    if (options.useUpper) pools.push(UPPER);
    if (options.useNumbers) pools.push(NUMBERS);
    if (options.useSymbols) pools.push(SYMBOLS);

    if (pools.length === 0) {
      setError("Pick at least one character type.");
      setPassword("");
      clearGeneratedPasswordTimers();
      return;
    }

    const length = Math.min(Math.max(options.length, 4), 64);
    const allChars = pools.join("");
    const chars: string[] = [];

    for (const pool of pools) {
      chars.push(pool[getRandomInt(pool.length)]);
    }

    while (chars.length < length) {
      chars.push(allChars[getRandomInt(allChars.length)]);
    }

    const final = shuffle(chars).join("");
    setPassword(final);
    startGeneratedPasswordTimer();
  };

  const copyToClipboard = async () => {
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCopyMessage("Copied. Clipboard will clear in 30 seconds.");

      if (clearClipboardTimeoutRef.current) {
        window.clearTimeout(clearClipboardTimeoutRef.current);
      }

      if (clearMessageTimeoutRef.current) {
        window.clearTimeout(clearMessageTimeoutRef.current);
      }

      clearClipboardTimeoutRef.current = window.setTimeout(async () => {
        try {
          const currentClipboard = await navigator.clipboard.readText();
          if (currentClipboard === password) {
            await navigator.clipboard.writeText("");
          }
        } catch {
          // ignore clipboard permission failures
        }
      }, 30000);

      clearMessageTimeoutRef.current = window.setTimeout(() => {
        setCopyMessage("Clipboard auto-cleared for security.");
      }, 30000);
    } catch {
      setCopyMessage("Clipboard access was not available.");
    }
  };

  const saveToVault = async () => {
    if (!password) return;

    try {
      await encryptAndStore(password, {
        userId: currentUser,
        label: "generated",
        createdAt: new Date().toISOString(),
        length: options.length,
        lower: options.useLower,
        upper: options.useUpper,
        numbers: options.useNumbers,
        symbols: options.useSymbols,
      });

      clearGeneratedPasswordTimers();
      setTimeoutMessage("");
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
      {copyMessage && <div className="pwgen-subtitle">{copyMessage}</div>}
      {timeoutMessage && <div className="pwgen-error">{timeoutMessage}</div>}

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
          {password || <span className="pwgen-placeholder">Nothing yet…</span>}
        </div>
      </div>
    </div>
  );
}
