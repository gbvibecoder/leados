import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');

// On Vercel, the filesystem is read-only except /tmp.
// Use /tmp for the SQLite DB in production/serverless environments.
function getDbPath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/leados.db';
  }
  return path.join(process.cwd(), 'dev.db');
}

// Initialize SQLite tables if they don't exist (for fresh /tmp DBs on Vercel)
function ensureSchema(dbPath: string) {
  const db = new Database(dbPath);

  // Migrate: add projectId to Lead table if it exists but lacks the column
  try {
    const cols = db.prepare("PRAGMA table_info('Lead')").all();
    if (cols.length > 0 && !cols.some((c: any) => c.name === 'projectId')) {
      db.exec('ALTER TABLE "Lead" ADD COLUMN "projectId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL');
      db.exec('CREATE INDEX IF NOT EXISTS "Lead_projectId_idx" ON "Lead"("projectId")');
    }
  } catch { /* table may not exist yet, will be created below */ }

  db.exec(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "passwordHash" TEXT,
      "settings" TEXT,
      "apiKeys" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

    CREATE TABLE IF NOT EXISTS "Project" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "type" TEXT NOT NULL DEFAULT 'external',
      "status" TEXT NOT NULL DEFAULT 'active',
      "config" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Pipeline" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "projectId" TEXT,
      "type" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'idle',
      "config" TEXT,
      "currentAgentIndex" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Pipeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Pipeline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "AgentRun" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pipelineId" TEXT NOT NULL,
      "agentId" TEXT NOT NULL,
      "agentName" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'idle',
      "inputsJson" TEXT,
      "outputsJson" TEXT,
      "error" TEXT,
      "startedAt" DATETIME,
      "completedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AgentRun_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "AgentRun_pipelineId_idx" ON "AgentRun"("pipelineId");
    CREATE INDEX IF NOT EXISTS "AgentRun_agentId_idx" ON "AgentRun"("agentId");

    CREATE TABLE IF NOT EXISTS "Lead" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pipelineId" TEXT,
      "projectId" TEXT,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "company" TEXT,
      "phone" TEXT,
      "source" TEXT NOT NULL,
      "channel" TEXT,
      "score" INTEGER NOT NULL DEFAULT 0,
      "stage" TEXT NOT NULL DEFAULT 'new',
      "segment" TEXT,
      "utmSource" TEXT,
      "utmMedium" TEXT,
      "utmCampaign" TEXT,
      "qualificationScore" INTEGER,
      "qualificationOutcome" TEXT,
      "routingDecision" TEXT,
      "notes" TEXT,
      "enrichmentData" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "Lead_projectId_idx" ON "Lead"("projectId");

    CREATE TABLE IF NOT EXISTS "Interaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "leadId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "metadata" TEXT,
      "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Interaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "Interaction_leadId_idx" ON "Interaction"("leadId");

    CREATE TABLE IF NOT EXISTS "Campaign" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pipelineId" TEXT,
      "channel" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "budget" REAL,
      "spend" REAL NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "metrics" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "CreativeAsset" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pipelineId" TEXT,
      "type" TEXT NOT NULL,
      "channel" TEXT,
      "content" TEXT NOT NULL,
      "performanceTag" TEXT,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Setting" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "integrations" TEXT,
      "notifications" TEXT,
      "agentDefaults" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Setting_userId_key" ON "Setting"("userId");
  `);

  db.close();
}

function createPrismaClient() {
  const dbPath = getDbPath();

  // Ensure schema exists (especially needed on Vercel where /tmp starts empty)
  try {
    ensureSchema(dbPath);
  } catch (e) {
    console.error('Failed to initialize DB schema:', e);
  }

  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
