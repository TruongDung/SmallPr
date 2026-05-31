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

    const wrap = (pattern, replacement) => {
      highlighted = highlighted.replace(pattern, replacement);
    };

    if (language === 'javascript' || language === 'java' || language === 'cpp' || language === 'python') {
      wrap(/\b(function|const|let|var|if|else|for|while|switch|case|break|continue|return|async|await|class|extends|constructor|new|this|import|export|from|default|try|catch|finally|throw|public|private|protected|static|void|int|float|double|String|bool|boolean|def|class|self|None|True|False)\b/g, '<span class="keyword">$1</span>');
      wrap(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
      wrap(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="comment">$1</span>');
      wrap(/\b(\d+(?:\.\d+)?)\b/g, '<span class="number">$1</span>');
      wrap(/\b([a-zA-Z_][\w]*)\s*(?=\()/g, '<span class="function">$1</span>');
    } else if (language === 'html') {
      wrap(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>');
      wrap(/(&lt;\/?)([a-zA-Z][\w-]*)([^&]*?)(\/?&gt;)/g, '$1<span class="keyword">$2</span>$3$4');
      wrap(/([a-zA-Z-:]+)(=)("[^"]*"|'[^']*')/g, '<span class="attribute">$1</span>$2<span class="string">$3</span>');
    } else if (language === 'css') {
      wrap(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
      wrap(/([a-zA-Z0-9_.:#-]+)\s*(?=\{)/g, '<span class="function">$1</span>');
      wrap(/([a-zA-Z-]+)(\s*:\s*)([^;\n]+)/g, '<span class="keyword">$1</span>$2<span class="string">$3</span>');
      wrap(/\b(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw)?\b/g, '<span class="number">$1$2</span>');
    } else if (language === 'json') {
      wrap(/"([^"]+)":/g, '<span class="keyword">"$1"</span>:');
      wrap(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, '<span class="string">"$1"</span>');
      wrap(/\b(true|false|null)\b/g, '<span class="keyword">$1</span>');
      wrap(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="number">$1</span>');
    } else if (language === 'bash') {
      wrap(/(#.*$)/gm, '<span class="comment">$1</span>');
      wrap(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>');
      wrap(/\b(echo|cd|ls|mkdir|rm|grep|awk|sed|curl|wget|cat|sudo|ssh|scp|exit|if|then|else|fi|for|while|do|done)\b/g, '<span class="keyword">$1</span>');
      wrap(/\$\w+/g, '<span class="function">$&</span>');
    }

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

      if (isIndented) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLines = [];
        }
        codeBlockLines.push(line.replace(/^    |^\t/, ''));
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

    // Process inline code (`code`)
    result = result.replace(/`([^`]+)`/g, (match, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code class="inline-code">${escaped}</code>`;
    });

    // Convert remaining newlines to <br> for non-code text, but preserve newlines inside code blocks.
    result = result.split(/(<pre class="code-block"[\s\S]*?<\/pre>)/g)
      .map((section) => {
        if (section.startsWith('<pre class="code-block"')) {
          return section;
        }
        return section.replace(/\n/g, '<br>');
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
