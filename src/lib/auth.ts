import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const cookieName = "store_session";

function secret() {
  return process.env.AUTH_SECRET ?? "development-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export async function login(username: string, password: string) {
  const owner = await prisma.owner.findUnique({ where: { username } });
  if (!owner) return false;

  const valid = await bcrypt.compare(password, owner.passwordHash);
  if (!valid) return false;

  const payload = `${owner.id}.${Date.now()}`;
  const session = `${payload}.${sign(payload)}`;
  (await cookies()).set(cookieName, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
  return true;
}

export async function logout() {
  (await cookies()).delete(cookieName);
}

export async function getSessionOwner() {
  const ownerId = await getSessionOwnerId();
  if (!ownerId) return null;

  return prisma.owner.findUnique({ where: { id: ownerId }, select: { id: true, username: true } });
}

export async function getSessionOwnerId() {
  const value = (await cookies()).get(cookieName)?.value;
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  const actual = parts[2];

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  return parts[0];
}
