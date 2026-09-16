import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number(),
  HOST: z.string(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  // Database & Cache
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Twilio Settings
  TWILIO_ACCOUNT_SID: z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_PHONE_NUMBER: z.string().min(1, 'TWILIO_PHONE_NUMBER is required'),
  TWILIO_VALIDATE_WEBHOOK: z
    .string()
    .transform((val) => val === 'true'),

  // Networking / Public Base URL
  PUBLIC_BASE_URL: z.string().min(1, 'PUBLIC_BASE_URL is required'),

  // OpenAI Settings
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().min(1, 'OPENAI_MODEL is required'),
  OPENAI_VOICE: z.string().min(1, 'OPENAI_VOICE is required'),

  // Queue & Rate Limiting
  MAX_CONCURRENT_CALLS: z.coerce.number().positive(),
  CALLS_PER_MINUTE: z.coerce.number().positive(),

  // Call Business Rules
  CSR_PHONE_NUMBER: z.string().min(1, 'CSR_PHONE_NUMBER is required'),
  COMPANY_NAME: z.string().min(1, 'COMPANY_NAME is required'),
  ENABLE_CALL_RECORDING: z
    .string()
    .transform((val) => val === 'true'),
  ENABLE_AMD: z
    .string()
    .transform((val) => val === 'true'),

  // Automated Weekly Check-In Scheduler
  ENABLE_WEEKLY_CHECKIN: z
    .string()
    .transform((val) => val === 'true'),
  WEEKLY_CHECKIN_DAY: z.string().min(1, 'WEEKLY_CHECKIN_DAY is required'),
  WEEKLY_CHECKIN_TIME: z.string().min(1, 'WEEKLY_CHECKIN_TIME is required'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:\n', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export default env;
