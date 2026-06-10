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
        [t('comment')]: getRichTextPlainText(task.comment),
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
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      try {
        await loadPdfUnicodeFont(doc);
      } catch (error) {
        console.warn('PDF Unicode font could not be loaded:', error);
      }

      const currentDateTime = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York'
      }) + ' EST (NYC)';

      // Layout constants
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 15;
      const marginTop = 15;
      const marginBottom = 20;
      const contentWidth = pageWidth - marginX * 2;
      const contentBottom = pageHeight - marginBottom;

      // Color palette (RGB)
      const colors = {
        primary: [37, 99, 235],      // blue-600
        primaryDark: [30, 64, 175],  // blue-800
        text: [17, 24, 39],          // gray-900
        textMuted: [75, 85, 99],     // gray-600
        textLight: [156, 163, 175],  // gray-400
        border: [229, 231, 235],     // gray-200
        bgLight: [249, 250, 251],    // gray-50
        bgAccent: [239, 246, 255],   // blue-50
        priorityHigh: [220, 38, 38], // red-600
        priorityMed: [217, 119, 6],  // amber-600
        priorityLow: [22, 163, 74],  // green-600
        statusDone: [22, 163, 74],   // green-600
        statusProgress: [217, 119, 6], // amber-600
        statusTodo: [107, 114, 128], // gray-500
      };

      let y = marginTop;
      let pageNumber = 1;

      // Page footer with page numbers
      const drawFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(...colors.textLight);
        const footerText = `${t('myTasks')} • ${currentDateTime} • Page ${pageNumber}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: 'center' });
      };

      // Add a new page when content overflows
      const ensureSpace = (heightNeeded) => {
        if (y + heightNeeded > contentBottom) {
          drawFooter();
          doc.addPage();
          pageNumber += 1;
          y = marginTop;
        }
      };

      // Render the document header (title + meta) on first page
      const drawHeader = () => {
        // Header bar
        doc.setFillColor(...colors.primary);
        doc.rect(0, 0, pageWidth, 28, 'F');

        // Title
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text(t('myTasks'), marginX, 14);

        // Subtitle / metadata
        doc.setFontSize(9);
        doc.setTextColor(219, 234, 254); // blue-100
        doc.text(`${t('exportDate')}: ${currentDateTime}`, marginX, 22);

        const totalText = `${getTasks().length} ${getTasks().length === 1 ? t('task') || 'task' : t('tasks')}`;
        doc.text(totalText, pageWidth - marginX, 22, { align: 'right' });

        y = 38;
      };

      // Resolve a status color
      const statusColor = (statusKey) => {
        if (statusKey === 'done') return colors.statusDone;
        if (statusKey === 'in_progress') return colors.statusProgress;
        return colors.statusTodo;
      };

      // Resolve a priority color
      const priorityColor = (priority) => {
        if (priority === 'high') return colors.priorityHigh;
        if (priority === 'low') return colors.priorityLow;
        return colors.priorityMed;
      };

      // Draw a small colored badge with text
      const drawBadge = (text, x, top, fillColor) => {
        const padX = 2.5;
        const padY = 1.5;
        const fontSize = 8;
        doc.setFontSize(fontSize);
        const textWidth = doc.getTextWidth(text);
        const badgeWidth = textWidth + padX * 2;
        const badgeHeight = fontSize * 0.45 + padY * 2;
        doc.setFillColor(...fillColor);
        doc.roundedRect(x, top, badgeWidth, badgeHeight, 1.2, 1.2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(text, x + padX, top + badgeHeight - padY - 0.3);
        return { width: badgeWidth, height: badgeHeight };
      };

      // Draw a labeled inline field (single row "Label: value")
      const drawInlineField = (label, value) => {
        const text = value || t('notAvailable');
        doc.setFontSize(10);
        doc.setTextColor(...colors.textMuted);
        const labelText = `${label}: `;
        const labelWidth = doc.getTextWidth(labelText);
        const lines = doc.splitTextToSize(text, contentWidth - labelWidth - 2);
        const lineHeight = 5;
        ensureSpace(lines.length * lineHeight + 1);
        doc.text(labelText, marginX, y);
        doc.setTextColor(...colors.text);
        doc.text(lines, marginX + labelWidth, y);
        y += lines.length * lineHeight + 1.5;
      };

      // Draw a multi-line block field (label on its own line, content below).
      // Used for Description and Comment so long content always shows in full.
      const drawBlockField = (label, value) => {
        const content = (value && value.trim()) || t('notAvailable');
        const lineHeight = 5;
        const lines = doc.splitTextToSize(content, contentWidth - 6);

        // Label line
        ensureSpace(6);
        doc.setFontSize(10);
        doc.setTextColor(...colors.primaryDark);
        doc.text(label, marginX, y);
        y += 4.5;

        // Render content. If it overflows, split across pages cleanly.
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);
        let index = 0;
        while (index < lines.length) {
          const remainingSpace = contentBottom - y;
          const linesThatFit = Math.max(1, Math.floor(remainingSpace / lineHeight));
          const chunk = lines.slice(index, index + linesThatFit);

          // Draw subtle left accent bar for the chunk
          const blockHeight = chunk.length * lineHeight + 2;
          doc.setFillColor(...colors.bgAccent);
          doc.roundedRect(marginX, y - 3.5, contentWidth, blockHeight, 1.5, 1.5, 'F');
          doc.setDrawColor(...colors.primary);
          doc.setLineWidth(0.6);
          doc.line(marginX, y - 3.5, marginX, y - 3.5 + blockHeight);
          doc.setLineWidth(0.2);

          doc.setTextColor(...colors.text);
          doc.text(chunk, marginX + 3, y);

          y += chunk.length * lineHeight;
          index += chunk.length;

          if (index < lines.length) {
            // Need a new page for the rest
            drawFooter();
            doc.addPage();
            pageNumber += 1;
            y = marginTop;
          }
        }
        y += 3;
      };

      // Render a single task block
      const drawTask = (task, taskIndex) => {
        // Reserve a minimum amount of space so the title doesn't get orphaned.
        ensureSpace(20);

        // Task header strip with index + title
        const indexLabel = `#${taskIndex + 1}`;
        doc.setFontSize(9);
        doc.setTextColor(...colors.textMuted);
        const indexWidth = doc.getTextWidth(indexLabel) + 3;

        doc.setFontSize(13);
        doc.setTextColor(...colors.primaryDark);
        const titleText = task.title || t('notAvailable');
        const titleLines = doc.splitTextToSize(titleText, contentWidth - indexWidth - 2);
        const titleHeight = titleLines.length * 6;
        ensureSpace(titleHeight + 4);

        doc.setFontSize(9);
        doc.setTextColor(...colors.textLight);
        doc.text(indexLabel, marginX, y);

        doc.setFontSize(13);
        doc.setTextColor(...colors.primaryDark);
        doc.text(titleLines, marginX + indexWidth, y);
        y += titleHeight + 1;

        // Status + priority badges row
        ensureSpace(7);
        const statusKey = taskStatus(task);
        const statusBadge = drawBadge(statusLabel(statusKey), marginX, y, statusColor(statusKey));
        const priorityBadge = drawBadge(
          priorityLabel(task.priority),
          marginX + statusBadge.width + 2,
          y,
          priorityColor(task.priority || 'medium')
        );
        if (task.tag) {
          drawBadge(task.tag, marginX + statusBadge.width + priorityBadge.width + 4, y, colors.textMuted);
        }
        y += statusBadge.height + 4;

        // Divider line
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.2);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 4;

        // Inline metadata fields
        if (task.attachment_name) {
          drawInlineField(t('attachment'), task.attachment_name);
        }
        if (task.reminder_at) {
          drawInlineField(t('dateTimeAlert'), formatLocalDateTime(task.reminder_at));
        }
        drawInlineField(t('created'), formatDateEST(task.created_at));
        drawInlineField(t('completed'), task.completed ? t('yes') : t('no'));

        // Block fields — always show full content for description and comment
        const description = getRichTextPlainText(task.description);
        const comment = getRichTextPlainText(task.comment);
        if (description) {
          y += 1;
          drawBlockField(t('description'), description);
        }
        if (comment) {
          y += 1;
          drawBlockField(t('comment'), comment);
        }

        // Spacing + separator between tasks
        y += 4;
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.3);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 6;
      };

      drawHeader();

      const tasks = getTasks();
      if (tasks.length === 0) {
        doc.setFontSize(11);
        doc.setTextColor(...colors.textMuted);
        doc.text(t('noTasks') || 'No tasks to export.', pageWidth / 2, y + 20, { align: 'center' });
      } else {
        tasks.forEach((task, index) => drawTask(task, index));
      }

      drawFooter();
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
                  new TextRun(`${t('comment')}: ${getRichTextPlainText(task.comment) || t('notAvailable')}`)
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
