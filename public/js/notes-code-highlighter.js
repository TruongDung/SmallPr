// Simple syntax highlighter for code blocks in notes
(function() {
  // Language detection patterns
  const languagePatterns = {
    python: /\b(def|class|import|from|return|if|elif|else|for|while|try|except|with|as|self|range|len)\b/,
    javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|async|await)\b/,
    java: /\b(public|private|protected|class|interface|void|int|String|return|if|else|for|while)\b/,
    cpp: /\b(#include|using|namespace|int|void|return|if|else|for|while|class|public|private)\b/,
    sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|JOIN|ON)\b/i,
    html: /<\/?[a-z][\s\S]*>/i,
    css: /[.#]?[a-z-]+\s*\{[\s\S]*\}/,
    json: /^\s*[\{\[]/,
    bash: /^\s*(#!\/bin\/bash|cd|ls|mkdir|rm|grep|awk|sed|curl)/m,
  };

  const languageAliases = {
    py: 'python',
    python3: 'python',
    js: 'javascript',
    ts: 'javascript',
    c: 'cpp',
    cpp: 'cpp',
    html: 'html',
    htm: 'html',
    xml: 'html',
    css: 'css',
    json: 'json',
    sh: 'bash',
    bash: 'bash',
  };

  const detectLanguage = (code) => {
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(code)) {
        return lang;
      }
    }
    return 'plaintext';
  };

  // Simple syntax highlighting rules
  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const highlightCode = (code, language) => {
    let highlighted = escapeHtml(code);
    const tokens = [];

    const placeholderName = (index) => {
      let value = index;
      let name = '';
      do {
        name = String.fromCharCode(65 + (value % 26)) + name;
        value = Math.floor(value / 26) - 1;
      } while (value >= 0);
      return `\uE000${name}\uE001`;
    };

    const wrap = (pattern, className, getText = (match) => match) => {
      highlighted = highlighted.replace(pattern, (...args) => {
        const match = args[0];
        const offset = args[args.length - 2];
        const source = args[args.length - 1];
        const previous = source[offset - 1] || '';
        const next = source[offset + match.length] || '';

        if (previous === '\uE000' || next === '\uE001') {
          return match;
        }

        const token = placeholderName(tokens.length);
        tokens.push(`<span class="${className}">${getText(match, args)}</span>`);
        return token;
      });
    };

    const restoreTokens = () => {
      highlighted = highlighted.replace(/\uE000([A-Z]+)\uE001/g, (match) => {
        const index = match.slice(1, -1).split('').reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
        return tokens[index] || match;
      });
    };

    if (language === 'javascript' || language === 'java' || language === 'cpp' || language === 'python') {
      wrap(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm, 'comment');
      wrap(/(["'])(?:(?=(\\?))\2.)*?\1/g, 'string');
      wrap(/\b(function|const|let|var|if|else|for|while|switch|case|break|continue|return|async|await|class|extends|constructor|new|this|import|export|from|default|try|catch|finally|throw|public|private|protected|static|void|int|float|double|String|bool|boolean|def|class|self|None|True|False)\b/g, 'keyword');
      wrap(/\b(\d+(?:\.\d+)?)\b/g, 'number');
      wrap(/\b([a-zA-Z_][\w]*)\s*(?=\()/g, 'function');
    } else if (language === 'html') {
      wrap(/(&lt;!--[\s\S]*?--&gt;)/g, 'comment');
      highlighted = highlighted.replace(/(&lt;\/?)([a-zA-Z][\w-]*)([^&]*?)(\/?&gt;)/g, (match, open, tagName, attributes, close) => {
        const token = placeholderName(tokens.length);
        const highlightedAttributes = attributes.replace(/([a-zA-Z-:]+)(=)("[^"]*"|'[^']*')/g, '<span class="attribute">$1</span>$2<span class="string">$3</span>');
        tokens.push(`${open}<span class="keyword">${tagName}</span>${highlightedAttributes}${close}`);
        return token;
      });
    } else if (language === 'css') {
      wrap(/(\/\*[\s\S]*?\*\/)/g, 'comment');
      wrap(/([a-zA-Z0-9_.:#-]+)\s*(?=\{)/g, 'function');
      highlighted = highlighted.replace(/([a-zA-Z-]+)(\s*:\s*)([^;\n]+)/g, (match, property, separator, value) => {
        const token = placeholderName(tokens.length);
        tokens.push(`<span class="keyword">${property}</span>${separator}<span class="string">${value}</span>`);
        return token;
      });
      wrap(/\b(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw)?\b/g, 'number');
    } else if (language === 'json') {
      wrap(/"([^"]+)":/g, 'keyword');
      wrap(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, 'string');
      wrap(/\b(true|false|null)\b/g, 'keyword');
      wrap(/\b(-?\d+(?:\.\d+)?)\b/g, 'number');
    } else if (language === 'bash') {
      wrap(/(#.*$)/gm, 'comment');
      wrap(/(["'])(?:(?=(\\?))\2.)*?\1/g, 'string');
      wrap(/\b(echo|cd|ls|mkdir|rm|grep|awk|sed|curl|wget|cat|sudo|ssh|scp|exit|if|then|else|fi|for|while|do|done)\b/g, 'keyword');
      wrap(/\$\w+/g, 'function');
    }

    restoreTokens();
    return highlighted;
  };

  const detectAndHighlightCodeBlocks = (text) => {
    if (!text) return '';

    let result = text;

    // Detect markdown-style code blocks (```language\ncode\n```)
    const markdownCodeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    result = result.replace(markdownCodeBlockRegex, (match, lang, code) => {
      const normalizedLang = String(lang || '').trim().toLowerCase();
      const detectedLang = languageAliases[normalizedLang] || normalizedLang || detectLanguage(code);
      const highlighted = highlightCode(code.trim(), detectedLang);
      return `<pre class="code-block" data-language="${detectedLang}"><code>${highlighted}</code></pre>`;
    });

    // Detect indented code blocks (4+ spaces at start of consecutive lines)
    const lines = result.split('\n');
    let inCodeBlock = false;
    let codeBlockLines = [];
    let processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isIndented = /^    /.test(line) || /^\t/.test(line);
      const isBlank = line.trim() === '';

      if (isIndented || (inCodeBlock && isBlank)) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLines = [];
        }
        codeBlockLines.push(isBlank ? '' : line.replace(/^    |^\t/, ''));
      } else {
        if (inCodeBlock && codeBlockLines.length > 0) {
          // End of code block
          const code = codeBlockLines.join('\n');
          const detectedLang = detectLanguage(code);
          const highlighted = highlightCode(code, detectedLang);
          processedLines.push(`<pre class="code-block" data-language="${detectedLang}"><code>${highlighted}</code></pre>`);
          codeBlockLines = [];
          inCodeBlock = false;
        }
        processedLines.push(line);
      }
    }

    // Handle remaining code block at end
    if (inCodeBlock && codeBlockLines.length > 0) {
      const code = codeBlockLines.join('\n');
      const detectedLang = detectLanguage(code);
      const highlighted = highlightCode(code, detectedLang);
      processedLines.push(`<pre class="code-block" data-language="${detectedLang}"><code>${highlighted}</code></pre>`);
    }

    result = processedLines.join('\n');

    // Sequential counter shared across all rendered sections so each checkbox in
    // the preview maps back to the Nth task-list line in the source body.
    let checkboxIndex = 0;

    const renderMarkdownText = (section) => {
      const inlineCodeTokens = [];
      const placeholder = (index) => `${index}`;
      let rendered = escapeHtml(section);

      rendered = rendered.replace(/`([^`]+)`/g, (match, code) => {
        const token = placeholder(inlineCodeTokens.length);
        inlineCodeTokens.push(`<code class="inline-code">${code}</code>`);
        return token;
      });

      rendered = rendered.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (match, label, url) => (
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      ));

      // Task-list items (- [ ] / - [x]) become clickable checkboxes. Each gets a
      // sequential data-check-index so a click can flip the matching source line.
      // Must run before the generic list rule below so these lines aren't also
      // captured as plain bullets.
      rendered = rendered.replace(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/gm, (match, state, text) => {
        const checked = state.toLowerCase() === 'x';
        const index = checkboxIndex;
        checkboxIndex += 1;
        return (
          `<label class="note-check-item${checked ? ' checked' : ''}" data-check-index="${index}">`
          + `<input type="checkbox" class="note-check-input"${checked ? ' checked' : ''}> `
          + `<span class="note-check-text">${text}</span></label>`
        );
      });

      rendered = rendered
        .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
        .replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');

      rendered = rendered.replace(/(?:<li>.*?<\/li>\n?)+/g, (items) => (
        `<ul>${items.replace(/\n/g, '')}</ul>`
      ));

      rendered = rendered
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>');

      return rendered.replace(/\uE100(\d+)\uE101/g, (match, index) => inlineCodeTokens[Number(index)] || match);
    };

    // Render markdown in non-code text, preserving highlighted code blocks.
    result = result.split(/(<pre class="code-block"[\s\S]*?<\/pre>)/g)
      .map((section) => {
        if (section.startsWith('<pre class="code-block"')) {
          return section;
        }
        return renderMarkdownText(section).replace(/\n/g, '<br>');
      })
      .join('');

    return result;
  };

  // Export to global scope
  window.NotesCodeHighlighter = {
    detectAndHighlightCodeBlocks,
    highlightCode,
    detectLanguage,
  };
})();
