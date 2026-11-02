import crypto from "crypto";

const AUTH_SALT = process.env.AUTH_SECRET || "canteenGo_college_salt_key_2026";

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

