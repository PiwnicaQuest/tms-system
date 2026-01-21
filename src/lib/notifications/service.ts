import { prisma } from "@/lib/db/prisma";
import { NotificationType, Prisma } from "@prisma/client";
import { sendEmail, emailTemplates } from "./email";
import { format, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";

// Silence unused import warning
void emailTemplates;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface CreateNotificationParams {
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  vehicleId?: string;
  driverId?: string;
  orderId?: string;
  documentId?: string;
  invoiceId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data as Prisma.InputJsonValue | undefined,
      vehicleId: params.vehicleId,
      driverId: params.driverId,
      orderId: params.orderId,
      documentId: params.documentId,
      invoiceId: params.invoiceId,
    },
  });

  return notification;
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      OR: [{ userId }, { userId: null }],
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllAsRead(tenantId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      tenantId,
      OR: [{ userId }, { userId: null }],
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function getNotifications(
  tenantId: string,
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
) {
  const { limit = 50, unreadOnly = false } = options || {};

  return prisma.notification.findMany({
    where: {
      tenantId,
      OR: [{ userId }, { userId: null }],
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(tenantId: string, userId: string) {
  return prisma.notification.count({
    where: {
      tenantId,
      OR: [{ userId }, { userId: null }],
      isRead: false,
    },
  });
}

// Check for expiring documents and create notifications
export async function checkExpiringDocuments(tenantId: string) {
  const settings = await prisma.notificationSettings.findFirst({
    where: { tenantId },
  });

  const reminderDays = settings?.reminderDays || 30;
  const reminderSecondDays = settings?.reminderSecondDays || 7;
  const today = new Date();

  const notifications: CreateNotificationParams[] = [];

  // Check vehicle documents (from Document table)
  const expiringDocs = await prisma.document.findMany({
    where: {
      tenantId,
      expiryDate: {
        gte: today,
        lte: new Date(today.getTime() + reminderDays * 24 * 60 * 60 * 1000),
      },
      reminderSent: false,
    },
    include: {
      vehicle: true,
      driver: true,
      trailer: true,
    },
  });

  for (const doc of expiringDocs) {
    const daysLeft = differenceInDays(doc.expiryDate!, today);
    const shouldNotify = daysLeft <= reminderDays || daysLeft <= reminderSecondDays;

    if (!shouldNotify) continue;

    let entityName = "";
    if (doc.vehicle) entityName = doc.vehicle.registrationNumber;
    else if (doc.driver) entityName = `${doc.driver.firstName} ${doc.driver.lastName}`;
    else if (doc.trailer) entityName = doc.trailer.registrationNumber;

    const typeMap: Record<string, NotificationType> = {
      VEHICLE_INSPECTION: "INSPECTION_EXPIRY",
      VEHICLE_INSURANCE_OC: "INSURANCE_OC_EXPIRY",
      VEHICLE_INSURANCE_AC: "INSURANCE_AC_EXPIRY",
      DRIVER_LICENSE: "LICENSE_EXPIRY",
      DRIVER_ADR: "ADR_EXPIRY",
      DRIVER_MEDICAL: "MEDICAL_EXPIRY",
      TACHOGRAPH_CALIBRATION: "TACHOGRAPH_EXPIRY",
    };

    const notificationType = typeMap[doc.type] || "DOCUMENT_EXPIRY";

    notifications.push({
      tenantId,
      type: notificationType,
      title: `${doc.name} wygasa za ${daysLeft} dni`,
      message: `${doc.type}: ${entityName} - wygasa ${format(doc.expiryDate!, "dd.MM.yyyy", { locale: pl })}`,
      data: { documentId: doc.id, daysLeft, expiryDate: doc.expiryDate },
      vehicleId: doc.vehicleId || undefined,
      driverId: doc.driverId || undefined,
      documentId: doc.id,
    });

    // Mark as reminder sent
    await prisma.document.update({
      where: { id: doc.id },
      data: { reminderSent: true },
    });
  }

  // Check driver licenses and ADR directly from Driver model
  const drivers = await prisma.driver.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        {
          licenseExpiry: {
            gte: today,
            lte: new Date(today.getTime() + reminderDays * 24 * 60 * 60 * 1000),
          },
        },
        {
          adrExpiry: {
            gte: today,
            lte: new Date(today.getTime() + reminderDays * 24 * 60 * 60 * 1000),
          },
        },
        {
          medicalExpiry: {
            gte: today,
            lte: new Date(today.getTime() + reminderDays * 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
  });

  for (const driver of drivers) {
    const driverName = `${driver.firstName} ${driver.lastName}`;

    if (driver.licenseExpiry) {
      const daysLeft = differenceInDays(driver.licenseExpiry, today);
      if (daysLeft >= 0 && daysLeft <= reminderDays) {
        // Check if notification already exists
        const existing = await prisma.notification.findFirst({
          where: {
            tenantId,
            type: "LICENSE_EXPIRY",
            driverId: driver.id,
            createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          notifications.push({
            tenantId,
            type: "LICENSE_EXPIRY",
            title: `Prawo jazdy wygasa za ${daysLeft} dni`,
            message: `${driverName} - wygasa ${format(driver.licenseExpiry, "dd.MM.yyyy", { locale: pl })}`,
            data: { daysLeft, expiryDate: driver.licenseExpiry },
            driverId: driver.id,
          });
        }
      }
    }

    if (driver.adrExpiry) {
      const daysLeft = differenceInDays(driver.adrExpiry, today);
      if (daysLeft >= 0 && daysLeft <= reminderDays) {
        const existing = await prisma.notification.findFirst({
          where: {
            tenantId,
            type: "ADR_EXPIRY",
            driverId: driver.id,
            createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          notifications.push({
            tenantId,
            type: "ADR_EXPIRY",
            title: `Certyfikat ADR wygasa za ${daysLeft} dni`,
            message: `${driverName} - wygasa ${format(driver.adrExpiry, "dd.MM.yyyy", { locale: pl })}`,
            data: { daysLeft, expiryDate: driver.adrExpiry },
            driverId: driver.id,
          });
        }
      }
    }

    if (driver.medicalExpiry) {
      const daysLeft = differenceInDays(driver.medicalExpiry, today);
      if (daysLeft >= 0 && daysLeft <= reminderDays) {
        const existing = await prisma.notification.findFirst({
          where: {
            tenantId,
            type: "MEDICAL_EXPIRY",
            driverId: driver.id,
            createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          notifications.push({
            tenantId,
            type: "MEDICAL_EXPIRY",
            title: `Badania lekarskie wygasają za ${daysLeft} dni`,
            message: `${driverName} - wygasa ${format(driver.medicalExpiry, "dd.MM.yyyy", { locale: pl })}`,
            data: { daysLeft, expiryDate: driver.medicalExpiry },
            driverId: driver.id,
          });
        }
      }
    }
  }

  // Create all notifications
  for (const notif of notifications) {
    await createNotification(notif);
  }

  return notifications.length;
}

// Check for overdue invoices
export async function checkOverdueInvoices(tenantId: string) {
  const today = new Date();
  const notifications: CreateNotificationParams[] = [];

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      isPaid: false,
      status: { not: "CANCELLED" },
      dueDate: { lt: today },
    },
    include: {
      contractor: true,
    },
  });

  for (const invoice of overdueInvoices) {
    const daysOverdue = differenceInDays(today, invoice.dueDate);

    // Check if notification already exists in last 7 days
    const existing = await prisma.notification.findFirst({
      where: {
        tenantId,
        type: "INVOICE_OVERDUE",
        invoiceId: invoice.id,
        createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (!existing) {
      notifications.push({
        tenantId,
        type: "INVOICE_OVERDUE",
        title: `Faktura przeterminowana: ${invoice.invoiceNumber}`,
        message: `${invoice.contractor?.name || "Nieznany kontrahent"} - ${formatCurrency(invoice.grossAmount)} (${daysOverdue} dni po terminie)`,
        data: { daysOverdue, dueDate: invoice.dueDate, amount: invoice.grossAmount },
        invoiceId: invoice.id,
      });

      // Update invoice status to OVERDUE
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE" },
      });
    }
  }

  for (const notif of notifications) {
    await createNotification(notif);
  }

  return notifications.length;
}

// Send email notifications for pending alerts
export async function sendPendingEmailNotifications(tenantId: string) {
  const settings = await prisma.notificationSettings.findFirst({
    where: { tenantId },
  });

  if (!settings?.emailEnabled) {
    return 0;
  }

  // Get users with their settings
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
    },
  });

  if (users.length === 0) return 0;

  // Get unsent notifications
  const notifications = await prisma.notification.findMany({
    where: {
      tenantId,
      emailSent: false,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  let sentCount = 0;

  for (const notif of notifications) {
    // Determine target users
    const targetUsers = notif.userId
      ? users.filter((u) => u.id === notif.userId)
      : users.filter((u) => u.role === "ADMIN" || u.role === "MANAGER");

    for (const user of targetUsers) {
      if (!user.email) continue;

      // Check if user wants this type of notification
      const shouldSend = shouldSendEmailForType(notif.type, settings);
      if (!shouldSend) continue;

      const emailContent = getEmailContentForNotification(notif);
      if (!emailContent) continue;

      const result = await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (result.success) {
        sentCount++;
      }
    }

    // Mark as sent
    await prisma.notification.update({
      where: { id: notif.id },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });
  }

  return sentCount;
}

function shouldSendEmailForType(
  type: NotificationType,
  settings: {
    emailInspectionExpiry: boolean;
    emailInsuranceExpiry: boolean;
    emailLicenseExpiry: boolean;
    emailNewOrder: boolean;
    emailOrderStatus: boolean;
    emailInvoiceOverdue: boolean;
  }
): boolean {
  switch (type) {
    case "INSPECTION_EXPIRY":
    case "TACHOGRAPH_EXPIRY":
      return settings.emailInspectionExpiry;
    case "INSURANCE_OC_EXPIRY":
    case "INSURANCE_AC_EXPIRY":
      return settings.emailInsuranceExpiry;
    case "LICENSE_EXPIRY":
    case "ADR_EXPIRY":
    case "MEDICAL_EXPIRY":
      return settings.emailLicenseExpiry;
    case "NEW_ORDER":
    case "ORDER_ASSIGNED":
      return settings.emailNewOrder;
    case "ORDER_STATUS_CHANGE":
      return settings.emailOrderStatus;
    case "INVOICE_OVERDUE":
      return settings.emailInvoiceOverdue;
    default:
      return true;
  }
}

function getEmailContentForNotification(notif: {
  type: NotificationType;
  title: string;
  message: string;
  data: unknown;
}): { subject: string; html: string } | null {
  // Generic email template
  return {
    subject: notif.title,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notif.title}</h2>
        <p>${notif.message}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Wiadomość wygenerowana automatycznie przez Bakus TMS</p>
      </div>
    `,
  };
}

// Run all checks for a tenant
export async function runNotificationChecks(tenantId: string) {
  const results = {
    documentsChecked: 0,
    invoicesChecked: 0,
    emailsSent: 0,
  };

  results.documentsChecked = await checkExpiringDocuments(tenantId);
  results.invoicesChecked = await checkOverdueInvoices(tenantId);
  results.emailsSent = await sendPendingEmailNotifications(tenantId);

  return results;
}
