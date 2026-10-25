import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);
  private readonly from = requiredEnv('SMTP_FROM');
  private readonly port = Number(process.env.SMTP_PORT ?? 587);
  private readonly transporter = nodemailer.createTransport({
    host: requiredEnv('SMTP_HOST'),
    port: this.port,
    secure: readSecureTransport(),
    auth: {
      user: requiredEnv('SMTP_USER'),
      pass: requiredEnv('SMTP_PASS'),
    },
  });

  async sendSignInCode(email: string, token: string) {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Your Khatma sign-in code',
        text: `Your Khatma sign-in code is ${token}. It expires in 10 minutes.`,
      });
    } catch (error) {
      const smtpError = error as { code?: unknown; command?: unknown; responseCode?: unknown };
      this.logger.error(
        `SMTP delivery failed (code=${smtpError.code ?? 'unknown'}, command=${smtpError.command ?? 'unknown'}, responseCode=${smtpError.responseCode ?? 'unknown'})`,
      );
      throw new ServiceUnavailableException('Unable to send sign-in code');
    }
  }
}

if (!Number.isInteger(Number(process.env.SMTP_PORT ?? 587)) || Number(process.env.SMTP_PORT ?? 587) < 1 || Number(process.env.SMTP_PORT ?? 587) > 65535) {
  throw new Error('SMTP_PORT must be a valid TCP port');
}

function readSecureTransport() {
  const value = (process.env.SMTP_SECURE ?? 'false').toLowerCase();
  if (value !== 'true' && value !== 'false') throw new Error('SMTP_SECURE must be true or false');
  return value === 'true';
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
