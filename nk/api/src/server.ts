import express from "express";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { z } from "zod";

const NODE_ENV = process.env.NODE_ENV?.trim() || "development";
const IS_PRODUCTION = NODE_ENV === "production";
const DEFAULT_TOKEN_SECRET = "securitypass-local-dev-secret";
const TOKEN_SECRET = process.env.MOCK_TOKEN_SECRET?.trim() || DEFAULT_TOKEN_SECRET;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const AUTH_TTL_MS = 15 * 60 * 1000;
const DEFAULT_PORT = 8080;
const HOST = process.env.HOST?.trim() || "0.0.0.0";
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? 1);
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

type TokenKind = "challenge" | "auth";

type TokenPayload = {
  sub: string;
  type: TokenKind;
  exp: number;
};

type VaultProfile = {
  salt: string;
  keyVersion: number;
};

type UserRecord = {
  username: string;
  passwordHash: string;
  passwordSalt: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  vaultSalt: string;
  vaultKeyVersion: number;
};

type Item = {
  id: string;
  owner: string;
  ct: string;
  iv: string;
  tag: string;
  meta?: Record<string, unknown>;
};

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", TRUST_PROXY_HOPS);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !CORS_ALLOWED_ORIGINS.length || CORS_ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization"],
  })
);
app.use(express.json({ limit: "256kb" }));
app.use(morgan("dev"));

if (IS_PRODUCTION && TOKEN_SECRET === DEFAULT_TOKEN_SECRET) {
  throw new Error("MOCK_TOKEN_SECRET must be set in production.");
}

const CipherItemInput = z.object({
  id: z.string().uuid().optional(),
  ct: z.string().min(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  meta: z.record(z.any()).optional(),
});

const CredentialsBody = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const MfaVerifyBody = z.object({
  code: z.string().trim().min(1),
});

const RotateKeyBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  newVaultSalt: z.string().min(1),
  items: z.array(CipherItemInput),
});

const db = new Map<string, Item>();
const users = new Map<string, UserRecord>();
const mockMfaCode = IS_PRODUCTION ? "" : process.env.MOCK_MFA_CODE?.trim() || "123456";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function createVaultProfile(): VaultProfile {
  return {
    salt: randomBytes(16).toString("base64"),
    keyVersion: 1,
  };
}

