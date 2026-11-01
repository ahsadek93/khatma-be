import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { AppConfig } from '../config/configuration.js';

@Injectable()
export class AuthMailerService {
  private readonly logger = new Logger(AuthMailerService.name);
  private readonly from: string;
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>;

  constructor(config: ConfigService<AppConfig, true>) {
    this.from = config.get('SMTP_FROM', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      auth: {
        user: config.get('SMTP_USER', { infer: true }),
        pass: config.get('SMTP_PASS', { infer: true }),
      },
    });
  }

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
