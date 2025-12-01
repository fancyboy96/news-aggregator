export function highlightText(text, query) {
    if (!text || !query) return text || '';

    let regex;
    const isExactPhrase = query.startsWith('"') && query.endsWith('"');

    if (isExactPhrase) {
        // Exact phrase matching: strip quotes and match exact sequence
        const phrase = query.slice(1, -1);
        if (!phrase) return text;
        const safePhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundaries if the phrase starts/ends with word characters
        regex = new RegExp(`(${safePhrase})`, 'gi');
    } else {
        // Multi-word matching: split into words
        const words = query.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return text;

        // Escape and sort by length desc
        const safeWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .sort((a, b) => b.length - a.length);

        const pattern = safeWords.map(w => {
            // Check if word starts/ends with alphanumeric
            const start = /^\w/.test(w) ? '\\b' : '';
            const end = /\w$/.test(w) ? '\\b' : '';
            return `${start}${w}${end}`;
        }).join('|');

        regex = new RegExp(`(${pattern})`, 'gi');
    }

    return text.replace(regex, '<mark class="bg-indigo-100 text-indigo-900 rounded-sm px-0.5">$1</mark>');
}

export function getSnippet(content, query) {
    if (!content || !query) return null;
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) return null;

    // Extract window around the match
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    let snippet = content.substring(start, end);

    // Add ellipsis
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return highlightText(snippet, query);
}

export function generateDigest(articles, query) {
    const date = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 1. Generate Plain Text (Fallback)
    const separator = "=".repeat(60);
    const divider = "-".repeat(60);
    let text = `${separator}\nNEWS DIGEST\n${separator}\n`;
    text += `Topic: ${query}\n`;
    text += `Generated: ${date}\n`;
    text += `${separator}\n\n`;

    articles.forEach((article, index) => {
        text += `${index + 1}. ${article.title}\n`;
        text += `   Source: ${article.source.name}\n`;
        text += `   Link: ${article.url}\n`;
        if (article.description) {
            text += `   Summary: ${article.description.replace(/\n/g, ' ')}\n`;
        }
        text += `\n${divider}\n\n`;
    });
    text += `End of Digest\n${separator}`;

    // 2. Generate HTML (Rich Text for Email)
    let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
            <h1 style="color: #1e293b; margin: 0 0 8px; font-size: 24px; letter-spacing: -0.5px;">News Digest</h1>
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                Topic: <strong style="color: #475569;">${query || 'Top Stories'}</strong> • ${date}
            </p>
        </div>
    `;

    articles.forEach(article => {
        const domain = new URL(article.url).hostname.replace('www.', '');

        html += `
        <div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #f1f5f9;">
            ${article.urlToImage ? `
            <div style="margin-bottom: 16px;">
                <img src="${article.urlToImage}" alt="Article thumbnail" style="width: 100%; max-height: 240px; object-fit: cover; border-radius: 8px; display: block; background-color: #f1f5f9;" />
            </div>` : ''}
            
            <h2 style="margin: 0 0 10px; font-size: 18px; line-height: 1.4;">
                <a href="${article.url}" style="color: #0f172a; text-decoration: none; font-weight: 700;">${article.title}</a>
            </h2>
            
            <div style="margin-bottom: 12px; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                ${article.source.name} <span style="color: #cbd5e1;">•</span> ${domain}
            </div>
            
            ${article.description ? `
            <p style="color: #475569; line-height: 1.6; margin: 0 0 16px; font-size: 15px;">
                ${article.description}
            </p>` : ''}
            
            <div>
                <a href="${article.url}" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; border: 1px solid #e2e8f0;">
                    Read on ${domain} &rarr;
                </a>
            </div>
        </div>
        `;
    });

    html += `
        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
            Generated by Currents
        </div>
    </div>
    `;

    return { text, html };
}

export async function shareArticle(url, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    try {
        await navigator.clipboard.writeText(url);
        showNotification('Link copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy: ', err);
        showNotification('Failed to copy link.', true);
    }
}

export async function copyToClipboard(content) {
    // Handle both string (legacy) and object {text, html} input
    const text = typeof content === 'string' ? content : content.text;
    const html = typeof content === 'object' ? content.html : null;

    if (!navigator.clipboard) {
        // Fallback for older browsers (Text only)
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('Copied to clipboard (Text only)!');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('Failed to copy to clipboard.');
        }
        document.body.removeChild(textArea);
        return;
    }

    try {
        if (html && typeof ClipboardItem !== 'undefined') {
            // Write both text/plain and text/html
            const textBlob = new Blob([text], { type: 'text/plain' });
            const htmlBlob = new Blob([html], { type: 'text/html' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': textBlob,
                    'text/html': htmlBlob
                })
            ]);
        } else {
            // Text only
            await navigator.clipboard.writeText(text);
        }
        showNotification('Digest copied! Paste in email to see rich text.');
    } catch (err) {
        console.error('Async: Could not copy text: ', err);
        // Fallback to text-only writeText if ClipboardItem fails (e.g. Firefox sometimes restricts it)
        try {
            await navigator.clipboard.writeText(text);
            showNotification('Copied plain text (Rich text failed).');
        } catch (retryErr) {
            alert('Failed to copy to clipboard.');
        }
    }
}
