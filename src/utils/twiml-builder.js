import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Builds TwiML for connecting call to WebSocket Media Stream
 * @param {Object} options
 * @param {string} options.streamUrl - WebSocket URL (wss://...)
 * @param {Object} [options.customParameters] - Custom metadata passed to media stream
 * @returns {string} XML string
 */
export const buildMediaStreamTwiML = ({ streamUrl, customParameters = {} }) => {
  const response = new VoiceResponse();
  const connect = response.connect();
  const stream = connect.stream({ url: streamUrl });

  // Add custom parameters to stream
  for (const [key, value] of Object.entries(customParameters)) {
    if (value !== undefined && value !== null) {
      stream.parameter({ name: key, value: String(value) });
    }
  }

  return response.toString();
};

/**
 * Builds TwiML for a basic test greeting or announcement
 * @param {string} message
 * @param {Object} [options]
 * @returns {string} XML string
 */
export const buildSayTwiML = (message, options = {}) => {
  const response = new VoiceResponse();
  response.say(
    {
      voice: options.voice || 'Polly.Joanna',
      language: options.language || 'en-US',
    },
    message
  );
  return response.toString();
};

/**
 * Builds TwiML for transferring call to a human CSR phone number
 * @param {string} csrPhoneNumber
 * @param {Object} [options]
 * @param {string} [options.callerId]
 * @param {string} [options.announcement]
 * @returns {string} XML string
 */
export const buildTransferTwiML = (csrPhoneNumber, options = {}) => {
  const response = new VoiceResponse();
  if (options.announcement) {
    response.say(
      {
        voice: options.voice || 'Polly.Joanna',
        language: options.language || 'en-US',
      },
      options.announcement
    );
  }

  const dial = response.dial({
    callerId: options.callerId,
    timeout: 30,
    action: options.actionUrl,
  });
  dial.number(csrPhoneNumber);

  return response.toString();
};

/**
 * Builds TwiML for hanging up
 * @param {string} [farewellMessage]
 * @returns {string} XML string
 */
export const buildHangupTwiML = (farewellMessage) => {
  const response = new VoiceResponse();
  if (farewellMessage) {
    response.say(
      {
        voice: 'Polly.Joanna',
        language: 'en-US',
      },
      farewellMessage
    );
  }
  response.hangup();
  return response.toString();
};

export const twimlBuilder = {
  buildMediaStreamTwiML,
  buildSayTwiML,
  buildTransferTwiML,
  buildHangupTwiML,
};

export default twimlBuilder;
