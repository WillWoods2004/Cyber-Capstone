// ONLY NEW CODE MARKED WITH *** COMMENTS

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

  // *** NEW STATE
  const [site, setSite] = useState("");
  const [usernameInput, setUsernameInput] = useState("");

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
      if (clearClipboardTimeoutRef.current) window.clearTimeout(clearClipboardTimeoutRef.current);
      if (clearMessageTimeoutRef.current) window.clearTimeout(clearMessageTimeoutRef.current);
    };
  }, []);

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

    setPassword(shuffle(chars).join(""));
    startGeneratedPasswordTimer();
  };

  const saveToVault = async () => {
    if (!password) return;

    // *** VALIDATION
    if (!site.trim()) {
      alert("Enter the site for this password.");
      return;
    }

    if (!usernameInput.trim()) {
      alert("Enter the username for this password.");
      return;
    }

    try {
      const savedAt = new Date().toISOString();

      await encryptAndStore(password, {
        userId: currentUser,
        site: site.trim(),            // *** NEW
        login: usernameInput.trim(),  // *** NEW
        username: usernameInput.trim(), // *** NEW
        label: "generated",
        createdAt: savedAt,
        savedAt,
        length: options.length,
        lower: options.useLower,
        upper: options.useUpper,
        numbers: options.useNumbers,
        symbols: options.useSymbols,
      });

      clearGeneratedPasswordTimers();
      setTimeoutMessage("");
      setSite("");              // *** CLEAR
      setUsernameInput("");     // *** CLEAR
      alert("Saved to vault.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Save failed: ${message}`);
    }
  };

  return (
    <div className="pwgen">
      <h2 className="pwgen-title">Password generator</h2>

      {/* *** NEW INPUTS */}
      <input
        placeholder="Website (e.g., gmail.com)"
        value={site}
        onChange={(e) => setSite(e.target.value)}
      />

      <input
        placeholder="Username / Email"
        value={usernameInput}
        onChange={(e) => setUsernameInput(e.target.value)}
      />

      <div className="pwgen-actions">
        <button onClick={generate}>Generate password</button>
        <button onClick={saveToVault} disabled={!password}>
          Save to vault
        </button>
      </div>

      <div className="pwgen-output">
        {password || "Nothing yet..."}
      </div>
    </div>
  );
}
