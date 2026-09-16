import { OpenAIRealtimeSession } from '../services/openai-realtime.service.js';
import { logger, createCallLogger } from '../config/logger.js';
import { callRepository } from '../repositories/call.repository.js';

/**
 * Handles Twilio Media Stream WebSocket connections
 * Manages bidirectional audio stream between Twilio and OpenAI Realtime API
 */
export function handleMediaStreamConnection(ws, req) {
  let streamSid = null;
  let callSid = null;
  let callId = null;
  let customerId = null;
  let openAISession = null;
  let callLog = logger;

  logger.info({ url: req.url }, 'New Twilio Media Stream WebSocket connected');

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.event) {
        case 'connected':
          logger.info({ protocol: msg.protocol, version: msg.version }, 'Twilio media stream connected');
          break;

        case 'start': {
          streamSid = msg.start.streamSid;
          callSid = msg.start.callSid;
          const customParams = msg.start.customParameters || {};
          callId = customParams.callId || null;
          customerId = customParams.customerId || null;

          callLog = createCallLogger({
            callId,
            customerId,
            callSid,
            streamSid,
          });

          callLog.info('Twilio media stream started');

          // Update call with streamSid
          if (callId) {
            try {
              await callRepository.update(callId, {
                twilioStreamSid: streamSid,
                status: 'IN_PROGRESS',
              });
            } catch (err) {
              callLog.error({ err: err.message }, 'Failed to update call with streamSid');
            }
          }

          // Initialize OpenAI Realtime Session
          openAISession = new OpenAIRealtimeSession({
            callId,
            customerId,
            twilioCallSid: callSid,
            streamSid,
            sendMediaToTwilio: (base64Audio) => {
              if (ws.readyState === ws.OPEN && streamSid) {
                const mediaMessage = {
                  event: 'media',
                  streamSid,
                  media: {
                    payload: base64Audio,
                  },
                };
                ws.send(JSON.stringify(mediaMessage));
              }
            },
            clearTwilioStream: () => {
              if (ws.readyState === ws.OPEN && streamSid) {
                const clearMessage = {
                  event: 'clear',
                  streamSid,
                };
                ws.send(JSON.stringify(clearMessage));
              }
            },
            onClose: () => {
              callLog.info('OpenAI Realtime session closed');
            },
          });

          await openAISession.init();
          break;
        }

        case 'media':
          // Forward audio chunk from customer's microphone to OpenAI Realtime
          if (openAISession && msg.media && msg.media.payload) {
            openAISession.sendAudioChunk(msg.media.payload);
          }
          break;

        case 'stop':
          callLog.info('Twilio media stream stopped');
          if (openAISession) {
            openAISession.cleanup();
            openAISession = null;
          }
          break;

        case 'mark':
          callLog.debug({ mark: msg.mark }, 'Twilio media stream mark event');
          break;

        default:
          callLog.debug({ event: msg.event }, 'Twilio unhandled stream event');
      }
    } catch (err) {
      callLog.error({ err: err.message }, 'Error handling Twilio media stream message');
    }
  });

  ws.on('close', () => {
    callLog.info('Twilio Media Stream WebSocket closed');
    if (openAISession) {
      openAISession.cleanup();
      openAISession = null;
    }
  });

  ws.on('error', (err) => {
    callLog.error({ err: err.message }, 'Twilio Media Stream WebSocket error');
    if (openAISession) {
      openAISession.cleanup();
      openAISession = null;
    }
  });
}

export default handleMediaStreamConnection;
