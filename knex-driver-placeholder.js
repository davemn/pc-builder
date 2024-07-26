/*
This module deliberately empty, workaround for Vite's pre-bundling trying to
bundle _all_ Knex database driver peer dependencies even though only 1 (sqlite3) is
used at runtime.

Fix based on https://github.com/vitejs/vite/issues/6007#issuecomment-1157681366
*/
