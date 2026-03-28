import { loadEnv } from "vite";

/** Merge `.env` / `.env.local` (and `.env.test*`) into `process.env` before smoke tests run. */
Object.assign(process.env, loadEnv("test", process.cwd(), ""));
