import WebSocket from 'ws';
import { env } from '../config/env.js';
import { logger, createCallLogger } from '../config/logger.js';
import { realtimeTools } from '../ai/tools.js';
import { buildSystemPrompt } from '../prompts/agentPrompts.js';
import { callRepository } from '../repositories/callRepository.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { issueService } from './issueService.js';
import { twilioService } from './twilioService.js';

export class OpenAIRealtimeSession {
  /**
   * @param {Object} options
   * @param {string} options.callId
   * @param {string} [options.customerId]
   * @param {string} [options.twilioCallSid]
   * @param {string} options.streamSid
   * @param {Function} options.sendMediaToTwilio - Callback to send audio payload to Twilio WebSocket
   * @param {Function} options.clearTwilioStream - Callback to clear buffered Twilio audio on barge-in
   * @param {Function} options.onClose - Callback when session closes
   */
  constructor(options) {
    this.callId = options.callId;
    this.customerId = options.customerId;
    this.twilioCallSid = options.twilioCallSid;
    this.streamSid = options.streamSid;
    this.sendMediaToTwilio = options.sendMediaToTwilio;
    this.clearTwilioStream = options.clearTwilioStream;
    this.onClose = options.onClose;

    this.ws = null;
    this.isConnected = false;
    this.customer = null;
    this.callLog = createCallLogger({
      callId: this.callId,
      customerId: this.customerId,
      streamSid: this.streamSid,
    });

    this.isMockMode =
      !env.OPENAI_API_KEY ||
      env.OPENAI_API_KEY.startsWith('sk-mock') ||
      env.NODE_ENV === 'test';

    this.silenceTimer = null;
    this.silenceCount = 0;
  }

  /**
   * Reset silence watchdog timer
   */
  resetSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (!this.isConnected || this.isMockMode) return;

