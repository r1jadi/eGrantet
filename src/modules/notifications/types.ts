export type NotificationChannel = "EMAIL" | "IN_APP";
export interface NotificationMessage { recipientId: string; channel: NotificationChannel; template: string; data: Record<string, string>; }
export interface NotificationService { send(message: NotificationMessage): Promise<void>; }

export const NOTIFICATION_TYPES = ["APPLICATION_STATUS", "CORRECTION_REQUEST", "SYSTEM"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  userId: string;
  applicationId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}
