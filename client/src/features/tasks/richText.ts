// Rich-text sanitize/render helpers ported verbatim from public/app.js to
// preserve the exact stored-HTML format the backend validates and legacy renders.

const richTextAllowedTags = new Set([
  'A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL',
  'UL', 'OL', 'LI', 'P', 'DIV', 'BR', 'LABEL', 'INPUT', 'SPAN',
]);

export const escapeHtml = (value = ''): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const hasRichTextMarkup = (value = ''): boolean =>
  /<\/?(a|b|strong|i|em|u|s|strike|del|ul|ol|li|p|div|br|label|input|span)\b/i.test(value);

const isSafeLinkHref = (href = ''): boolean => /^(https?:|mailto:)/i.test(href);

export const autolinkPlainUrls = (html = ''): string =>
  html.replace(
    /(^|[\s>])((https?:\/\/)[^\s<]+)/gi,
    (_match, prefix: string, url: string) =>
      `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
  );

const linkifyPlainText = (value = ''): string =>
  autolinkPlainUrls(escapeHtml(value)).replace(/\n/g, '<br>');

export const sanitizeRichText = (html = ''): string => {
  const template = document.createElement('template');
  template.innerHTML = autolinkPlainUrls(html);

  template.content.querySelectorAll('*').forEach((element) => {
    const style = element.getAttribute('style') || '';
    if (
      element.tagName === 'SPAN' &&
      /text-decoration[^;:]*:\s*[^;]*line-through|text-decoration-line[^;:]*:\s*[^;]*line-through/i.test(style)
    ) {
      const strike = document.createElement('s');
      strike.append(...element.childNodes);
      element.replaceWith(strike);
      return;
    }

    const href = element.tagName === 'A' ? element.getAttribute('href') || '' : '';
    const inputType =
      element.tagName === 'INPUT' ? (element.getAttribute('type') || '').toLowerCase() : '';
    const isChecked =
      element.tagName === 'INPUT' &&
      ((element as HTMLInputElement).checked || element.hasAttribute('checked'));
    const className = element.getAttribute('class') || '';
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));

    if (!richTextAllowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    if (element.tagName === 'A') {
      if (!isSafeLinkHref(href)) {
        element.replaceWith(...element.childNodes);
        return;
      }
      (element as HTMLAnchorElement).href = href;
      (element as HTMLAnchorElement).target = '_blank';
      (element as HTMLAnchorElement).rel = 'noopener noreferrer';
    }

    if (element.tagName === 'INPUT') {
      if (inputType !== 'checkbox') {
        element.remove();
        return;
      }
      (element as HTMLInputElement).type = 'checkbox';
      element.className = 'rich-check-input';
      element.setAttribute('data-rich-checklist', 'true');
      if (isChecked) element.setAttribute('checked', '');
      return;
    }

    if (element.tagName === 'LABEL' && className.includes('rich-check-item')) {
      element.className = `rich-check-item${
        element.querySelector('input[type="checkbox"]:checked') ? ' checked' : ''
      }`;
      return;
    }

    if (element.tagName === 'SPAN' && className.includes('rich-check-text')) {
      element.className = 'rich-check-text';
    }
  });

  return template.innerHTML.trim();
};

export const renderStoredRichText = (value = ''): string =>
  hasRichTextMarkup(value) ? sanitizeRichText(value) : linkifyPlainText(value);

export const getRichTextPlainText = (html = ''): string => {
  if (!hasRichTextMarkup(html)) return String(html || '').trim();
  const container = document.createElement('div');
  container.innerHTML = sanitizeRichText(html);
  return container.textContent?.trim() ?? '';
};
