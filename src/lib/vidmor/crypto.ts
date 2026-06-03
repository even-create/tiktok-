import { createCipheriv, createDecipheriv } from "crypto";

const AES_KEY = process.env.VIDMOR_AES_KEY ?? "uegk_ztdx_cvwfxl";
const AES_IV = process.env.VIDMOR_AES_IV ?? "yzq_sjma70ccjmzx";

function getKeyBuffer() {
  return Buffer.from(AES_KEY, "utf8");
}

function getIvBuffer() {
  return Buffer.from(AES_IV, "utf8");
}

export function encryptPayload(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const cipher = createCipheriv("aes-128-cbc", getKeyBuffer(), getIvBuffer());
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

export function decryptPayload<T = unknown>(payload: string): T {
  const buffer = Buffer.from(payload, "base64");
  const decipher = createDecipheriv("aes-128-cbc", getKeyBuffer(), getIvBuffer());
  let decrypted = decipher.update(buffer, undefined, "utf8");
  decrypted += decipher.final("utf8");
  if (!decrypted.trim()) {
    throw new Error("empty decrypted payload");
  }
  return JSON.parse(decrypted) as T;
}

export function tryDecryptPayload<T = unknown>(payload: string): T | null {
  try {
    return decryptPayload<T>(payload);
  } catch {
    return null;
  }
}

export function encryptUrlPath(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return encryptPayload(normalized).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decryptUrlPath(encryptedPath: string): string {
  const base64 = encryptedPath.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const buffer = Buffer.from(padded, "base64");
  const decipher = createDecipheriv("aes-128-cbc", getKeyBuffer(), getIvBuffer());
  let decrypted = decipher.update(buffer, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return `/${decrypted}`;
}
