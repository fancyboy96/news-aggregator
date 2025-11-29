import '../css/style.css';
import { inject } from '@vercel/analytics';
import { registerSW } from 'virtual:pwa-register';
import { store } from './store.js';

// Register Service Worker
const updateSW = registerSW({
    onNeedRefresh() {
        // Show a toast or banner to the user to reload
        if (confirm('New content available. Reload?')) {
            updateSW(true);
        }
    },
    onOfflineReady() {
        console.log('App is ready to work offline');
    },
});
import {
    els,
    initTheme,
    toggleTheme,
    updateProviderUI,
    setLoading,
    setError,
    renderResults,
    appendResults,
    updateSelectionUI
} from './ui.js';
import {
    fetchNews
} from './api.js';
import {
    generateDigestText,
    copyToClipboard,
    shareArticle
} from './utils.js';

// Initialize Analytics
inject();

// Make shareArticle globally available for onclick handlers in HTML
window.shareArticle = shareArticle;
window.toggleArticleSelection = toggleArticleSelection;

// --- Initialization ---
function init() {
    initTheme();
    // Restore state from URL if present
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (query) {
        // Restore inputs
        els.searchInput.value = query;

        if (params.has('sortBy')) els.sortByInput.value = params.get('sortBy');
        if (params.has('language')) els.languageInput.value = params.get('language');
        if (params.has('country')) els.countryInput.value = params.get('country');
        if (params.has('pageSize')) els.pageSizeInput.value = params.get('pageSize');
        if (params.has('from')) els.fromInput.value = params.get('from');
        if (params.has('to')) els.toInput.value = params.get('to');
        if (params.has('domains')) els.domainsInput.value = params.get('domains');
        if (params.has('excludeDomains')) els.excludeDomainsInput.value = params.get('excludeDomains');

        // Restore providers
        if (params.has('provider')) {
            const providers = params.get('provider').split(',');
            els.providerCheckboxes.forEach(cb => {
                cb.checked = providers.includes(cb.value);
            });
        }

        // Restore "Search In" checkboxes
        if (params.has('searchIn')) {
            const searchInValues = params.get('searchIn').split(',');
            document.querySelectorAll('input[name="searchIn"]').forEach(cb => {
                cb.checked = searchInValues.includes(cb.value);
            });
        }

        updateProviderUI();

        // Auto-trigger search
        performSearch(query, false); // false = don't push state again on initial load
    } else {
        updateProviderUI();
    }
}

// --- Event Listeners ---
els.providerCheckboxes.forEach(cb => {
    cb.addEventListener('change', updateProviderUI);
});

els.toggleFiltersBtn.addEventListener('click', () => {
    els.filterPanel.classList.toggle('hidden');
});

els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = els.searchInput.value.trim();
    if (query) {
        performSearch(query, true);
    }
});

els.copyDigestBtn.addEventListener('click', () => {
    const state = store.get('articles'); // Get all articles
    const selectedIndices = store.get('selectedArticleIndices');
    const isSelectionMode = store.get('isSelectionMode');
    const query = store.get('query');

    const articlesToDigest = isSelectionMode
        ? state.filter((_, idx) => selectedIndices.has(idx))
        : state;

    if (articlesToDigest.length > 0) {
        const digestText = generateDigestText(articlesToDigest, query);
        copyToClipboard(digestText);
    }
});

// Selection Mode Listeners
els.startSelectionBtn.addEventListener('click', () => {
    setSelectionMode(true);
});

els.cancelSelectionBtn.addEventListener('click', () => {
    setSelectionMode(false);
});

els.generateDigestBtn.addEventListener('click', () => {
    const state = store.get('articles');
    const selectedIndices = store.get('selectedArticleIndices');
    const query = store.get('query');

    const selected = state.filter((_, idx) => selectedIndices.has(idx));
    if (selected.length > 0) {
        const digestText = generateDigestText(selected, query);
        els.digestContent.textContent = digestText;
        els.digestSection.classList.remove('hidden');
        // Scroll to digest
        els.digestSection.scrollIntoView({ behavior: 'smooth' });
    }
});

