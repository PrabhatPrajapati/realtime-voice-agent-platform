import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './utils/prisma.js';
import { handleMediaStreamConnection } from './websocket/mediaStreamHandler.js';
import { campaignWorker } from './workers/campaignWorker.js';
import { weeklyCheckinService } from './services/weeklyCheckinService.js';

const server = http.createServer(app);

// WebSocket Server attached to the HTTP server for Twilio Media Streams
export const wss = new WebSocketServer({
  server,
  path: '/media-stream',
});

wss.on('connection', (ws, req) => {
  handleMediaStreamConnection(ws, req);
});

// Start listening
server.listen(env.PORT, env.HOST, () => {
  logger.info(
    `🚀 Server running on http://${env.HOST}:${env.PORT} in ${env.NODE_ENV} mode`
  );
  logger.info(`📞 Twilio Voice Webhook URL: ${env.PUBLIC_BASE_URL}/webhooks/twilio/voice`);
  logger.info(`🌊 Twilio Media Stream WebSocket: ${env.PUBLIC_BASE_URL.replace(/^http/, 'ws')}/media-stream`);

  // Initialize Automated Weekly Recurring Calling Scheduler
  weeklyCheckinService.initScheduler();
});

// Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  logger.info({ signal }, 'Received termination signal, shutting down gracefully...');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      weeklyCheckinService.stopScheduler();
      await campaignWorker.close();
      await prisma.$disconnect();
      logger.info('Prisma & Campaign Worker disconnected');
    } catch (e) {
      logger.error({ err: e.message }, 'Error disconnecting Prisma or Worker');
    }

    process.exit(0);
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
