import jwt from "jsonwebtoken";
import { config } from "../../config/config";

interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export const verifyToken = (authHeader?: string | null): string | null => {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2) return null;

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;

  try {
    const decoded = jwt.verify(
      token,
      config.auth.jwtSecret,
    ) as TokenPayload;

    return decoded.userId;
  } catch (err) {
    return null;
  }
};
