import express from "express";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import { randomUUID } from "crypto";
const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE"] }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
const CipherItem = z.object({
    id: z.string().uuid().optional(),
    ct: z.string().min(1),
    iv: z.string().min(1),
    tag: z.string().min(1),
    meta: z.record(z.any()).optional()
});
const db = new Map();
app.get("/healthz", (_req, res) => res.status(200).send({ ok: true }));
app.get("/vault/items", (_req, res) => {
    res.json({ items: [...db.values()] });
});
app.post("/vault/items", (req, res) => {
    const parsed = CipherItem.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.errors });
    const id = parsed.data.id ?? randomUUID();
    const item = { ...parsed.data, id };
    db.set(id, item);
    res.status(201).json(item);
});
app.get("/vault/items/:id", (req, res) => {
    const item = db.get(req.params.id);
    if (!item)
        return res.status(404).end();
    res.json(item);
});
app.delete("/vault/items/:id", (req, res) => {
    db.delete(req.params.id);
    res.status(204).end();
});
const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => console.log(`Mock API listening on http://localhost:${port}`));
//# sourceMappingURL=server.js.map