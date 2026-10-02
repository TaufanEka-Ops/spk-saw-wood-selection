import { config } from "../config/env.js";
import { createMemoryRepository } from "./memoryRepository.js";
import { createSequelizeRepository } from "./sequelizeRepository.js";

/**
 * Build the configured repository. `STORAGE=memory` needs nothing installed
 * beyond Node itself — that is deliberate, so a reviewer can clone and run.
 */
export async function createRepository(options = {}) {
  const storage = options.storage ?? config.storage;
  if (storage === "mysql") return createSequelizeRepository();
  if (storage === "memory") return createMemoryRepository(options.seed ?? []);
  throw new Error(`unknown STORAGE '${storage}'; expected 'memory' or 'mysql'`);
}
