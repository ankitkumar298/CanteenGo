import crypto from "crypto";
import jwt from "jsonwebtoken";

const AUTH_SALT = process.env.AUTH_SECRET || "canteenGo_college_salt_key_2026";
const JWT_SECRET = process.env.JWT_SECRET || "canteenGo_jwt_secret_key_2026_super_secure";
const JWT_EXPIRES_IN = "7d";

/**
 * Creates a deterministic HMAC-SHA256 hash of a plain password
 */
export function hashPassword(password) {
  if (!password) return "";
  return crypto.createHmac("sha256", AUTH_SALT).update(String(password).trim()).digest("hex");
}

/**
 * Verifies if candidate plain password matches stored hash
 */
export function verifyPassword(candidatePassword, storedHash) {
  if (!candidatePassword || !storedHash) return false;
  return hashPassword(candidatePassword) === storedHash;
}

/**
 * Generates a signed JSON Web Token (JWT)
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies and decodes a JSON Web Token (JWT)
 */
export function verifyToken(token) {
  try {
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}


