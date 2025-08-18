import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { config } from '../config/index.js';
import type { ContactFormData, FAQFormData } from '../types/index.js';

class EmailService {
    private transporter: Transporter | null = null;
    private connected = false;

    async initialize(): Promise<void> {
        try {
            this.transporter = nodemailer.createTransport({
                host: config.smtp.host,
                port: config.smtp.port,
                secure: false,
                auth: {
                    user: config.smtp.user,
                    pass: config.smtp.password
                },
                tls: {
                    ciphers: config.smtp.tlsCiphers,
                    rejectUnauthorized: false
                }
            });

            await this.transporter.verify();
            this.connected = true;
            console.log('✅ SMTP Connected');
        } catch (error) {
            console.error('❌ SMTP Connection failed:', error);
            this.connected = false;
            throw error;
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    async sendContactForm(data: ContactFormData): Promise<void> {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        const { email, firstName, lastName, subject, hasSpouse, stayAtHome, message } = data;
        const recipients = ['chriswilson@annieshavens.ca', 'jamie.moreau@annieshavens.ca', 'amanda.west@annieshavens.ca'];
        
        // Send to staff
        await this.transporter.sendMail({
            from: 'chriswilson@annieshavens.ca',
            to: recipients.join(','),
            replyTo: email,
            subject: `Contact Us Submission re: ${subject}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Sender's Name:</strong> ${firstName} ${lastName}</p>
                <p><strong>Sender's Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Has Spouse:</strong> ${hasSpouse ? 'Yes' : 'No'}</p>
                <p><strong>Stay At Home Parent:</strong> ${stayAtHome ? 'Yes' : 'No'}</p>
                <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
            `
        });

        // Send confirmation to user
        await this.transporter.sendMail({
            from: 'chriswilson@annieshavens.ca',
            to: email,
            subject: "Annie's Havens has received your message",
            html: `
                <h1>Thanks for getting in touch!</h1>
                <p>We'll do our best to reply as quickly as possible. It may take up to two (2) business days for us to respond.</p>
                <p>While you're waiting, have a look at the rest of <a href="https://annieshavens.ca">our site</a>.</p>
                <br>
                <p>Sincerely,</p>
                <p>Chris Wilson<br>Program Supervisor</p>
            `
        });
    }

    async sendFAQQuestion(data: FAQFormData): Promise<void> {
        if (!this.transporter) {
            throw new Error('Email service not initialized');
        }

        const { email, firstName, lastName, question } = data;

        // Send to staff
        await this.transporter.sendMail({
            from: 'chriswilson@annieshavens.ca',
            to: 'chriswilson@annieshavens.ca',
            replyTo: email,
            subject: 'FAQ Submission',
            html: `
                <h2>New FAQ Question</h2>
                <p><strong>Sender's Name:</strong> ${firstName} ${lastName}</p>
                <p><strong>Sender's Email:</strong> ${email}</p>
                <p><strong>Question:</strong><br>${question.replace(/\n/g, '<br>')}</p>
            `
        });

        // Send confirmation to user
        await this.transporter.sendMail({
            from: 'chriswilson@annieshavens.ca',
            to: email,
            subject: "Question to Annie's Havens Submitted",
            html: `
                <h1>Thanks for your question!</h1>
                <p>We'll do our very best to answer your question as quickly as possible. It may take up to two (2) business days for us to respond.</p>
                <p>While you're waiting, have a look at the rest of <a href="https://annieshavens.ca">our site</a>.</p>
                <br>
                <p>Sincerely,</p>
                <p>Chris Wilson<br>Program Supervisor</p>
            `
        });
    }
}

export const emailService = new EmailService();