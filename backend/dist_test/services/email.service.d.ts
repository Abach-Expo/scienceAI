interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
declare class EmailService {
    private transporter;
    private isConfigured;
    constructor();
    private initialize;
    sendEmail(options: EmailOptions): Promise<boolean>;
    sendPasswordResetCode(email: string, code: string): Promise<boolean>;
    sendWelcomeEmail(email: string, name: string): Promise<boolean>;
    sendSubscriptionConfirmation(email: string, planName: string, expiryDate: Date): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.service.d.ts.map