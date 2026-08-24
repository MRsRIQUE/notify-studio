import * as SQLite from "expo-sqlite";
import type { Project, SaleEvent, DisclosureConfig, BackgroundConfig } from "../domain/types";

const DB_NAME = "notify-studio.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await runMigrations(db);
}

type Migration = {
  version: number;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          format TEXT NOT NULL DEFAULT 'vertical-9x16',
          platform_style TEXT NOT NULL DEFAULT 'ios-inspired',
          theme TEXT NOT NULL DEFAULT 'light',
          background_kind TEXT NOT NULL DEFAULT 'solid',
          background_color TEXT NOT NULL DEFAULT '#F2F2F7',
          background_color_end TEXT,
          disclosure_text TEXT NOT NULL DEFAULT 'Demonstração — dados simulados',
          disclosure_position TEXT NOT NULL DEFAULT 'bottom',
          disclosure_style TEXT NOT NULL DEFAULT 'bar',
          timeline_mode TEXT NOT NULL DEFAULT 'single',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          schema_version INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS project_events (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          time_ms INTEGER NOT NULL,
          title TEXT NOT NULL,
          store_name TEXT NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          amount_cents INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'BRL',
          buyer_alias TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 2,
    up: async (db) => {
      await db.runAsync(
        "UPDATE projects SET disclosure_text = 'Demonstração — dados simulados' WHERE disclosure_text = 'Demonstracao — dados simulados'",
      );
    },
  },
];

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const applied = await db.getAllAsync<{ version: number }>(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  const appliedSet = new Set(applied.map((r) => r.version));

  for (const migration of MIGRATIONS) {
    if (!appliedSet.has(migration.version)) {
      await migration.up(db);
      await db.runAsync(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        [migration.version, new Date().toISOString()],
      );
    }
  }
}

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    format: row.format as Project["format"],
    platformStyle: row.platform_style as Project["platformStyle"],
    theme: row.theme as Project["theme"],
    background: {
      kind: row.background_kind as BackgroundConfig["kind"],
      color: row.background_color as string,
      colorEnd: (row.background_color_end as string) || undefined,
    },
    disclosure: {
      text: row.disclosure_text as DisclosureConfig["text"],
      position: row.disclosure_position as DisclosureConfig["position"],
      style: row.disclosure_style as DisclosureConfig["style"],
    },
    timelineMode: row.timeline_mode as Project["timelineMode"],
    events: [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    schemaVersion: row.schema_version as number,
  };
}

function rowToEvent(row: Record<string, unknown>): SaleEvent {
  return {
    id: row.id as string,
    timeMs: row.time_ms as number,
    title: row.title as string,
    storeName: row.store_name as string,
    productName: row.product_name as string,
    quantity: row.quantity as number,
    amountCents: row.amount_cents as number,
    currency: row.currency as SaleEvent["currency"],
    buyerAlias: (row.buyer_alias as string) || undefined,
  };
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM projects ORDER BY updated_at DESC",
  );
  const projects: Project[] = [];
  for (const row of rows) {
    const project = rowToProject(row);
    const events = await db.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM project_events WHERE project_id = ? ORDER BY sort_order",
      [project.id],
    );
    projects.push({ ...project, events: events.map(rowToEvent) });
  }
  return projects;
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM projects WHERE id = ?",
    [id],
  );
  if (!row) return null;
  const project = rowToProject(row);
  const events = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM project_events WHERE project_id = ? ORDER BY sort_order",
    [project.id],
  );
  return { ...project, events: events.map(rowToEvent) };
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO projects
      (id, name, format, platform_style, theme, background_kind, background_color, background_color_end,
       disclosure_text, disclosure_position, disclosure_style, timeline_mode, created_at, updated_at, schema_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      project.id,
      project.name,
      project.format,
      project.platformStyle,
      project.theme,
      project.background.kind,
      project.background.color,
      project.background.colorEnd ?? null,
      project.disclosure.text,
      project.disclosure.position,
      project.disclosure.style,
      project.timelineMode,
      project.createdAt,
      project.updatedAt,
      project.schemaVersion,
    ],
  );

  await db.runAsync("DELETE FROM project_events WHERE project_id = ?", [
    project.id,
  ]);

  for (let i = 0; i < project.events.length; i++) {
    const e = project.events[i]!;
    await db.runAsync(
      `INSERT INTO project_events
        (id, project_id, time_ms, title, store_name, product_name, quantity, amount_cents, currency, buyer_alias, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        project.id,
        e.timeMs,
        e.title,
        e.storeName,
        e.productName,
        e.quantity,
        e.amountCents,
        e.currency,
        e.buyerAlias ?? null,
        i,
      ],
    );
  }
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM project_events WHERE project_id = ?", [id]);
  await db.runAsync("DELETE FROM projects WHERE id = ?", [id]);
}

export async function duplicateProject(
  id: string,
  newName: string,
): Promise<Project | null> {
  const original = await getProject(id);
  if (!original) return null;
  const now = new Date().toISOString();
  const newId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const copy: Project = {
    ...original,
    id: newId,
    name: newName,
    createdAt: now,
    updatedAt: now,
    events: original.events.map((e, i) => ({
      ...e,
      id: `evt-${newId}-${i}`,
    })),
  };
  await saveProject(copy);
  return copy;
}
