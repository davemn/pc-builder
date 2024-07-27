import { app } from "electron";
import Knex from "knex";
import type { Knex as KnexNamespace } from "knex";
import fs from "node:fs";
import path from "node:path";
import { Database as SQLite3DatabaseType } from "sqlite3";

import { migrations as UserDataMigrations } from "./api/userData";

export enum DatabaseName {
  USER_DATA = "user_data",
}

const openDatabaseFiles: { [k in DatabaseName]: KnexNamespace | null } = {
  [DatabaseName.USER_DATA]: null,
};

function databaseFileDirectory() {
  return path.join(app.getPath("userData"), "Saved Data");
}

export function getDefaultKnexConfig(dbName: string) {
  return {
    client: "sqlite3",
    connection: {
      filename: path.join(databaseFileDirectory(), `${dbName}.db`),
    },
    /* SQLite connection pools are 1 connection per database file. */
    pool: {
      afterCreate: function (
        rawDb: SQLite3DatabaseType,
        done: (
          err: Error | null | undefined,
          rawDb: SQLite3DatabaseType
        ) => void
      ) {
        rawDb.run("PRAGMA journal_mode=WAL;", [], function (err) {
          if (err) {
            console.warn(err.message);
          }
          done(err, rawDb);
        });
      },
    },
    useNullAsDefault: true,
  };
}

export interface DatabaseMigration {
  name: string;
  up: (knex: KnexNamespace) => Promise<void>;
  down: (knex: KnexNamespace) => Promise<void>;
}

function createMigrationSource(migrations: Array<DatabaseMigration>) {
  return {
    getMigrations: () => Promise.resolve(migrations),
    getMigrationName: (migration: DatabaseMigration) => migration.name,
    getMigration: (migration: DatabaseMigration) => Promise.resolve(migration),
  };
}

export async function connectTo(dbName: DatabaseName) {
  let db = openDatabaseFiles[dbName];

  if (!db) {
    // Create the directory for the database file if it doesn't exist,
    // Knex will only create the file itself.
    if (!fs.existsSync(databaseFileDirectory())) {
      fs.mkdirSync(databaseFileDirectory(), { recursive: true });
    }

    db = Knex(getDefaultKnexConfig(dbName));

    let migrationSource;

    switch (dbName) {
      case DatabaseName.USER_DATA:
        migrationSource = createMigrationSource(UserDataMigrations);
        break;
      default:
        throw new Error(`No migration source for database: ${dbName}`);
    }

    await db.migrate.latest({ migrationSource });

    openDatabaseFiles[dbName] = db;
  }

  return db;
}

export async function disconnectFrom(dbName: DatabaseName) {
  if (openDatabaseFiles[dbName]) {
    try {
      await openDatabaseFiles[dbName]?.destroy();
    } catch (e) {
      console.error(e);
    }
    openDatabaseFiles[dbName] = null;
  }
}
