export interface ContactFormData {
  email: string;
  firstName: string;
  lastName: string;
  subject: string;
  hasSpouse: boolean;
  stayAtHome: boolean;
  message: string;
}

export interface FAQFormData {
  email: string;
  firstName: string;
  lastName: string;
  question: string;
}

export interface SiteMetadata {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  [key: string]: unknown;
}

export interface ViewData {
  baseRef: string;
  meta: SiteMetadata;
  canonical: string;
  noFooter?: boolean;
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tlsCiphers: string;
}

export interface AppConfig {
  port: number;
  baseUrl: string;
  captcha: {
    secret: string;
  };
  smtp: EmailConfig;
}

export interface CaptchaVerificationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}