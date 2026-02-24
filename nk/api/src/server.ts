import express from "express";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import { randomUUID, randomBytes } from "crypto";

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

const CipherItem = z.object({
  id: z.string().uuid().optional(),
  ct: z.string().min(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  meta: z.record(z.any()).optional()
});
type Item = z.infer<typeof CipherItem>;
const db = new Map<string, Item>();

const CredentialsBody = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const MfaSetupBody = z.object({
  username: z.string().trim().min(1),
});

const MfaVerifyBody = z.object({
  username: z.string().trim().min(1),
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

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
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
    return res.status(200).json({ success: false, message: "Wrong username or password. Please try again." });
  }

  return res.status(200).json({
    success: true,
    mfaEnabled: user.mfaEnabled,
  });
});

app.post("/mfa/setup", (req, res) => {
  const parsed = MfaSetupBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Username is required." });
  }

  const key = normalizeUsername(parsed.data.username);
  const user = users.get(key);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
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

app.post("/mfa/verify", (req, res) => {
  const parsed = MfaVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: "Username and MFA code are required." });
  }

  const key = normalizeUsername(parsed.data.username);
  const user = users.get(key);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  if (parsed.data.code !== mockMfaCode) {
    return res.status(401).json({ success: false, message: "Invalid MFA code. Try again." });
  }

  user.mfaEnabled = true;
  return res.status(200).json({ success: true, message: "MFA verified." });
});

app.get("/vault/items", (_req, res) => {
  res.json({ items: [...db.values()] });
});

app.post("/vault/items", (req, res) => {
  const parsed = CipherItem.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
  const id = parsed.data.id ?? randomUUID();
  const item: Item = { ...parsed.data, id };
  db.set(id, item);
  res.status(201).json(item);
});

app.get("/vault/items/:id", (req, res) => {
  const item = db.get(req.params.id);
  if (!item) return res.status(404).end();
  res.json(item);
});

app.delete("/vault/items/:id", (req, res) => {
  db.delete(req.params.id);
  res.status(204).end();
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`Mock API listening on http://localhost:${port}`));
