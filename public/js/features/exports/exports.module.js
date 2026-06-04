// Task export module — renders the current task list to Excel, PDF, and Word.
// Reads the external libraries (XLSX, jspdf, docx) directly from global scope;
// their <script> tags load before app.js wires this module up.
(function () {
  const create = ({
    getTasks,
    t,
    priorityLabel,
    statusLabel,
    taskStatus,
    getRichTextPlainText,
    formatLocalDateTime,
    formatDateEST,
    showStatusToast,
  }) => {
    const exportToExcel = () => {
      const currentDateTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York'
      }) + ' EST (NYC)';

      const data = getTasks().map(task => ({
        [t('exportDate')]: currentDateTime,
        [t('title')]: task.title,
        [t('tag')]: task.tag || '',
        [t('priority')]: priorityLabel(task.priority),
        [t('status')]: statusLabel(taskStatus(task)),
        [t('description')]: getRichTextPlainText(task.description),
        [t('comment')]: task.comment || '',
        [t('attachment')]: task.attachment_name || '',
        [t('completed')]: task.completed ? t('yes') : t('no'),
        [t('dateTimeAlert')]: task.reminder_at ? formatLocalDateTime(task.reminder_at) : '',
        [t('created')]: formatDateEST(task.created_at),
        [t('updated')]: formatDateEST(task.updated_at)
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('tasks'));
      XLSX.writeFile(wb, 'tasks.xlsx');
      showStatusToast(t('excelExported'));
    };

    const arrayBufferToBase64 = (buffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }
      return btoa(binary);
    };

    const loadPdfUnicodeFont = async (doc) => {
      const fontName = 'TaskManagerUnicode';
      if (!window.taskManagerPdfFontBase64) {
        const response = await fetch('fonts/arial.ttf');
        if (!response.ok) {
          throw new Error('Unable to load PDF font');
        }
        window.taskManagerPdfFontBase64 = arrayBufferToBase64(await response.arrayBuffer());
      }

      doc.addFileToVFS('arial.ttf', window.taskManagerPdfFontBase64);
      doc.addFont('arial.ttf', fontName, 'normal');
      doc.setFont(fontName, 'normal');
    };

    const exportToPdf = async () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      try {
        await loadPdfUnicodeFont(doc);
      } catch (error) {
        console.warn('PDF Unicode font could not be loaded:', error);
      }

      const currentDateTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York'
      }) + ' EST (NYC)';

      doc.setFontSize(16);
      doc.text(t('myTasks'), 20, 20);
      doc.setFontSize(10);
      doc.text(`${t('exportDate')}: ${currentDateTime}`, 20, 30);
      let y = 40;

      const pageHeight = doc.internal.pageSize.getHeight();
      const contentBottom = pageHeight - 20;
      const maxTextWidth = 170;

      const ensurePdfSpace = (heightNeeded) => {
        if (y + heightNeeded > contentBottom) {
          doc.addPage();
          y = 20;
        }
      };

      const addPdfLine = (label, value) => {
        const text = `${label}: ${value || t('notAvailable')}`;
        const lines = doc.splitTextToSize(text, maxTextWidth);
        ensurePdfSpace(lines.length * 6);
        doc.text(lines, 20, y);
        y += lines.length * 6 + 4;
      };

      getTasks().forEach(task => {
        doc.setFontSize(12);
        addPdfLine(t('title'), task.title);
        addPdfLine(t('tag'), task.tag);
        addPdfLine(t('priority'), priorityLabel(task.priority));
        addPdfLine(t('status'), statusLabel(taskStatus(task)));
        addPdfLine(t('description'), getRichTextPlainText(task.description));
        addPdfLine(t('comment'), task.comment);
        addPdfLine(t('attachment'), task.attachment_name);
        addPdfLine(t('completed'), task.completed ? t('yes') : t('no'));
        addPdfLine(t('dateTimeAlert'), task.reminder_at ? formatLocalDateTime(task.reminder_at) : '');
        addPdfLine(t('created'), formatDateEST(task.created_at));
        y += 5;
      });
      doc.save('tasks.pdf');
      showStatusToast(t('pdfExported'));
    };

    const exportToWord = async () => {
      const { Document, Packer, Paragraph, TextRun } = window.docx;
      const currentDateTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York'
      }) + ' EST (NYC)';

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: t('myTasks'),
                  bold: true,
                  size: 32
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun(`${t('exportDate')}: ${currentDateTime}`)
              ]
            }),
            new Paragraph({
              children: [
                new TextRun('') // empty line
              ]
            }),
            ...getTasks().flatMap(task => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${t('title')}: ${task.title}`,
                    bold: true
                  })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('description')}: ${getRichTextPlainText(task.description) || t('notAvailable')}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('comment')}: ${task.comment || t('notAvailable')}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('tag')}: ${task.tag || t('notAvailable')}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('priority')}: ${priorityLabel(task.priority)}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('status')}: ${statusLabel(taskStatus(task))}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('attachment')}: ${task.attachment_name || t('notAvailable')}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('completed')}: ${task.completed ? t('yes') : t('no')}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('dateTimeAlert')}: ${task.reminder_at ? formatLocalDateTime(task.reminder_at) : t('notAvailable')}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun(`${t('created')}: ${formatDateEST(task.created_at)}`)
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun('') // empty line
                ]
              })
            ])
          ]
        }]
      });
      const buffer = await Packer.toBlob(doc);
      const url = URL.createObjectURL(buffer);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tasks.docx';
      a.click();
      URL.revokeObjectURL(url);
      showStatusToast(t('wordExported'));
    };

    return {
      exportToExcel,
      exportToPdf,
      exportToWord,
    };
  };

  window.ExportsModule = { create };
})();