    // After 12s of silence, check in on customer
    this.silenceTimer = setTimeout(async () => {
      this.silenceCount++;
      if (this.silenceCount === 1) {
        this.callLog.info('Silence detected (1st check), prompting customer');
        this.send({
          type: 'response.create',
          response: {
            instructions: `Speak in English. Customer has been quiet. Ask politely: "Hey ${this.customer?.name || 'there'}, are you still with me?"`,
          },
        });
        this.resetSilenceTimer();
      } else if (this.silenceCount >= 2) {
        this.callLog.info('Persistent silence detected, ending call politely');
        this.send({
          type: 'response.create',
          response: {
            instructions: 'Speak in English. Customer remained silent. Say: "It seems we might have disconnected. Thank you and have a wonderful day." and call tool end_call.',
          },
        });
      }
    }, 12000);
  }

  /**
   * Initialize session and connect to OpenAI Realtime WebSocket
   */
  async init() {
    // Fetch customer details for context
    if (this.customerId) {
      try {
        this.customer = await customerRepository.findById(this.customerId);
      } catch (err) {
        this.callLog.warn({ err: err.message }, 'Could not fetch customer details');
      }
    }

    if (this.isMockMode) {
      this.callLog.info('[MOCK] OpenAI Realtime session initialized in mock mode');
      this.isConnected = true;
      await this.logMessage('SYSTEM', 'OpenAI Realtime session initialized in sandbox mode');
      return;
    }

    const url = `wss://api.openai.com/v1/realtime?model=${env.OPENAI_MODEL}`;
    this.callLog.info({ url, model: env.OPENAI_MODEL }, 'Connecting to OpenAI Realtime WebSocket');

    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
    });

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('error', (error) => this.handleError(error));
    this.ws.on('close', (code, reason) => this.handleClose(code, reason));
  }

  /**
   * Handle WebSocket open event
   */
  async handleOpen() {
    this.isConnected = true;
    this.hasGreeted = false;
    this.callLog.info('Connected to OpenAI Realtime API');

    // Build personalized system instructions
    const instructions = buildSystemPrompt({
      companyName: env.COMPANY_NAME,
      customerName: this.customer?.name || 'Valued Customer',
      customerPhone: this.customer?.phone || '',
      assignedCsrId: this.customer?.assignedCsrId || 'CSR-001',
    });

    // Configure session with audio/pcmu (G.711 u-law) format directly for Twilio Media Stream
    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions,
        audio: {
          input: {
            format: { type: 'audio/pcmu' },
            transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
              interrupt_response: true,
            },
          },
          output: {
            format: { type: 'audio/pcmu' },
            voice: env.OPENAI_VOICE || 'alloy',
          },
        },
        tools: realtimeTools,
        tool_choice: 'auto',
      },
    };

    this.send(sessionUpdate);

    // Update call status to AI_CONNECTED
    if (this.callId) {
      await callRepository.update(this.callId, {
        status: 'AI_CONNECTED',
      });
      await this.logMessage('SYSTEM', 'AI connected to voice stream');
    }
  }

  /**
   * Forward incoming audio chunk from Twilio to OpenAI
   * @param {string} base64Payload - g711 mu-law audio chunk from Twilio
   */
  sendAudioChunk(base64Payload) {
    if (!this.isConnected) return;

    if (this.isMockMode) {
      return;
    }

    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Payload,
    });
  }

  /**
   * Handle incoming messages from OpenAI Realtime API
   */
  async handleMessage(raw) {
    try {
      const event = JSON.parse(raw.toString());

      switch (event.type) {
        case 'session.created':
          this.callLog.info({ sessionId: event.session?.id }, 'OpenAI Realtime session created');
          break;

        case 'session.updated':
          this.callLog.info('OpenAI Realtime session updated & confirmed');
          // Trigger initial greeting once session configuration is confirmed
          if (!this.hasGreeted) {
            this.hasGreeted = true;
            this.send({
              type: 'response.create',
              response: {
                instructions: `Speak in clear English. Say: "Hello ${this.customer?.name || 'Prabhat'}! This is Sarah calling from ${env.COMPANY_NAME}. I'm just calling to check if everything is running smoothly with your service today?"`,
              },
            });
            this.resetSilenceTimer();
          }
          break;

        case 'response.output_audio.delta':
        case 'response.audio.delta':
          // Stream AI voice audio back to customer via Twilio
          if (event.delta && this.sendMediaToTwilio) {
            this.sendMediaToTwilio(event.delta);
          }
          break;

        case 'input_audio_buffer.speech_started':
          // Barge-in (Interruption Handling): Customer started speaking, stop AI playback
          this.silenceCount = 0;
          this.resetSilenceTimer();
          this.callLog.info('Interruption detected: customer started speaking. Clearing Twilio audio buffer.');
          if (this.clearTwilioStream) {
            this.clearTwilioStream();
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // Customer speech transcription completed
          if (event.transcript) {
            this.callLog.info({ transcript: event.transcript }, 'Customer spoke');
            await this.logMessage('CUSTOMER', event.transcript);
          }
          break;

        case 'response.output_audio_transcript.done':
        case 'response.audio_transcript.done':
          // AI speech completed
          if (event.transcript) {
            this.callLog.info({ transcript: event.transcript }, 'AI spoke');
            await this.logMessage('AI', event.transcript);
          }
          break;

        case 'response.function_call_arguments.done':
          // Tool invocation by AI
          await this.handleToolCall(event);
          break;

        case 'error':
          this.callLog.error({ error: event.error }, 'OpenAI Realtime error');
          break;

        default:
          this.callLog.debug({ type: event.type }, 'OpenAI unhandled event');
      }
    } catch (err) {
      this.callLog.error({ err: err.message }, 'Failed to parse OpenAI Realtime message');
    }
  }

  /**
   * Handle Tool / Function calls executed by AI
   */
  async handleToolCall(event) {
    const { call_id: toolCallId, name, arguments: argsString } = event;
    this.callLog.info({ name, argsString, toolCallId }, 'Executing AI tool call');

    let args = {};
    try {
      args = JSON.parse(argsString);
    } catch (e) {
      this.callLog.error({ err: e.message, argsString }, 'Failed to parse tool call arguments');
    }

    let result = { success: true };

    try {
      switch (name) {
        case 'create_issue': {
          const issue = await issueService.createIssue({
            callId: this.callId,
            customerId: this.customerId || this.customer?.id,
            assignedCsrId: this.customer?.assignedCsrId || 'CSR-001',
            summary: args.summary || 'Customer reported an issue',
            category: args.category || 'OTHER',
            priority: args.priority || 'MEDIUM',
          });
          result = { success: true, issueId: issue.id, message: 'Issue saved to database' };
          await this.logMessage(
            'SYSTEM',
            `Issue logged: [${args.category} - ${args.priority}] ${args.summary}`
          );
          break;
        }

        case 'transfer_to_csr': {
          this.callLog.info({ reason: args.reason }, 'Transferring call to CSR');
          await this.logMessage('SYSTEM', `Transferring call to CSR. Reason: ${args.reason}`);

          // Update call status
          if (this.callId) {
            await callRepository.update(this.callId, {
              status: 'TRANSFERRED',
              outcome: args.reason?.includes('human') ? 'HUMAN_REQUESTED' : 'ISSUE_FOUND',
            });
          }

          // Transfer active Twilio call
          if (this.twilioCallSid) {
            const transferUrl = `${env.PUBLIC_BASE_URL}/webhooks/twilio/transfer`;
            await twilioService.transferCall(this.twilioCallSid, transferUrl);
          }

          result = { success: true, message: 'Transfer initiated' };
          break;
        }

        case 'request_callback': {
          if (this.callId) {
            await callRepository.update(this.callId, {
              outcome: 'CALLBACK',
            });
          }
          await this.logMessage('SYSTEM', `Callback requested for: ${args.preferredTime || 'ASAP'}`);
          result = { success: true, message: 'Callback scheduled' };
          break;
        }

        case 'mark_do_not_call': {
          if (this.customerId || this.customer?.id) {
            await customerRepository.update(this.customerId || this.customer?.id, {
              status: 'DO_NOT_CALL',
            });
          }
          if (this.callId) {
            await callRepository.update(this.callId, {
              outcome: 'DO_NOT_CALL',
            });
          }
          await this.logMessage('SYSTEM', 'Customer marked as DO_NOT_CALL (Opt-Out)');
          result = { success: true, message: 'Customer marked as Do Not Call' };
          break;
        }

        case 'end_call': {
          if (this.callId) {
            await callRepository.update(this.callId, {
              outcome: args.outcome || 'NO_ISSUE',
              status: 'COMPLETED',
              endedAt: new Date(),
            });
          }
          await this.logMessage(
            'SYSTEM',
            `Call ended. Outcome: ${args.outcome || 'NO_ISSUE'}. Summary: ${args.summary || 'None'}`
          );

          if (this.twilioCallSid) {
            setTimeout(async () => {
              await twilioService.hangupCall(this.twilioCallSid);
            }, 1500);
          }
          result = { success: true, message: 'Call concluded' };
          break;
        }

        default:
          this.callLog.warn({ name }, 'Unknown tool called');
          result = { error: `Unknown tool ${name}` };
      }
    } catch (err) {
      this.callLog.error({ err: err.message, name }, 'Error executing tool handler');
      result = { error: err.message };
    }

    // Send tool output back to OpenAI
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: toolCallId,
        output: JSON.stringify(result),
      },
    });

    this.send({
      type: 'response.create',
    });
  }

  /**
   * Log transcript message to database
   */
  async logMessage(speaker, text) {
    if (!this.callId || !text) return;
    try {
      await callRepository.addMessage({
        callId: this.callId,
        speaker,
        text,
      });
    } catch (err) {
      this.callLog.error({ err: err.message }, 'Failed to save transcript message');
    }
  }

  /**
   * Send JSON payload over OpenAI WebSocket
   */
  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  handleError(error) {
    this.callLog.error({ error: error.message }, 'OpenAI WebSocket error');
  }

  handleClose(code, reason) {
    this.isConnected = false;
    this.callLog.info({ code, reason: reason?.toString() }, 'OpenAI WebSocket connection closed');
    if (this.onClose) this.onClose();
  }

  /**
   * Cleanup and close OpenAI Realtime session
   */
  cleanup() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
  }
}
