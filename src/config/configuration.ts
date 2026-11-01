export type AppConfig = {
  MONGODB_URI: string;
  PORT: number;
  JWT_SECRET: string;
  OTP_PEPPER: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  SMTP_SECURE: boolean;
};

export function validateConfig(env: NodeJS.ProcessEnv): AppConfig {
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`${key} is required`);
    return value;
  };
  const integer = (key: string, value: string, min: number, max: number) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new Error(`${key} must be an integer between ${min} and ${max}`);
    }
    return parsed;
  };

  const jwtSecret = required('JWT_SECRET');
  const otpPepper = required('OTP_PEPPER');
  if (Buffer.byteLength(jwtSecret) < 32) throw new Error('JWT_SECRET must contain at least 32 bytes');
  if (Buffer.byteLength(otpPepper) < 32) throw new Error('OTP_PEPPER must contain at least 32 bytes');
  const secure = (env.SMTP_SECURE ?? 'false').toLowerCase();
  if (secure !== 'true' && secure !== 'false') throw new Error('SMTP_SECURE must be true or false');

  return {
    MONGODB_URI: env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/khatma',
    PORT: integer('PORT', env.PORT ?? '3000', 1, 65535),
    JWT_SECRET: jwtSecret,
    OTP_PEPPER: otpPepper,
    SMTP_HOST: required('SMTP_HOST'),
    SMTP_PORT: integer('SMTP_PORT', env.SMTP_PORT ?? '587', 1, 65535),
    SMTP_USER: required('SMTP_USER'),
    SMTP_PASS: required('SMTP_PASS'),
    SMTP_FROM: required('SMTP_FROM'),
    SMTP_SECURE: secure === 'true',
  };
}
