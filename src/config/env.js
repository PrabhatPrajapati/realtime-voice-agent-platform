import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database & Cache
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Twilio Settings
  TWILIO_ACCOUNT_SID: z.string().default('ACmock_account_sid_for_development'),
  TWILIO_AUTH_TOKEN: z.string().default('mock_auth_token_for_development'),
  TWILIO_PHONE_NUMBER: z.string().default('+15551234567'),
  TWILIO_VALIDATE_WEBHOOK: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Networking / Public Base URL
  PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),

  // OpenAI Settings
  OPENAI_API_KEY: z.string().default('sk-mock-openai-api-key-for-development'),
  OPENAI_MODEL: z.string().default('gpt-realtime'),
  OPENAI_VOICE: z.string().default('alloy'),

  // Queue & Rate Limiting
  MAX_CONCURRENT_CALLS: z.coerce.number().default(5),
  CALLS_PER_MINUTE: z.coerce.number().default(20),

  // Call Business Rules
  CSR_PHONE_NUMBER: z.string().default('+15559876543'),
  COMPANY_NAME: z.string().default('ACME Support'),
  ENABLE_CALL_RECORDING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  ENABLE_AMD: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),

  // Automated Weekly Check-In Scheduler
  ENABLE_WEEKLY_CHECKIN: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  WEEKLY_CHECKIN_DAY: z.string().default('MONDAY'),
  WEEKLY_CHECKIN_TIME: z.string().default('10:00'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:\n', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export default env;
