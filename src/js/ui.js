import { highlightText, getSnippet } from './utils.js';

export const els = {
    providerCheckboxes: document.querySelectorAll('.provider-checkbox'),
    currentProviderDisplay: document.getElementById('currentProviderDisplay'),
    searchForm: document.getElementById('searchForm'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
    filterPanel: document.getElementById('filterPanel'),
    sortByInput: document.getElementById('sortByInput'),
    languageInput: document.getElementById('languageInput'),
    pageSizeInput: document.getElementById('pageSizeInput'),
    fromInput: document.getElementById('fromInput'),
    toInput: document.getElementById('toInput'),
    domainsInput: document.getElementById('domainsInput'),
    excludeDomainsInput: document.getElementById('excludeDomainsInput'),
    errorMessage: document.getElementById('errorMessage'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    resultsGrid: document.getElementById('resultsGrid'),
    digestSection: document.getElementById('digestSection'),
    digestContent: document.getElementById('digestContent'),
    copyDigestBtn: document.getElementById('copyDigestBtn'),
    toast: document.getElementById('toast'),
    // New Elements
    actionBar: document.getElementById('actionBar'),
    startSelectionBtn: document.getElementById('startSelectionBtn'),
    selectionToolbar: document.getElementById('selectionToolbar'),
    cancelSelectionBtn: document.getElementById('cancelSelectionBtn'),
    generateDigestBtn: document.getElementById('generateDigestBtn'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    selectionCount: document.getElementById('selectionCount'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sunIcon: document.getElementById('sunIcon'),
    moonIcon: document.getElementById('moonIcon')
};

export function updateProviderUI() {
    const selected = Array.from(els.providerCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.nextElementSibling.textContent);

    if (selected.length === 0) {
        els.currentProviderDisplay.textContent = 'Provider: None selected';
    } else {
        els.currentProviderDisplay.textContent = `Provider: ${selected.join(', ')}`;
    }
}

export function updateThemeIcon(isDark) {
    if (isDark) {
        els.sunIcon.classList.remove('hidden');
        els.moonIcon.classList.add('hidden');
    } else {
        els.sunIcon.classList.add('hidden');
        els.moonIcon.classList.remove('hidden');
    }
}

export function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcon(false);
    }
}

export function setLoading(isLoading) {
    if (isLoading) {
        els.loadingIndicator.classList.remove('hidden');
        els.searchBtn.disabled = true;
        els.searchBtn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px;"></div> Searching...';
    } else {
        els.loadingIndicator.classList.add('hidden');
        els.searchBtn.disabled = false;
        els.searchBtn.innerHTML = '<span>Search</span>';
    }
}

export function setError(msg) {
    if (msg) {
        els.errorMessage.textContent = msg;
        els.errorMessage.classList.remove('hidden');
    } else {
        els.errorMessage.classList.add('hidden');
    }
}

export function updateSelectionUI(count) {
    els.selectionCount.textContent = count;
    els.generateDigestBtn.disabled = count === 0;
    els.generateDigestBtn.textContent = count > 0 ? `Generate Digest (${count})` : 'Generate Digest';
}

export function renderResults(articles, query, isSelectionMode, selectedIndices) {
    console.log('Rendering articles:', articles.length);
    els.resultsGrid.innerHTML = generateArticlesHtml(articles, 0, query, isSelectionMode, selectedIndices);
}

export function appendResults(articles, startIndex, query, isSelectionMode, selectedIndices) {
    const html = generateArticlesHtml(articles, startIndex, query, isSelectionMode, selectedIndices);
    els.resultsGrid.insertAdjacentHTML('beforeend', html);
}

function generateArticlesHtml(articles, startIndex, query, isSelectionMode, selectedIndices) {
    return articles.map((article, i) => {
        const index = startIndex + i;
        const date = new Date(article.publishedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const image = article.urlToImage || 'https://placehold.co/600x400/f1f5f9/94a3b8?text=No+Image';

        // Apply highlighting
        const titleHtml = highlightText(article.title, query);
        const descHtml = highlightText(article.description, query);

        // Check for content snippet
        let contentSnippetHtml = '';
        if (article.content) {
            const snippet = getSnippet(article.content, query);
            if (snippet) {
                contentSnippetHtml = `<div class="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-500 dark:text-slate-400 font-mono border border-slate-100 dark:border-slate-700">
                    <span class="font-bold text-indigo-400 uppercase tracking-wider text-[10px] mr-2">Match:</span>
                    ${snippet}
                </div>`;
            }
        }

        const isSelected = selectedIndices.has(index);
        const selectionOverlay = isSelectionMode ? `
            <div class="absolute top-4 right-4 z-20">
                <input type="checkbox" id="checkbox-${index}" class="w-6 h-6 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm selection-checkbox" ${isSelected ? 'checked' : ''}>
            </div>
            <div class="absolute inset-0 bg-indigo-500/5 backdrop-blur-[1px] pointer-events-none transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}" id="overlay-${index}"></div>
        ` : '';

        const clickHandler = isSelectionMode ? `onclick="window.toggleArticleSelection(${index})"` : '';

        // Source Badge Color
        const sourceColorClass = article.apiSource === 'newsdata' ? 'bg-orange-100 text-orange-700' :
            (article.apiSource === 'gnews' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700');

        return `
            <article id="article-${index}" class="article-card group bg-white dark:bg-slate-800 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 overflow-hidden flex flex-col h-full relative border border-slate-100 dark:border-slate-700 ${isSelected ? 'selected' : ''}" ${clickHandler}>
                ${selectionOverlay}
                <div class="h-56 overflow-hidden relative bg-slate-100 dark:bg-slate-700">
                     <img src="${image}" alt="${article.title}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" onerror="this.onerror=null;this.src='https://placehold.co/600x400/f1f5f9/94a3b8?text=No+Image'">
                     <div class="absolute top-4 left-4 flex gap-2">
                        <span class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border border-white/50 dark:border-slate-700/50">
                            ${article.source.name || 'Unknown Source'}
                        </span>
                     </div>
                </div>
                <div class="p-6 flex-1 flex flex-col">
                    <div class="flex justify-between items-center mb-3">
                        <span class="text-xs font-medium text-slate-400 dark:text-slate-500">${date}</span>
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sourceColorClass}">
                            ${article.apiSource === 'newsdata' ? 'NewsData' : (article.apiSource === 'gnews' ? 'GNews' : 'NewsAPI')}
                        </span>
                    </div>
                    
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-3 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <a href="${article.url}" target="_blank" class="focus:outline-none ${isSelectionMode ? 'pointer-events-none' : ''}">
                            ${titleHtml}
                        </a>
                    </h3>
                    
                    <p class="text-slate-600 dark:text-slate-300 text-sm mb-6 flex-1 line-clamp-3 leading-relaxed">
                        ${descHtml || 'No description available.'}
                    </p>
                    
                    ${contentSnippetHtml}
                    
                    <div class="mt-auto pt-4 border-t border-slate-50 dark:border-slate-700 flex justify-between items-center">
                        <a href="${article.url}" target="_blank" class="text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 group/link ${isSelectionMode ? 'pointer-events-none opacity-50' : ''}">
                            Read full story 
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transform group-hover/link:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </a>
                        <button onclick="window.shareArticle('${article.url}', event)" class="text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ${isSelectionMode ? 'pointer-events-none opacity-50' : ''}" title="Copy Link">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}
