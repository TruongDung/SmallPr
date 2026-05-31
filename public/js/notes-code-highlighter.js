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
    bash: /^\s*(#!/bin/bash|cd|ls|mkdir|rm|grep|awk|sed|curl)/m,
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
  const highlightCode = (code, language) => {
    let highlighted = code;

    // Escape HTML first
    highlighted = highlighted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply syntax highlighting based on language
    if (language === 'python' || language === 'javascript' || language === 'java') {
      // Keywords
      highlighted = highlighted.replace(
        /\b(def|class|import|from|return|if|elif|else|for|while|try|except|with|as|self|range|len|const|let|var|function|async|await|public|private|void|int)\b/g,
        '<span class="keyword">$1</span>'
      );

      // Strings (single and double quotes)
      highlighted = highlighted.replace(
        /(["'])(?:(?=(\\?))\2.)*?\1/g,
        '<span class="string">$&</span>'
      );

      // Comments
      highlighted = highlighted.replace(
        /(#.*$|\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        '<span class="comment">$1</span>'
      );

      // Numbers
      highlighted = highlighted.replace(
        /\b(\d+\.?\d*)\b/g,
        '<span class="number">$1</span>'
      );

      // Function calls
      highlighted = highlighted.replace(
        /\b([a-zA-Z_]\w*)\s*(?=\()/g,
        '<span class="function">$1</span>'
      );
    }

    return highlighted;
  };

  const detectAndHighlightCodeBlocks = (text) => {
    if (!text) return '';

    let result = text;

    // Detect markdown-style code blocks (```language\ncode\n```)
    const markdownCodeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    result = result.replace(markdownCodeBlockRegex, (match, lang, code) => {
      const detectedLang = lang || detectLanguage(code);
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

    // Convert remaining newlines to <br> for non-code text
    result = result.replace(/\n/g, '<br>');

    return result;
  };

  // Export to global scope
  window.NotesCodeHighlighter = {
    detectAndHighlightCodeBlocks,
    highlightCode,
    detectLanguage,
  };
})();
