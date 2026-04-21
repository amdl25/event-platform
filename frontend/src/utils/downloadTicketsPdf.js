import API from '../api';

const toSafeFileSlug = (value) => {
  return String(value || 'eveniment')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 42) || 'eveniment';
};

export const downloadTicketsPdf = async ({ eventTitle, tickets, fileName, layoutMode }) => {
  const response = await API.post('/events/tickets/pdf', {
    eventTitle,
    tickets,
    fileName: fileName || eventTitle,
    layoutMode: layoutMode || 'single'
  }, {
    responseType: 'blob'
  });

  const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
  const objectUrl = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${toSafeFileSlug(fileName || eventTitle)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};