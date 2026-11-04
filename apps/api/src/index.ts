import { createServer } from './server.js';

const port = Number(process.env.PORT ?? 3000);

async function start(): Promise<void> {
  const app = await createServer();
  try {
    await app.listen({ host: '127.0.0.1', port });
  } catch (error) {
    app.log.error(error);
    await app.close();
    process.exitCode = 1;
  }
}

void start();

