import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { Env } from "../env.js";

export type JwtPayload = {
  userId: string;
  organizationId: string;
};

export function signToken(
  env: Env,
  payload: JwtPayload,
  expiresIn = "14d",
): string {
  const opts = { expiresIn } as SignOptions;
  return jwt.sign(payload, env.JWT_SECRET, opts);
}

export function verifyToken(
  env: Env,
  token: string,
): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      "userId" in decoded &&
      "organizationId" in decoded &&
      typeof (decoded as JwtPayload).userId === "string" &&
      typeof (decoded as JwtPayload).organizationId === "string"
    ) {
      return decoded as JwtPayload;
    }
    return null;
  } catch {
    return null;
  }
}