els.themeToggleBtn.addEventListener('click', toggleTheme);

if (els.loadMoreContainer) {
    const btn = document.getElementById('loadMoreBtn');
    if (btn) {
        btn.addEventListener('click', loadMoreArticles);
    }
}

// --- Core Functions ---

async function performSearch(query, pushState = true, isLoadMore = false) {
    if (store.get('isSearching')) {
        console.log('Search already in progress, skipping...');
        return;
    }

    const providers = Array.from(els.providerCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    if (providers.length === 0) {
        setError('Please select at least one news provider.');
        els.resultsGrid.classList.add('hidden');
        els.actionBar.classList.add('hidden');
        els.digestSection.classList.add('hidden');
        els.loadMoreContainer.classList.add('hidden');
        return;
    }

    // Update URL State (only for new searches)
    if (pushState && !isLoadMore) {
        const params = new URLSearchParams();
        params.set('q', query);
        params.set('provider', providers.join(','));
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    store.set({ query, isSearching: true });
    setError(null);

    if (!isLoadMore) {
        store.set({ currentPage: 1 });
        els.resultsGrid.classList.add('hidden');
        els.digestSection.classList.add('hidden');
        els.actionBar.classList.add('hidden');
        els.loadMoreContainer.classList.add('hidden');
        setSelectionMode(false);
        els.resultsGrid.innerHTML = ''; // Clear previous results

        // Reset counts
        ['newsapi', 'newsdata', 'gnews', 'thenewsapi', 'marketaux'].forEach(p => {
            const el = document.getElementById(`count-${p}`);
            if (el) el.textContent = '';
        });
    } else {
        // Load More State
        const btn = document.getElementById('loadMoreBtn');
        btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px;"></div> Loading...';
        btn.disabled = true;
    }

    if (!isLoadMore) setLoading(true);

    try {
        const currentPage = store.get('currentPage');

        // Gather common options
        const options = {
            page: currentPage,
            sortBy: els.sortByInput.value,
            language: els.languageInput.value,
            country: els.countryInput.value,
            pageSize: els.pageSizeInput.value,
            from: els.fromInput.value,
            to: els.toInput.value,
            domains: els.domainsInput.value.trim(),
            excludeDomains: els.excludeDomainsInput.value.trim(),
            searchIn: Array.from(document.querySelectorAll('input[name="searchIn"]:checked'))
                .map(cb => cb.value)
                .join(','),
            isLoadMore
        };

        // Fetch from all selected providers in parallel
        const promises = providers.map(async providerName => {
            try {
                const data = await fetchNews(providerName, query, options);

                // Update total count (only on first page)
                if (!isLoadMore) {
                    const countEl = document.getElementById(`count-${providerName}`);
                    if (countEl && data.totalResults !== undefined) {
                        countEl.textContent = `(${data.totalResults})`;
                    }
                }

                return data.articles || [];
            } catch (err) {
                console.error(`Failed to fetch from ${providerName}:`, err);
                return [];
            }
        });

        const resultsArrays = await Promise.all(promises);

        // If Load More, include current articles in the merge to re-sort everything
        let allResultsArrays = resultsArrays;
        if (isLoadMore) {
            const currentArticles = store.get('articles');
            // currentArticles is a flat array, resultsArrays is array of arrays
            // We wrap currentArticles in an array so it's treated as one "batch" to be flattened
            allResultsArrays = [currentArticles, ...resultsArrays];
        }

        const newArticles = mergeResults(allResultsArrays, options.sortBy);

        if (newArticles.length > 0) {
            store.set({ articles: newArticles });
            // Always render full results to ensure correct order
            renderResults(newArticles, store.get('query'), store.get('isSelectionMode'), store.get('selectedArticleIndices'));

            els.resultsGrid.classList.remove('hidden');

            els.resultsGrid.classList.remove('hidden');
            els.actionBar.classList.remove('hidden');
            els.loadMoreContainer.classList.remove('hidden');
        } else {
            if (!isLoadMore) setError('No articles found matching your criteria.');
            else {
                // No more results
                const btn = document.getElementById('loadMoreBtn');
                btn.textContent = 'No more stories';
                btn.disabled = true;
            }
        }

    } catch (err) {
        console.error('Search failed:', err);
        if (!isLoadMore) setError(err.message || 'An unexpected error occurred.');
    } finally {
        setLoading(false);
        store.set({ isSearching: false });

        // Reset Load More Button
        if (isLoadMore) {
            const btn = document.getElementById('loadMoreBtn');
            btn.innerHTML = `<span>Load More Stories</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>`;
            btn.disabled = false;
        }
    }
}

function loadMoreArticles() {
    const nextPage = store.get('currentPage') + 1;
    store.set({ currentPage: nextPage });
    performSearch(store.get('query'), false, true);
}

function mergeResults(resultsArrays, sortBy = 'publishedAt') {
    // Flatten array of arrays
    let merged = resultsArrays.flat();
    console.log('Merged raw results:', merged.length);

    // Remove duplicates (by Normalized URL or Title)
    const seen = new Set();
    merged = merged.filter(article => {
        if (!article.url && !article.title) return false;

        // Normalize URL: remove query parameters and trailing slashes
        let urlKey = '';
        if (article.url) {
            try {
                const urlObj = new URL(article.url);
                urlKey = urlObj.origin + urlObj.pathname;
                // Remove trailing slash
                if (urlKey.endsWith('/')) urlKey = urlKey.slice(0, -1);
            } catch (e) {
                urlKey = article.url;
            }
        }

        // Normalize Title: lowercase, remove special chars
        const titleKey = article.title ? article.title.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

        // Check if we've seen this article
        // We prefer URL matching, but fallback to title if URL is missing or generic
        const key = urlKey || titleKey;

        // Also check titleKey specifically if we have one, to catch same article with different URLs
        if (titleKey && seen.has(titleKey)) return false;
        if (urlKey && seen.has(urlKey)) return false;

        if (urlKey) seen.add(urlKey);
        if (titleKey) seen.add(titleKey);

        return true;
    });
    console.log('Deduped results:', merged.length);

    // Sort by Date (Newest first) if requested or default
    if (!sortBy || sortBy === 'publishedAt') {
        merged.sort((a, b) => {
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });
    }
    // For 'popularity' or 'relevancy', we keep the provider's order (interleaved)
    // or we could try to sort by some other metric if available.
    // But since we don't have a unified score, we leave it as is (which is roughly interleaved).

    return merged;
}

function setSelectionMode(active) {
    store.set({ isSelectionMode: active });
    store.clearSelection();
    updateSelectionUI(0);

    if (active) {
        els.selectionToolbar.classList.remove('hidden');
        els.actionBar.classList.add('hidden');
        els.digestSection.classList.add('hidden'); // Hide digest if open
        document.body.classList.add('selection-mode');
    } else {
        els.selectionToolbar.classList.add('hidden');
        els.actionBar.classList.remove('hidden');
        els.digestSection.classList.add('hidden'); // Hide digest when cancelling
        document.body.classList.remove('selection-mode');
    }
    // Re-render to show/hide checkboxes
    renderResults(store.get('articles'), store.get('query'), active, store.get('selectedArticleIndices'));
}

function toggleArticleSelection(index) {
    if (!store.get('isSelectionMode')) return;

    store.toggleSelection(index);
    const selectedIndices = store.get('selectedArticleIndices');
    updateSelectionUI(selectedIndices.size);

    // Update specific card UI without full re-render
    const card = document.getElementById(`article-${index}`);
    const checkbox = document.getElementById(`checkbox-${index}`);
    if (card && checkbox) {
        if (selectedIndices.has(index)) {
            card.classList.add('selected');
            checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            checkbox.checked = false;
        }
    }
}

// Run Init
init();
