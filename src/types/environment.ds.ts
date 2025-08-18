export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      CAPTCHA_SECRET?: string;
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_AUTH_USER?: string;
      SMTP_AUTH_PASSWORD?: string;
      SMTP_TLS_CIPHERS?: string;
    }
  }
}