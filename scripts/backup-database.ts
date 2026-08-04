import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const retentionDays = Number(process.env.BACKUP_RETENTION_DAYS ?? "60");
const backupDir = resolve(process.env.BACKUP_DIR ?? "backups");
const databaseUrl = process.env.DATABASE_URL;
const pgDumpCommand = process.env.PG_DUMP_PATH ?? "pg_dump";

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join("-") + "-" + [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("-");
}

function cleanupOldBackups() {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0 || !existsSync(backupDir)) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  for (const entry of readdirSync(backupDir)) {
    if (!entry.startsWith("sbdp-backup-") || !entry.endsWith(".backup")) continue;
    const filePath = resolve(backupDir, entry);
    const stats = statSync(filePath);
    if (stats.isFile() && stats.mtimeMs < cutoff) {
      unlinkSync(filePath);
      console.log(`Removed old backup: ${entry}`);
    }
  }
}

async function main() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Set it in .env or the scheduled task environment.");
  }

  mkdirSync(backupDir, { recursive: true });
  cleanupOldBackups();

  const outputPath = resolve(backupDir, `sbdp-backup-${timestamp()}.backup`);
  const args = ["--format=custom", "--no-owner", "--no-privileges", "--file", outputPath, databaseUrl];

  console.log(`Creating database backup: ${outputPath}`);

  await new Promise<void>((resolveBackup, rejectBackup) => {
    const child = spawn(pgDumpCommand, args, { stdio: "inherit" });
    child.on("error", rejectBackup);
    child.on("exit", (code) => {
      if (code === 0) resolveBackup();
      else rejectBackup(new Error(`pg_dump failed with exit code ${code ?? "unknown"}`));
    });
  });

  console.log("Backup completed successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
