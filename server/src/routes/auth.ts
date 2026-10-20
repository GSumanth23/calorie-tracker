import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { HttpError } from "../lib/http.js";
import { requireAuth, signToken, uid } from "../middleware/auth.js";

export const authRouter = Router();

const Register = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, "must be at least 8 characters").max(200),
});

const Login = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(1),
});

const publicUser = (u: typeof schema.users.$inferSelect) => ({ id: u.id, name: u.name, email: u.email });

authRouter.post("/register", async (req, res) => {
  const body = Register.parse(req.body);
  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) });
  if (existing) throw new HttpError(409, "An account with that email already exists");

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await db.transaction(async (tx) => {
    const [u] = await tx.insert(schema.users).values({ name: body.name, email: body.email, passwordHash }).returning();
    await tx.insert(schema.goals).values({ userId: u.id });
    return u;
  });

  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const body = Login.parse(req.body);
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, body.email) });
  const ok = user && (await bcrypt.compare(body.password, user.passwordHash));
  if (!ok) throw new HttpError(401, "Incorrect email or password");
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, uid(req)) });
  if (!user) throw new HttpError(401, "Account not found");
  res.json({ user: publicUser(user) });
});
