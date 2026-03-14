import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'leados-default-secret-change-in-production';

export interface AuthPayload {
  userId: string;
  email: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/** Extract userId from request. Returns userId or null. */
export function getUserId(req: Request | null | undefined): string | null {
  if (!req?.headers) return null;
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  return payload?.userId || null;
}

/** Extract userId from request. Throws if not authenticated. */
export function requireUserId(req: Request): string {
  const userId = getUserId(req);
  if (!userId) throw new Error('Unauthorized');
  return userId;
}
