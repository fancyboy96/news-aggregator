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

export function generateDigestText(articles, query) {
    const date = new Date().toLocaleString('en-US');
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
            text += `   Summary: ${article.description.replace(/\n/g, ' ')}\n`; // Flatten description
        }
        text += `\n${divider}\n\n`;
    });

    text += `End of Digest\n${separator}`;
    return text;
}

export function showNotification(message, isError = false) {
    // Remove existing toast if any
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-white font-medium text-sm z-50 animate-fade-in transition-all duration-300 ${isError ? 'bg-red-500' : 'bg-slate-900 dark:bg-white dark:text-slate-900'}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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

export function copyToClipboard(text) {
    // Fallback for older browsers or non-secure contexts
    if (!navigator.clipboard) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";  // Avoid scrolling to bottom
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showNotification('Copied to clipboard!');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            alert('Failed to copy to clipboard.');
        }
        document.body.removeChild(textArea);
        return;
    }

    // Modern API
    navigator.clipboard.writeText(text).then(function () {
        showNotification('Copied to clipboard!');
    }, function (err) {
        console.error('Async: Could not copy text: ', err);
        alert('Failed to copy to clipboard.');
    });
}
