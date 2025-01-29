# PC Builder

This repo is the source for an (unreleased) Electron app for comparing & selecting parts for building a home desktop PC.

Under the hood it keeps track of PC parts in a local SQLite database. You can review the schema (and how it's changed over time) in the `migrations` section of `src/api/userData.ts`.

This app comes with no data! My plan was to distribute "official" lists of part inventories as Electron app updates once every so often. You can still add custom parts from the UI.

## Tech Used

- Electron - Scaffolded with [Electron Forge](https://www.electronforge.io/).
- [SQLite](https://www.npmjs.com/package/sqlite3) + [Knex](https://knexjs.org/)
- [React-query](https://tanstack.com/query/v4/docs/framework/react/overview)

## License

This work is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html). Please refer to `LICENSE` in the root of this repository for the full license text.
