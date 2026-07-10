import { prisma } from "@/lib/db";

type DatabaseSizeResult = {
  bytes: bigint | number | string | null;
};

export type DatabaseUsage = {
  usedBytes: number;
  usedMb: number;
  limitMb: number;
  percentUsed: number;
  status: "ok" | "warning" | "danger";
};

function getDatabaseLimitMb() {
  const configuredLimit = Number(process.env.DATABASE_STORAGE_LIMIT_MB);
  return Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 500;
}

function toNumber(value: DatabaseSizeResult["bytes"]) {
  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value ?? 0;
}

export async function getDatabaseUsage(): Promise<DatabaseUsage> {
  const result = await prisma.$queryRaw<DatabaseSizeResult[]>`
    SELECT pg_database_size(current_database()) AS bytes
  `;

  const usedBytes = toNumber(result[0]?.bytes);
  const usedMb = usedBytes / 1024 / 1024;
  const limitMb = getDatabaseLimitMb();
  const percentUsed = Math.min(100, (usedMb / limitMb) * 100);
  const status = percentUsed >= 90 ? "danger" : percentUsed >= 75 ? "warning" : "ok";

  return {
    usedBytes,
    usedMb,
    limitMb,
    percentUsed,
    status
  };
}
