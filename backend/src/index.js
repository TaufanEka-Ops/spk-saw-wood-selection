import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { createRepository } from "./repositories/index.js";

async function bootstrap() {
  let repository;
  try {
    repository = await createRepository();
  } catch (error) {
    console.error("Failed to connect to the configured storage:", error.message);
    console.error(`STORAGE=${config.storage} — run with STORAGE=memory to start without a database.`);
    process.exitCode = 1;
    return;
  }

  const app = createApp(repository);
  const server = app.listen(config.port, () => {
    console.log(`spk-saw api listening on http://localhost:${config.port} (storage=${repository.kind})`);
  });

  server.on("error", (error) => {
    // The original called app.listen and never handled 'error', so a busy
    // port produced an unhandled exception trace and a non-zero exit.
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${config.port} is already in use. Set PORT to another value.`);
    } else {
      console.error("Server error:", error.message);
    }
    process.exitCode = 1;
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down.`);
      server.close(async () => {
        await repository.close?.();
        process.exit(0);
      });
    });
  }
}

bootstrap();
