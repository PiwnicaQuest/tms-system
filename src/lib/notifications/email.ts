import { Resend } from "resend";

// Lazy initialization to avoid errors during build
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Bakus TMS <noreply@bakus-tms.pl>";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  const client = getResendClient();

  // In development without API key, just log
  if (!client) {
    console.log("[Email] Would send:", { to, subject });
    return { success: true, messageId: "dev-mode" };
  }

  try {
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error("[Email] Error:", result.error);
      return { success: false, error: result.error };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error("[Email] Exception:", error);
    return { success: false, error };
  }
}

// Email templates
export const emailTemplates = {
  inspectionExpiry: (data: {
    vehicleReg: string;
    expiryDate: string;
    daysLeft: number;
  }) => ({
    subject: `Przypomnienie: Przegląd techniczny - ${data.vehicleReg}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Przypomnienie o przeglądzie technicznym</h2>
        <p>Przegląd techniczny pojazdu <strong>${data.vehicleReg}</strong> wygasa <strong>${data.expiryDate}</strong>.</p>
        <p style="font-size: 18px; color: #dc2626;">Pozostało <strong>${data.daysLeft}</strong> dni.</p>
        <p>Zaplanuj wizytę w stacji kontroli pojazdów.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Wiadomość wygenerowana automatycznie przez Bakus TMS</p>
      </div>
    `,
  }),

  insuranceExpiry: (data: {
    vehicleReg: string;
    insuranceType: "OC" | "AC";
    expiryDate: string;
    daysLeft: number;
  }) => ({
    subject: `Przypomnienie: Ubezpieczenie ${data.insuranceType} - ${data.vehicleReg}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Przypomnienie o ubezpieczeniu ${data.insuranceType}</h2>
        <p>Ubezpieczenie ${data.insuranceType} pojazdu <strong>${data.vehicleReg}</strong> wygasa <strong>${data.expiryDate}</strong>.</p>
        <p style="font-size: 18px; color: #dc2626;">Pozostało <strong>${data.daysLeft}</strong> dni.</p>
        <p>Skontaktuj się z ubezpieczycielem w celu przedłużenia polisy.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Wiadomość wygenerowana automatycznie przez Bakus TMS</p>
      </div>
    `,
  }),

  licenseExpiry: (data: {
    driverName: string;
    licenseType: string;
    expiryDate: string;
    daysLeft: number;
  }) => ({
    subject: `Przypomnienie: ${data.licenseType} - ${data.driverName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Przypomnienie o dokumencie kierowcy</h2>
        <p>Dokument <strong>${data.licenseType}</strong> kierowcy <strong>${data.driverName}</strong> wygasa <strong>${data.expiryDate}</strong>.</p>
        <p style="font-size: 18px; color: #dc2626;">Pozostało <strong>${data.daysLeft}</strong> dni.</p>
        <p>Zaplanuj odnowienie dokumentu.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Wiadomość wygenerowana automatycznie przez Bakus TMS</p>
      </div>
    `,
  }),

  invoiceOverdue: (data: {
    invoiceNumber: string;
    contractorName: string;
    amount: string;
    dueDate: string;
    daysOverdue: number;
  }) => ({
    subject: `Faktura przeterminowana: ${data.invoiceNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Faktura przeterminowana</h2>
        <p>Faktura <strong>${data.invoiceNumber}</strong> dla kontrahenta <strong>${data.contractorName}</strong> nie została opłacona.</p>
        <p><strong>Kwota:</strong> ${data.amount}</p>
        <p><strong>Termin płatności:</strong> ${data.dueDate}</p>
        <p style="font-size: 18px; color: #dc2626;">Przeterminowana o <strong>${data.daysOverdue}</strong> dni.</p>
        <p>Skontaktuj się z kontrahentem w celu wyjaśnienia płatności.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Wiadomość wygenerowana automatycznie przez Bakus TMS</p>
      </div>
    `,
  }),

  newOrder: (data: {
    orderNumber: string;
    origin: string;
    destination: string;
    loadingDate: string;
    price: string;
  }) => ({
    subject: `Nowe zlecenie: ${data.orderNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Nowe zlecenie transportowe</h2>
        <p>Utworzono nowe zlecenie <strong>${data.orderNumber}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Trasa:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${data.origin} → ${data.destination}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Załadunek:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.loadingDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Stawka:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${data.price}</strong></td>
          </tr>
        </table>
        <p>Zaloguj się do systemu, aby przypisać kierowcę i pojazd.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Wiadomość wygenerowana automatycznie przez Bakus TMS</p>
      </div>
    `,
  }),

  dailyDigest: (data: {
    date: string;
    expiringDocuments: Array<{ type: string; entity: string; expiryDate: string; daysLeft: number }>;
    overdueInvoices: Array<{ number: string; contractor: string; amount: string; daysOverdue: number }>;
    todayOrders: number;
    alerts: Array<{ type: string; message: string }>;
  }) => ({
    subject: `Dzienny raport Bakus TMS - ${data.date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Dzienny raport - ${data.date}</h2>

        ${data.expiringDocuments.length > 0 ? `
          <h3 style="color: #dc2626;">Wygasające dokumenty (${data.expiringDocuments.length})</h3>
          <ul style="padding-left: 20px;">
            ${data.expiringDocuments.map(d => `
              <li style="margin-bottom: 8px;">
                <strong>${d.type}</strong> - ${d.entity} (wygasa: ${d.expiryDate}, za ${d.daysLeft} dni)
              </li>
            `).join("")}
          </ul>
        ` : ""}

        ${data.overdueInvoices.length > 0 ? `
          <h3 style="color: #f59e0b;">Przeterminowane faktury (${data.overdueInvoices.length})</h3>
          <ul style="padding-left: 20px;">
            ${data.overdueInvoices.map(i => `
              <li style="margin-bottom: 8px;">
                <strong>${i.number}</strong> - ${i.contractor}: ${i.amount} (${i.daysOverdue} dni po terminie)
              </li>
            `).join("")}
          </ul>
        ` : ""}

        <h3 style="color: #10b981;">Zlecenia na dziś: ${data.todayOrders}</h3>

        ${data.alerts.length > 0 ? `
          <h3 style="color: #6b7280;">Alerty systemowe</h3>
          <ul style="padding-left: 20px;">
            ${data.alerts.map(a => `<li>${a.message}</li>`).join("")}
          </ul>
        ` : ""}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">Wiadomość wygenerowana automatycznie przez Bakus TMS</p>
      </div>
    `,
  }),
};
