export interface NotificationRecipientProps {
  recipientId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateNotificationRecipientInput {
  recipientId: string;
  email: string;
}

export class NotificationRecipient {
  private constructor(private readonly props: NotificationRecipientProps) {}

  static create(
    input: CreateNotificationRecipientInput,
  ): NotificationRecipient {
    const email = this.normalizeEmail(input.email);

    this.validateEmail(email);

    const now = new Date();

    return new NotificationRecipient({
      recipientId: input.recipientId,
      email,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: NotificationRecipientProps): NotificationRecipient {
    return new NotificationRecipient({
      ...props,
      email: this.normalizeEmail(props.email),
    });
  }

  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static validateEmail(email: string): void {
    if (!email) {
      throw new Error('Notification recipient email is required');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      throw new Error('Invalid notification recipient email');
    }
  }

  get recipientId(): string {
    return this.props.recipientId;
  }

  get email(): string {
    return this.props.email;
  }

  toObject(): NotificationRecipientProps {
    return {
      ...this.props,
    };
  }
}