function hashPassword(password: string, salt = randomBytes(16).toString("base64")) {
  const derived = scryptSync(password, salt, 64).toString("base64");
  return { salt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const derived = scryptSync(password, salt, 64).toString("base64");
  return timingSafeEqual(Buffer.from(derived, "utf8"), Buffer.from(expectedHash, "utf8"));
}

function encodeBase32(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(input: string) {
  const normalized = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error("Invalid base32 secret.");
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

function generateTotpCode(secret: string, counter: number) {
  const key = decodeBase32(secret);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", key).update(msg).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function verifyTotpCode(secret: string | undefined, code: string, now = Date.now()) {
  if (!secret) {
    return false;
  }

  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  try {
    const currentCounter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
    for (let offset = -1; offset <= 1; offset += 1) {
      if (generateTotpCode(secret, currentCounter + offset) === normalizedCode) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function tokenSignature(body: string): Buffer {
  return createHmac("sha256", TOKEN_SECRET).update(body).digest();
}

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function issueToken(type: TokenKind, username: string, ttlMs: number) {
  const payload: TokenPayload = {
    sub: normalizeUsername(username),
    type,
    exp: Date.now() + ttlMs,
  };

  const body = toBase64Url(JSON.stringify(payload));
  const signature = toBase64Url(tokenSignature(body));
  return `${body}.${signature}`;
}

function verifyToken(rawToken: string | null | undefined, expectedType: TokenKind): TokenPayload | null {
  if (!rawToken) {
    return null;
  }

  const [body, signature] = rawToken.split(".");
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = tokenSignature(body);
  const providedSignature = Buffer.from(signature, "base64url");
  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(expectedSignature, providedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (payload.type !== expectedType || payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function readBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

function requireToken(type: TokenKind): express.RequestHandler {
  return (req, res, next) => {
    const token = readBearerToken(req.header("Authorization"));
    const payload = verifyToken(token, type);

    if (!payload) {
      return res.status(401).json({ success: false, message: "Missing or invalid token." });
    }

    req.auth = payload;
    next();
  };
}

function requireUser(req: express.Request, res: express.Response) {
  const username = req.auth?.sub;
  if (!username) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return null;
  }

  const user = users.get(username);
  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return null;
  }

  return user;
}

function sanitizeItemForClient(item: Item) {
  return {
    id: item.id,
    ct: item.ct,
    iv: item.iv,
    tag: item.tag,
    meta: item.meta,
  };
}

function sanitizeMeta(meta: Record<string, unknown> | undefined, keyVersion: number) {
  const nextMeta = { ...(meta ?? {}) };
  delete nextMeta.userId;
  nextMeta.keyVersion = keyVersion;
  return nextMeta;
}

function userItems(owner: string) {
  return [...db.values()].filter((item) => item.owner === owner);
}

app.get("/healthz", (_req, res) => res.status(200).send({ ok: true }));
app.get("/readyz", (_req, res) => res.status(200).send({ ok: true, status: "ready" }));

app.post("/register", (req, res) => {
  const parsed = CredentialsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  const username = parsed.data.username.trim();
  const key = normalizeUsername(username);
  if (users.has(key)) {
    return res.status(409).json({ success: false, message: "Username already exists." });
  }

  const profile = createVaultProfile();
  const passwordRecord = hashPassword(parsed.data.password);
  users.set(key, {
    username,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
    mfaEnabled: false,
    vaultSalt: profile.salt,
    vaultKeyVersion: profile.keyVersion,
  });

  return res.status(201).json({ success: true, message: "Registration successful." });
});

app.post("/login", (req, res) => {
  const parsed = CredentialsBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  const key = normalizeUsername(parsed.data.username);
  const user = users.get(key);
  if (!user || !verifyPassword(parsed.data.password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ success: false, message: "Wrong username or password. Please try again." });
  }

  return res.status(200).json({
    success: true,
    mfaEnabled: user.mfaEnabled,
    challengeToken: issueToken("challenge", user.username, CHALLENGE_TTL_MS),
    vaultProfile: {
      salt: user.vaultSalt,
      keyVersion: user.vaultKeyVersion,
    },
  });
});

app.post("/mfa/setup", requireToken("challenge"), (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const secret = generateTotpSecret();
  user.mfaSecret = secret;

  const label = encodeURIComponent(`SecurityPass:${user.username}`);
  const issuer = encodeURIComponent("SecurityPass");
  const otpAuthUrl =
    `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}` +
    `&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;

  return res.status(200).json({
    success: true,
    secret,
    otpAuthUrl,
    mockCode: mockMfaCode || undefined,
  });
});

app.post("/mfa/verify", requireToken("challenge"), (req, res) => {
  const parsed = MfaVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "MFA code is required." });
  }

  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const mockCodeAccepted = Boolean(mockMfaCode) && parsed.data.code === mockMfaCode;
  if (!mockCodeAccepted && !verifyTotpCode(user.mfaSecret, parsed.data.code)) {
    return res.status(401).json({ success: false, message: "Invalid MFA code. Try again." });
  }

  user.mfaEnabled = true;
  return res.status(200).json({
    success: true,
    message: "MFA verified.",
    authToken: issueToken("auth", user.username, AUTH_TTL_MS),
    vaultProfile: {
      salt: user.vaultSalt,
      keyVersion: user.vaultKeyVersion,
    },
  });
});

app.get("/vault/profile", requireToken("auth"), (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  return res.status(200).json({
    salt: user.vaultSalt,
    keyVersion: user.vaultKeyVersion,
  });
});

app.get("/vault/items", requireToken("auth"), (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  res.json({ items: userItems(normalizeUsername(user.username)).map(sanitizeItemForClient) });
});

app.post("/vault/items", requireToken("auth"), (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const parsed = CipherItemInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }

  const id = parsed.data.id ?? randomUUID();
  const existing = db.get(id);
  if (existing && existing.owner !== normalizeUsername(user.username)) {
    return res.status(403).json({ success: false, message: "Cannot overwrite another user's item." });
  }

  const item: Item = {
    id,
    owner: normalizeUsername(user.username),
    ct: parsed.data.ct,
    iv: parsed.data.iv,
    tag: parsed.data.tag,
    meta: sanitizeMeta(parsed.data.meta, user.vaultKeyVersion),
  };

  db.set(id, item);
  res.status(201).json(sanitizeItemForClient(item));
});

app.get("/vault/items/:id", requireToken("auth"), (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const item = db.get(req.params.id);
  if (!item || item.owner !== normalizeUsername(user.username)) {
    return res.status(404).end();
  }

  res.json(sanitizeItemForClient(item));
});

app.delete("/vault/items/:id", requireToken("auth"), (req, res) => {
  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  const item = db.get(req.params.id);
  if (!item || item.owner !== normalizeUsername(user.username)) {
    return res.status(404).end();
  }

  db.delete(req.params.id);
  res.status(204).end();
});

app.post("/vault/rotate-key", requireToken("auth"), (req, res) => {
  const parsed = RotateKeyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors });
  }

  const user = requireUser(req, res);
  if (!user) {
    return;
  }

  if (!verifyPassword(parsed.data.currentPassword, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ success: false, message: "Current master password is incorrect." });
  }

  const saltBytes = Buffer.from(parsed.data.newVaultSalt, "base64");
  if (saltBytes.length < 16) {
    return res.status(400).json({ success: false, message: "Rotation salt must decode to at least 16 bytes." });
  }

  const owner = normalizeUsername(user.username);
  const existingItems = userItems(owner);
  if (parsed.data.items.length !== existingItems.length) {
    return res.status(409).json({
      success: false,
      message: "Rotation payload must include every current vault item.",
    });
  }

  for (const item of existingItems) {
    db.delete(item.id);
  }

  const rotatedPassword = hashPassword(parsed.data.newPassword);
  user.passwordHash = rotatedPassword.hash;
  user.passwordSalt = rotatedPassword.salt;
  user.vaultSalt = parsed.data.newVaultSalt;
  user.vaultKeyVersion += 1;

  for (const nextItem of parsed.data.items) {
    const id = nextItem.id ?? randomUUID();
    db.set(id, {
      id,
      owner,
      ct: nextItem.ct,
      iv: nextItem.iv,
      tag: nextItem.tag,
      meta: sanitizeMeta(nextItem.meta, user.vaultKeyVersion),
    });
  }

  return res.status(200).json({
    success: true,
    message: "Vault key rotation complete.",
    vaultProfile: {
      salt: user.vaultSalt,
      keyVersion: user.vaultKeyVersion,
    },
  });
});

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const server = app.listen(port, HOST, () =>
  console.log(`Mock API listening on http://${HOST}:${port} (${NODE_ENV})`)
);

function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down HTTP server...`);
  server.close(() => {
    console.log("HTTP server stopped.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
