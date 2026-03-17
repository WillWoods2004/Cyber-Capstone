import express, { type Request, type Response } from "express";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import { randomUUID, randomBytes } from "crypto";

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const CipherItem = z.object({
  id: z.string().trim().min(1).optional(),
  ct: z.string().min(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  meta: z.record(z.any()).optional(),
});
type VaultItem = z.infer<typeof CipherItem>;

type StoredItem = VaultItem & {
  ownerKey: string;
};

const db = new Map<string, StoredItem>();

const CredentialsBody = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const MfaVerifyBody = z.object({
  code: z.string().trim().min(1),
});

type UserRecord = {
  username: string;
  password: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
};

const users = new Map<string, UserRecord>();
const mockMfaCode = process.env.MOCK_MFA_CODE?.trim() || "123456";

type SessionStage = "challenge" | "vault";

type SessionRecord = {
  usernameKey: string;
  stage: SessionStage;
  issuedAt: string;
};

const sessions = new Map<string, SessionRecord>();

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function createSessionToken(): string {
  return randomBytes(24).toString("base64url");
}

function issueSession(usernameKey: string, stage: SessionStage): string {
  const token = createSessionToken();
  sessions.set(token, {
    usernameKey,
    stage,
    issuedAt: new Date().toISOString(),
  });
  return token;
}

function readBearerToken(req: Request): string | null {
  const header = req.get("authorization");
  if (!header) return null;

  const [scheme, ...parts] = header.trim().split(/\s+/);
  const token = parts.join(" ").trim();
  if (scheme.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

function getSessionContext(req: Request, res: Response, stage: SessionStage) {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: "Authorization token required." });
    return null;
  }

  const session = sessions.get(token);
  if (!session || session.stage !== stage) {
    res.status(401).json({ success: false, message: "Invalid or expired session." });
    return null;
  }

  const user = users.get(session.usernameKey);
  if (!user) {
    sessions.delete(token);
    res.status(401).json({ success: false, message: "Session user no longer exists." });
    return null;
  }

  return { token, session, user };
}

function toClientItem(item: StoredItem): VaultItem {
  const { ownerKey: _ownerKey, ...publicItem } = item;
  return publicItem;
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const { userId: _ignoredUserId, ...rest } = meta;
  return Object.keys(rest).length > 0 ? rest : undefined;
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

  users.set(key, {
    username,
    password: parsed.data.password,
    mfaEnabled: false,
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

  const challengeToken = issueSession(key, "challenge");

  return res.status(200).json({
    success: true,
    username: user.username,
    normalizedUsername: key,
    mfaEnabled: user.mfaEnabled,
    challengeToken,
  });
});

app.post("/mfa/setup", (req, res) => {
  const auth = getSessionContext(req, res, "challenge");
  if (!auth) return;
  const { user } = auth;

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

app.post("/mfa/verify", (req, res) => {
  const auth = getSessionContext(req, res, "challenge");
  if (!auth) return;

  const parsed = MfaVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "MFA code is required." });
  }

  const { token, session, user } = auth;

  if (!user.mfaEnabled && !user.mfaSecret) {
    return res.status(409).json({ success: false, message: "MFA setup has not been initialized." });
  }

  if (parsed.data.code !== mockMfaCode) {
    return res.status(401).json({ success: false, message: "Invalid MFA code. Try again." });
  }

  user.mfaEnabled = true;
  sessions.delete(token);

  const authToken = issueSession(session.usernameKey, "vault");
  return res.status(200).json({
    success: true,
    message: "MFA verified.",
    authToken,
  });
});

app.get("/vault/items", (req, res) => {
  const auth = getSessionContext(req, res, "vault");
  if (!auth) return;

  const items = [...db.values()]
    .filter((item) => item.ownerKey === auth.session.usernameKey)
    .map(toClientItem);

  res.json({ items });
});

app.post("/vault/items", (req, res) => {
  const auth = getSessionContext(req, res, "vault");
  if (!auth) return;

  const parsed = CipherItem.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });

  const id = parsed.data.id ?? randomUUID();
  const item: StoredItem = {
    ...parsed.data,
    id,
    meta: sanitizeMeta(parsed.data.meta),
    ownerKey: auth.session.usernameKey,
  };

  db.set(id, item);
  res.status(201).json(toClientItem(item));
});

app.get("/vault/items/:id", (req, res) => {
  const auth = getSessionContext(req, res, "vault");
  if (!auth) return;

  const item = db.get(req.params.id);
  if (!item || item.ownerKey !== auth.session.usernameKey) return res.status(404).end();

  res.json(toClientItem(item));
});

app.delete("/vault/items/:id", (req, res) => {
  const auth = getSessionContext(req, res, "vault");
  if (!auth) return;

  const item = db.get(req.params.id);
  if (!item || item.ownerKey !== auth.session.usernameKey) {
    return res.status(404).end();
  }

  db.delete(req.params.id);
  res.status(204).end();
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`Mock API listening on http://localhost:${port}`));
