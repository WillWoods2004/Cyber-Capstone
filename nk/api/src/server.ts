import express from "express";
import morgan from "morgan";
import cors from "cors";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { z } from "zod";

const TOKEN_SECRET = process.env.MOCK_TOKEN_SECRET?.trim() || "securitypass-local-dev-secret";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const AUTH_TTL_MS = 15 * 60 * 1000;

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
  password: string;
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
app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

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
const mockMfaCode = process.env.MOCK_MFA_CODE?.trim() || "123456";

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function createVaultProfile(): VaultProfile {
  return {
    salt: randomBytes(16).toString("base64"),
    keyVersion: 1,
  };
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
  users.set(key, {
    username,
    password: parsed.data.password,
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
  if (!user || user.password !== parsed.data.password) {
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

  const secret = randomBytes(10).toString("hex").toUpperCase();
  user.mfaSecret = secret;

  const label = encodeURIComponent(`SecurityPass:${user.username}`);
  const issuer = encodeURIComponent("SecurityPass");
  const otpAuthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;

  return res.status(200).json({
    success: true,
    secret,
    otpAuthUrl,
    mockCode: mockMfaCode,
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

  if (parsed.data.code !== mockMfaCode) {
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

  if (parsed.data.currentPassword !== user.password) {
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

  user.password = parsed.data.newPassword;
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

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`Mock API listening on http://localhost:${port}`));
