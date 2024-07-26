import type { ConfigEnv, UserConfig } from "vite";
import { defineConfig, mergeConfig } from "vite";
import {
  getBuildConfig,
  getBuildDefine,
  external,
  pluginHotRestart,
} from "./vite.base.config";

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<"build">;

  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);
  const config: UserConfig = {
    build: {
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => "[name].js",
        formats: ["cjs"],
      },
      rollupOptions: {
        external,
        // external: [
        //   ...external,
        //   "tedious",
        //   "mysql",
        //   "mysql2",
        //   "pg",
        //   "pg-native",
        //   "pg-query-stream",
        //   "oracle",
        //   // "sqlite3",
        //   "better-sqlite3",
        //   "oracledb",
        // ],
      },
    },
    plugins: [pluginHotRestart("restart")],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ["module", "jsnext:main", "jsnext"],
      alias: {
        // bare module imports
        src: "/src",
        // path.resolve(__dirname, ...)?
        tedious: "knex-driver-placeholder.js",
        mysql: "knex-driver-placeholder.js",
        mysql2: "knex-driver-placeholder.js",
        pg: "knex-driver-placeholder.js",
        "pg-native": "knex-driver-placeholder.js",
        "pg-query-stream": "knex-driver-placeholder.js",
        oracle: "knex-driver-placeholder.js",
        // "sqlite3" is omitted, it's the one I want to actually use
        "better-sqlite3": "knex-driver-placeholder.js",
        oracledb: "knex-driver-placeholder.js",
      },
    },
    // optimizeDeps: {
    //   exclude: [
    //     "tedious",
    //     "mysql",
    //     "mysql2",
    //     "pg",
    //     "pg-native",
    //     "pg-query-stream",
    //     "oracle",
    //     // "sqlite3",
    //     "better-sqlite3",
    //     "oracledb",
    //   ],
    // },
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});
