import '../css/style.css';
import { inject } from '@vercel/analytics';
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
    fetchNewsApi,
    fetchNewsData,
    fetchGNews
} from './api.js';
import {
    generateDigestText,
    copyToClipboard,
    shareArticle
} from './utils.js';

// Initialize Analytics
inject();

// State
let currentArticles = [];
let currentQuery = '';
let isSelectionMode = false;
let selectedArticleIndices = new Set();
let isSearching = false;
let currentPage = 1;

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
    const articlesToDigest = isSelectionMode
        ? currentArticles.filter((_, idx) => selectedArticleIndices.has(idx))
        : currentArticles;

    if (articlesToDigest.length > 0) {
        const digestText = generateDigestText(articlesToDigest, currentQuery);
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
    const selected = currentArticles.filter((_, idx) => selectedArticleIndices.has(idx));
    if (selected.length > 0) {
        const digestText = generateDigestText(selected, currentQuery);
        els.digestContent.textContent = digestText;
        els.digestSection.classList.remove('hidden');
        // Scroll to digest
        els.digestSection.scrollIntoView({ behavior: 'smooth' });
    }
});

els.themeToggleBtn.addEventListener('click', toggleTheme);

if (els.loadMoreContainer) {
    // We need to attach the listener dynamically since the button might be hidden/shown
    // But actually, the button is static in HTML, just hidden.
    const btn = document.getElementById('loadMoreBtn');
    if (btn) {
        btn.addEventListener('click', loadMoreArticles);
    }
}

// --- Core Functions ---

async function performSearch(query, pushState = true, isLoadMore = false) {
    if (isSearching) {
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
        // ... (rest of params could be added here if needed for full state restoration)
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    currentQuery = query;
    isSearching = true;
    setError(null);

    if (!isLoadMore) {
        currentPage = 1;
        els.resultsGrid.classList.add('hidden');
        els.digestSection.classList.add('hidden');
        els.actionBar.classList.add('hidden');
        els.loadMoreContainer.classList.add('hidden');
        setSelectionMode(false);
        els.resultsGrid.innerHTML = ''; // Clear previous results

        // Reset counts
        ['newsapi', 'newsdata', 'gnews'].forEach(p => {
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
        // Fetch from all selected providers in parallel
        const promises = providers.map(async provider => {
            try {
                let data;
                if (provider === 'newsdata') {
                    // NewsData doesn't support simple page number pagination easily in this proxy setup without cursor storage
                    if (isLoadMore) return []; // Skip NewsData on load more for MVP
                    data = await fetchNewsData(query);
                } else if (provider === 'gnews') {
                    data = await fetchGNews(query, currentPage);
                } else {
                    data = await fetchNewsApi(query, currentPage);
                }

                // Update total count (only on first page)
                if (!isLoadMore) {
                    const countEl = document.getElementById(`count-${provider}`);
                    if (countEl && data.totalResults !== undefined) {
                        countEl.textContent = `(${data.totalResults})`;
                    }
                }

                // Tag articles
                if (data.articles) {
                    data.articles.forEach(a => a.apiSource = provider);
                }
                return data.articles || [];
            } catch (err) {
                console.error(`Failed to fetch from ${provider}:`, err);
                return [];
            }
        });

        const resultsArrays = await Promise.all(promises);
        const newArticles = mergeResults(resultsArrays);

        if (newArticles.length > 0) {
            if (isLoadMore) {
                currentArticles = [...currentArticles, ...newArticles];
                appendResults(newArticles, currentArticles.length - newArticles.length, currentQuery, isSelectionMode, selectedArticleIndices);
            } else {
                currentArticles = newArticles;
                renderResults(newArticles, currentQuery, isSelectionMode, selectedArticleIndices);
            }

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
        isSearching = false;

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
    currentPage++;
    performSearch(currentQuery, false, true);
}

function mergeResults(resultsArrays) {
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

    // Sort by Date (Newest first)
    merged.sort((a, b) => {
        return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    return merged;
}

function setSelectionMode(active) {
    isSelectionMode = active;
    selectedArticleIndices.clear();
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
    renderResults(currentArticles, currentQuery, isSelectionMode, selectedArticleIndices);
}

function toggleArticleSelection(index) {
    if (!isSelectionMode) return;

    if (selectedArticleIndices.has(index)) {
        selectedArticleIndices.delete(index);
    } else {
        selectedArticleIndices.add(index);
    }
    updateSelectionUI(selectedArticleIndices.size);

    // Update specific card UI without full re-render
    const card = document.getElementById(`article-${index}`);
    const checkbox = document.getElementById(`checkbox-${index}`);
    if (card && checkbox) {
        if (selectedArticleIndices.has(index)) {
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
