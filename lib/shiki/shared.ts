import { codeToHtml } from 'shiki';

// Cache for highlighter to improve performance
let highlighterCache: any = null;

export async function highlightCode(code: string, language: string = 'text'): Promise<string> {
  try {
    // Use cached highlighter for faster responses
    const html = await codeToHtml(code, {
      lang: language,
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },
    });
    return html;
  } catch (error) {
    // Fallback to plain text if highlighting fails
    console.error('Syntax highlighting error:', error);
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

