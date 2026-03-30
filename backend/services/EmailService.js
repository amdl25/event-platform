import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

const configureEmailClient = () => {
  const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;

  if (process.env.EMAIL_USER && emailPassword) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword,
      },
    });
  }

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  console.warn('⚠️  Email configuration not found. Set ENV vars: EMAIL_USER + EMAIL_PASSWORD (or EMAIL_PASS)');
  return null;
};

const transporter = configureEmailClient();

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const sanitizeFilename = (value) => {
  const text = (value || 'bilete').toString();
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'bilete';
};

const fetchQrImageBuffer = async (qrUrl) => {
  if (!qrUrl) return null;
  try {
    const response = await fetch(qrUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};

const generateTicketsPdfBuffer = async ({ buyerName, eventTitle, eventDate, eventLocation, tickets, quantity, totalPrice }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    if (index > 0) {
      doc.addPage();
    }

    const qrBuffer = await fetchQrImageBuffer(ticket.qr);
    const margin = 40;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - (margin * 2);

    const headerY = 36;
    const cardY = 110;
    const cardHeight = 560;
    const qrBoxSize = 200;
    const qrX = pageWidth - margin - qrBoxSize - 26;
    const qrY = cardY + 72;
    const leftX = margin + 24;
    const leftWidth = (qrX - leftX) - 24;

    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill('#f4f5f7');
    doc.restore();

    doc.roundedRect(margin, headerY, contentWidth, 58, 12).fill('#111827');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('EventHub - Bilet de acces', margin, headerY + 18, {
      width: contentWidth,
      align: 'center'
    });

    doc.roundedRect(margin, cardY, contentWidth, cardHeight, 16).fill('#ffffff');
    doc.roundedRect(margin, cardY, contentWidth, cardHeight, 16).lineWidth(1).stroke('#e5e7eb');

    doc.fillColor('#6b7280').font('Helvetica').fontSize(11).text(`Ticket ${index + 1} / ${tickets.length}`, margin, cardY + 16, {
      width: contentWidth,
      align: 'center'
    });

    let currentY = cardY + 58;
    const addField = (label, value) => {
      const textValue = `${label}: ${value || '-'}`;
      doc.fillColor('#111827').font('Helvetica').fontSize(12);
      const textHeight = doc.heightOfString(textValue, { width: leftWidth, lineGap: 2 });
      doc.text(textValue, leftX, currentY, { width: leftWidth, lineGap: 2 });
      currentY += textHeight + 12;
    };

    addField('Cumparator', buyerName || '-');
    addField('Eveniment', eventTitle || '-');
    addField('Data', formatDate(eventDate));
    addField('Locatie', eventLocation || '-');
    addField('Cod bilet', ticket.code || '-');
    addField('Pret bilet', `${Number(ticket.price || 0).toFixed(2)} lei`);

    doc.roundedRect(qrX, qrY, qrBoxSize, qrBoxSize, 12).fill('#f9fafb');
    doc.roundedRect(qrX, qrY, qrBoxSize, qrBoxSize, 12).lineWidth(1).stroke('#d1d5db');

    if (qrBuffer) {
      doc.image(qrBuffer, qrX + 18, qrY + 18, { fit: [qrBoxSize - 36, qrBoxSize - 36], align: 'center', valign: 'center' });
    } else {
      doc.fillColor('#b91c1c').font('Helvetica').fontSize(10).text('QR indisponibil', qrX, qrY + 92, {
        width: qrBoxSize,
        align: 'center'
      });
    }

    doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text('Scaneaza codul la intrare', qrX, qrY + qrBoxSize + 12, {
      width: qrBoxSize,
      align: 'center'
    });

    const footerY = cardY + cardHeight - 72;
    doc.moveTo(margin + 18, footerY).lineTo(pageWidth - margin - 18, footerY).lineWidth(1).stroke('#e5e7eb');
    doc.fillColor('#374151').font('Helvetica').fontSize(10).text(`Total comanda: ${Number(totalPrice || 0).toFixed(2)} lei (${quantity} bilet(e))`, margin, footerY + 14, {
      width: contentWidth,
      align: 'center'
    });
    doc.fillColor('#9ca3af').font('Helvetica').fontSize(10).text('Suport: support@eventhub.ro', margin, footerY + 32, {
      width: contentWidth,
      align: 'center'
    });
  }

  doc.end();

  return await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
};

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
          <h1>🎉 Biletele Tale!</h1>
          <p>Cumpărare confirmată • EventHub</p>
        </div>

        <div class="content">
          <p>Bună, <strong>${buyerName}</strong>!</p>
          <p>Mulțumim pentru cumpărarea biletelor tale. PDF-ul cu biletele și codurile QR este atașat acestui email.</p>

          <div class="event-info">
            <p><strong>Eveniment:</strong> ${eventTitle}</p>
            <p><strong>Data:</strong> ${eventDateFormatted}</p>
            <p><strong>Locație:</strong> ${eventLocation}</p>
          </div>

          <div class="summary">
            <p><strong>Numărul de bilete:</strong> ${quantity}</p>
            <p><strong>Total plătit:</strong> ${Number(totalPrice || 0).toFixed(2)} lei</p>
          </div>

          <p style="color: #999; font-size: 14px;">
            📱 <strong>Cum intri la eveniment?</strong><br>
            Deschide PDF-ul atașat și prezintă codul QR la intrare.
          </p>

          <p style="color: #999; font-size: 14px;">
            ❓ <strong>Întrebări?</strong><br>
            Contactează-ne pe support@eventhub.ro sau vizitează eventhub.ro
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
          filename: `${sanitizeFilename(eventTitle)}-bilete.pdf`,
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
      messageId: result.messageId
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
