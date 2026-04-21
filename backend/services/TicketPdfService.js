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

const PAGE_MARGIN = 24;
const HEADER_TITLE_Y = 28;
const SUBTITLE_Y = 58;
const DIVIDER_Y = 82;
const CARD_START_Y = 96;
const CARD_HEIGHT = 154;
const CARD_GAP = 12;

const drawPageChrome = ({ doc, eventTitle }) => {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - (PAGE_MARGIN * 2);

  doc.save();
  doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff');
  doc.restore();

  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(18).text('EventHub - Biletele Tale', PAGE_MARGIN, HEADER_TITLE_Y, {
    width: contentWidth,
    align: 'left'
  });
  doc.fillColor('#64748b').font('Helvetica').fontSize(13).text(sanitizePdfText(eventTitle || 'Eveniment'), PAGE_MARGIN, SUBTITLE_Y, {
    width: contentWidth,
    align: 'left'
  });

  doc.moveTo(PAGE_MARGIN, DIVIDER_Y).lineTo(pageWidth - PAGE_MARGIN, DIVIDER_Y).lineWidth(1).stroke('#e5e7eb');
};

const drawTicketCard = async ({ doc, ticket, cardY }) => {
  const qrBuffer = await fetchQrImageBuffer(ticket.qr || ticket.qrValue);
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - (PAGE_MARGIN * 2);
  const qrSize = 98;
  const qrX = pageWidth - PAGE_MARGIN - qrSize - 14;
  const qrY = cardY + 34;
  const leftX = PAGE_MARGIN + 14;
  const leftWidth = (qrX - leftX) - 18;

  doc.roundedRect(PAGE_MARGIN, cardY, contentWidth, CARD_HEIGHT, 14).fill('#ffffff');
  doc.roundedRect(PAGE_MARGIN, cardY, contentWidth, CARD_HEIGHT, 14).lineWidth(1).stroke('#e5e7eb');

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(15).text(sanitizePdfText(ticket.code || ticket.ticketCode || '-'), leftX, cardY + 16, {
    width: leftWidth,
    align: 'left'
  });

  doc.fillColor('#64748b').font('Helvetica').fontSize(10).text(sanitizePdfText(ticket.organizationName || ticket.organizerName || 'Organizator'), PAGE_MARGIN, cardY + 16, {
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
};

export const generateTicketsPdfBuffer = async ({ eventTitle, tickets, layoutMode = 'single' }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  drawPageChrome({ doc, eventTitle });

  if (layoutMode === 'stack') {
    let cardY = CARD_START_Y;
    const availableBottom = doc.page.height - PAGE_MARGIN;

    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index];
      if (cardY + CARD_HEIGHT > availableBottom) {
        doc.addPage();
        drawPageChrome({ doc, eventTitle });
        cardY = CARD_START_Y;
      }

      await drawTicketCard({ doc, ticket, cardY });
      cardY += CARD_HEIGHT + CARD_GAP;
    }
  } else {
    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index];
      if (index > 0) {
        doc.addPage();
        drawPageChrome({ doc, eventTitle });
      }

      await drawTicketCard({ doc, ticket, cardY: CARD_START_Y });
    }
  }

  doc.end();

  return await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
};