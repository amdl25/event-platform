import PDFDocument from 'pdfkit';

export const sanitizePdfFilename = (value) => {
  const text = (value || 'bilete').toString();
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'bilete';
};

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

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatShortDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const sanitizePdfText = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const fetchQrImageBuffer = async (qrUrl) => {
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

export const generateTicketsPdfBuffer = async ({ eventTitle, tickets }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    if (index > 0) {
      doc.addPage();
    }

    const qrBuffer = await fetchQrImageBuffer(ticket.qr || ticket.qrValue);
    const margin = 24;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - (margin * 2);

    const headerY = 28;
    const headerTitleY = 28;
    const subtitleY = 58;
    const dividerY = 82;
    const cardY = 96;
    const cardHeight = 154;
    const qrSize = 98;
    const qrX = pageWidth - margin - qrSize - 14;
    const qrY = cardY + 34;
    const leftX = margin + 14;
    const leftWidth = (qrX - leftX) - 18;

    doc.save();
    doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff');
    doc.restore();

    doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(18).text('EventHub - Biletele Tale', margin, headerTitleY, {
      width: contentWidth,
      align: 'left'
    });
    doc.fillColor('#64748b').font('Helvetica').fontSize(13).text(sanitizePdfText(eventTitle || 'Eveniment'), margin, subtitleY, {
      width: contentWidth,
      align: 'left'
    });

    doc.moveTo(margin, dividerY).lineTo(pageWidth - margin, dividerY).lineWidth(1).stroke('#e5e7eb');

    doc.roundedRect(margin, cardY, contentWidth, cardHeight, 14).fill('#ffffff');
    doc.roundedRect(margin, cardY, contentWidth, cardHeight, 14).lineWidth(1).stroke('#e5e7eb');

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(15).text(sanitizePdfText(ticket.code || ticket.ticketCode || '-'), leftX, cardY + 16, {
      width: leftWidth,
      align: 'left'
    });

    doc.fillColor('#64748b').font('Helvetica').fontSize(10).text(sanitizePdfText(ticket.organizationName || ticket.organizerName || 'Organizator'), margin, cardY + 16, {
      width: contentWidth - 12,
      align: 'right'
    });

    const metaLineOne = [
      `Data: ${formatShortDate(ticket.date || ticket.eventDate)}`,
      `Ora: ${formatTime(ticket.date || ticket.eventDate)}`
    ].join('    ');
    const metaLineTwo = [
      `Locatie: ${sanitizePdfText(ticket.location || ticket.eventLocation || '-')}`,
      `Puncte: +${Number(ticket.points || 0)}`
    ].join('    ');

    doc.fillColor('#475569').font('Helvetica').fontSize(10).text(metaLineOne, leftX, cardY + 40, {
      width: leftWidth,
      align: 'left'
    });
    doc.fillColor('#475569').font('Helvetica').fontSize(10).text(metaLineTwo, leftX, cardY + 58, {
      width: leftWidth,
      align: 'left'
    });

    doc.roundedRect(qrX, qrY, qrSize, qrSize, 10).fill('#ffffff');
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 10).lineWidth(1).stroke('#e5e7eb');

    if (qrBuffer) {
      doc.image(qrBuffer, qrX + 4, qrY + 4, { fit: [qrSize - 8, qrSize - 8], align: 'center', valign: 'center' });
    } else {
      doc.fillColor('#b91c1c').font('Helvetica').fontSize(10).text('QR indisponibil', qrX, qrY + 92, {
        width: qrSize,
        align: 'center'
      });
    }
  }

  doc.end();

  return await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
};