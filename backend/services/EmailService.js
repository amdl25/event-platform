import nodemailer from 'nodemailer';
import { generateTicketsPdfBuffer, sanitizePdfFilename } from './TicketPdfService.js';

const configureEmailClient = () => {
  const emailPassword = process.env.EMAIL_PASS;

  if (process.env.EMAIL_USER && emailPassword) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword,
      },
    });
  }

  console.warn('⚠️  Email configuration not found. Set ENV vars: EMAIL_USER + EMAIL_PASSWORD (or EMAIL_PASS)');
  return null;
};

const transporter = configureEmailClient();

const generateTicketEmailHTML = (buyerName, eventTitle, eventDate, eventLocation, quantity, totalPrice) => {
  const eventDateFormatted = new Date(eventDate).toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a1a1a; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .event-info { background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .event-info p { margin: 8px 0; }
        .event-info strong { color: #1a1a1a; }
        .summary { background: #e8f5e9; padding: 12px; border-radius: 6px; margin: 20px 0; }
        .footer { background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 8px 8px; }
        .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Biletele Tale</h1>
          <p>Cumparare confirmata • EventHub</p>
        </div>

        <div class="content">
          <p>Buna, <strong>${buyerName}</strong>!</p>
          <p>Multumim pentru cumpararea biletelor tale. PDF-ul atasat are acelasi format ca biletul descarcabil din contul tau.</p>

          <div class="event-info">
            <p><strong>Eveniment:</strong> ${eventTitle}</p>
            <p><strong>Data:</strong> ${eventDateFormatted}</p>
            <p><strong>Locatie:</strong> ${eventLocation}</p>
          </div>

          <div class="summary">
            <p><strong>Numarul de bilete:</strong> ${quantity}</p>
            <p><strong>Total platit:</strong> ${Number(totalPrice || 0).toFixed(2)} lei</p>
          </div>

          <p style="color: #999; font-size: 14px;">
            <strong>Cum intri la eveniment?</strong><br>
            Deschide PDF-ul atasat si prezinta codul QR la intrare.
          </p>

          <p style="color: #999; font-size: 14px;">
            <strong>Intrebari?</strong><br>
            Contacteaza-ne pe support@eventhub.ro sau viziteaza eventhub.ro
          </p>
        </div>

        <div class="footer">
          <p>© 2026 EventHub. Toate drepturile rezervate.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendTicketEmail = async (emailData) => {
  const {
    buyerEmail,
    buyerName,
    eventTitle,
    eventDate,
    eventLocation,
    tickets,
    quantity,
    totalPrice
  } = emailData;

  if (!transporter) {
    console.warn('⚠️  Email transporter not configured. Skipping email send.');
    return { success: false, message: 'Email service not configured' };
  }

  try {
    const pdfBuffer = await generateTicketsPdfBuffer({
      buyerName,
      eventTitle,
      eventDate,
      eventLocation,
      tickets,
      quantity,
      totalPrice
    });

    const htmlContent = generateTicketEmailHTML(
      buyerName,
      eventTitle,
      eventDate,
      eventLocation,
      quantity,
      totalPrice
    );

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"EventHub" <${process.env.EMAIL_USER}>`,
      to: buyerEmail,
      subject: `🎫 Biletele tale pentru ${eventTitle}`,
      html: htmlContent,
      attachments: [
        {
          filename: `${sanitizePdfFilename(eventTitle)}-bilete.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.response);

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId,
      accepted: result.accepted || [],
      rejected: result.rejected || []
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    };
  }
};

export default { sendTicketEmail };
