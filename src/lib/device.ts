import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "./db";

// Anonymous device identity. The cookie only carries a signed device id;
// everything else lives in the `devices` row.

const COOKIE = "fs_device";
const MAX_AGE = 60 * 60 * 24 * 730; // two years

export type Device = {
  id: string;
  role: "farmer" | "trader" | "both";
  lang: "en" | "bn";
  district: string;
  commodities: string[];
  pushes_per_day: number;
  has_push: boolean;
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
    return new TextEncoder().encode("dev-only-insecure-session-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

export async function setDeviceCookie(deviceId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(deviceId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearDeviceCookie() {
  (await cookies()).delete(COOKIE);
}

async function deviceIdFromCookie(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getDevice(): Promise<Device | null> {
  const id = await deviceIdFromCookie();
  if (!id) return null;
  const sql = await getDb();
  const rows = (await sql`
    UPDATE devices SET last_seen = now() WHERE id = ${id}
    RETURNING id, role, lang, district, commodities, pushes_per_day, (push_subscription IS NOT NULL) AS has_push
  `) as Device[];
  return rows[0] ?? null;
}

export async function requireDevice(): Promise<Device> {
  const device = await getDevice();
  if (!device) redirect("/welcome");
  return device;
}

/** Language for pages that may be shown before onboarding. */
export async function getLang(): Promise<"en" | "bn"> {
  const device = await getDevice().catch(() => null);
  if (device) return device.lang;
  const c = (await cookies()).get("fs_lang")?.value;
  return c === "en" ? "en" : "bn";
}
