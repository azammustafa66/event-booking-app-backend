import app from './src/app';
import connectToDB from './src/db';
import { emailWorker } from './src/jobs/emailQueue';
import logger from './src/utils/logger';

const PORT = Number(process.env.PORT || 3000);

connectToDB()
  .then(() => app.listen(PORT, () => logger.info(`Listening on ${PORT}`)))
  .catch((err) => logger.error(err));

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received — shutting down`);
  await emailWorker.close();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
