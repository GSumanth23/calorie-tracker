import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "30d" });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Session expired, please sign in again" });
  }
};

/** Use inside routes protected by requireAuth. */
export const uid = (req: Express.Request) => req.userId!;
