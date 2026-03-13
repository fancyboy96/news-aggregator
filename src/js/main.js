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
    updateSelectionUI,
    showWarning,
    renderTrendingTopics,
    renderCoveragePulse
} from './ui.js';
import {
    fetchNews
} from './api.js';
import {
    generateDigest,
    copyToClipboard,
    shareArticle,
    showNotification
} from './utils.js';

// Initialize Analytics
inject();

// Make shareArticle globally available for onclick handlers in HTML
window.shareArticle = shareArticle;
window.toggleArticleSelection = toggleArticleSelection;

import { CountrySelector } from './components/country-selector.js';
let countrySelector;

// --- Initialization ---
function init() {
    initTheme();

    // Init Country Selector
    countrySelector = new CountrySelector(els.countrySelectorContainer);

    // Restore state from URL if present
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (query) {
        // Restore inputs
        els.searchInput.value = query;

        if (params.has('sortBy')) els.sortByInput.value = params.get('sortBy');
        if (params.has('category')) els.categoryInput.value = params.get('category');
        if (params.has('language')) els.languageInput.value = params.get('language');
        if (params.has('country')) {
            const countries = params.get('country').split(',');
            countrySelector.setValue(countries);
        }
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

    // Fetch trending topics in the background (non-blocking)
    setTimeout(fetchAndRenderTrending, 200);
}

// --- Event Listeners ---
els.providerCheckboxes.forEach(cb => {
    cb.addEventListener('change', updateProviderUI);
});

els.toggleFiltersBtn.addEventListener('click', () => {
    els.filterPanel.classList.toggle('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
    if (els.browseTopicsBtn) {
        els.browseTopicsBtn.addEventListener('click', () => {
            els.quickCategories.classList.toggle('hidden');
            els.quickCategories.classList.toggle('flex');
            // Rotate icon
            const icon = els.browseTopicsBtn.querySelector('svg');
            if (els.quickCategories.classList.contains('hidden')) {
                icon.style.transform = 'rotate(0deg)';
            } else {
                icon.style.transform = 'rotate(180deg)';
            }
        });
    }
});

els.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = els.searchInput.value.trim();
    const category = els.categoryInput.value;

    if (query || category) {
        performSearch(query, true);
    } else {
        setError('Please enter a search term or select a category.');
    }
});

// Quick Category Buttons
document.querySelectorAll('.quick-category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        els.categoryInput.value = category;
        els.searchInput.value = ''; // Clear search input
        performSearch('', true);
    });
});

els.copyDigestBtn.addEventListener('click', () => {
    // Method 1: Try to copy the visible content directly (Best for Rich Text)
    if (!els.digestSection.classList.contains('hidden') && els.digestContent.innerHTML) {
        try {
            const range = document.createRange();
            range.selectNode(els.digestContent);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);

            const successful = document.execCommand('copy');
            window.getSelection().removeAllRanges();

            if (successful) {
                showNotification('Digest copied to clipboard!');
                return;
            }
        } catch (e) {
            console.error('Direct copy failed, trying fallback:', e);
        }
    }

    // Method 2: Fallback to generating and copying (e.g. if preview hidden)
    const state = store.get('articles');
    const selectedIndices = store.get('selectedArticleIndices');
    const isSelectionMode = store.get('isSelectionMode');
    const query = store.get('query');

    const articlesToDigest = isSelectionMode
        ? state.filter((_, idx) => selectedIndices.has(idx))
        : state;

    if (articlesToDigest.length > 0) {
        const digestContent = generateDigest(articlesToDigest, query);
        copyToClipboard(digestContent);
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
        const digest = generateDigest(selected, query);

        // Render HTML preview
        els.digestContent.innerHTML = digest.html;

        // Remove text-specific classes for rich preview
        els.digestContent.classList.remove('whitespace-pre-wrap', 'font-mono');

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

// App Logo Reset
if (els.appLogo) {
    els.appLogo.addEventListener('click', () => {
        // 1. Clear Inputs
        els.searchInput.value = '';
        els.categoryInput.value = '';
        els.sortByInput.value = 'popularity';
        els.languageInput.value = 'en';
        els.pageSizeInput.value = '20';
        els.fromInput.value = '';
        els.toInput.value = '';
        els.domainsInput.value = '';
        els.excludeDomainsInput.value = '';

        // Reset Country
        if (countrySelector) countrySelector.setValue([]);

        // Reset Providers (all checked by default)
        els.providerCheckboxes.forEach(cb => cb.checked = true);
        updateProviderUI();

        // Reset Search In (all checked by default)
        document.querySelectorAll('input[name="searchIn"]').forEach(cb => cb.checked = true);

        // 2. Clear Store
        store.set({
            query: '',
            articles: [],
            currentPage: 1,
            isSearching: false,
            isSelectionMode: false,
            selectedArticleIndices: new Set(),
            providerCursors: {}
        });

        // 3. Reset UI
        els.resultsGrid.innerHTML = '';
        els.resultsGrid.classList.add('hidden');
        els.actionBar.classList.add('hidden');
        els.digestSection.classList.add('hidden');
        els.loadMoreContainer.classList.add('hidden');
        els.selectionToolbar.classList.add('hidden');
        els.errorMessage.classList.add('hidden');
        els.coveragePulse.classList.add('hidden');

        // Reset counts
        ['newsapi', 'newsdata', 'gnews', 'thenewsapi', 'marketaux'].forEach(p => {
            const el = document.getElementById(`count-${p}`);
            if (el) el.textContent = '';
        });

        // 4. Clear URL
        const newUrl = window.location.pathname;
        window.history.pushState({ path: newUrl }, '', newUrl);
    });
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

        if (els.categoryInput.value) params.set('category', els.categoryInput.value);
        if (els.sortByInput.value) params.set('sortBy', els.sortByInput.value);
        if (els.languageInput.value) params.set('language', els.languageInput.value);

        const countries = countrySelector.getValue();
        if (countries.length > 0) params.set('country', countries.join(','));

        if (els.pageSizeInput.value) params.set('pageSize', els.pageSizeInput.value);
        if (els.fromInput.value) params.set('from', els.fromInput.value);
        if (els.toInput.value) params.set('to', els.toInput.value);
        if (els.domainsInput.value) params.set('domains', els.domainsInput.value);
        if (els.excludeDomainsInput.value) params.set('excludeDomains', els.excludeDomainsInput.value);

        const searchIn = Array.from(document.querySelectorAll('input[name="searchIn"]:checked'))
            .map(cb => cb.value)
            .join(',');
        if (searchIn) params.set('searchIn', searchIn);

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }

    store.set({ query, isSearching: true });
    setError(null);

    if (!isLoadMore) {
        store.set({ currentPage: 1, providerCursors: {} });
        els.resultsGrid.classList.add('hidden');
        els.digestSection.classList.add('hidden');
        els.actionBar.classList.add('hidden');
        els.loadMoreContainer.classList.add('hidden');
        els.coveragePulse.classList.add('hidden');
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
        const providerCursors = store.get('providerCursors');
        const options = {
            page: currentPage,
            sortBy: els.sortByInput.value,
            category: els.categoryInput.value,
            language: els.languageInput.value,
            country: countrySelector.getValue().join(','),
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

        const failedProviders = [];

        // Fetch from all selected providers in parallel
        const promises = providers.map(async providerName => {
            try {
                // Pass any stored cursor for cursor-based providers (e.g. NewsData)
                const providerOptions = providerCursors[providerName]
                    ? { ...options, cursor: providerCursors[providerName] }
                    : options;
                const data = await fetchNews(providerName, query, providerOptions);

                // Store next cursor if the provider returned one
                if (data.nextCursor) {
                    store.set({ providerCursors: { ...store.get('providerCursors'), [providerName]: data.nextCursor } });
                }

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
                failedProviders.push(`${providerName}: ${err.message}`);
                return [];
            }
        });

        const resultsArrays = await Promise.all(promises);

        const mergedNew = mergeResults(resultsArrays, options.sortBy, query);

        if (isLoadMore) {
            const currentArticles = store.get('articles');

            // Build a key set from existing articles to dedup new results against
            const seenUrls = new Set();
            const seenTitles = new Set();
            currentArticles.forEach(a => {
                if (a.url && a.url !== '#') {
                    try {
                        const u = new URL(a.url);
                        seenUrls.add(u.origin + u.pathname.replace(/\/$/, ''));
                    } catch(e) { seenUrls.add(a.url); }
                }
                if (a.title) seenTitles.add(a.title.toLowerCase().replace(/[^a-z0-9]/g, ''));
            });

            const trulyNew = mergedNew.filter(a => {
                let urlKey = '';
                if (a.url && a.url !== '#') {
                    try {
                        const u = new URL(a.url);
                        urlKey = u.origin + u.pathname.replace(/\/$/, '');
                    } catch(e) { urlKey = a.url; }
                }
                const titleKey = a.title ? a.title.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
                if (urlKey && seenUrls.has(urlKey)) return false;
                if (titleKey && seenTitles.has(titleKey)) return false;
                return true;
            });

            if (trulyNew.length > 0) {
                store.set({ articles: [...currentArticles, ...trulyNew] });
                appendResults(trulyNew, currentArticles.length, store.get('query'), store.get('isSelectionMode'), store.get('selectedArticleIndices'));
                els.loadMoreContainer.classList.remove('hidden');
            } else {
                const btn = document.getElementById('loadMoreBtn');
                btn.textContent = 'No more stories';
                btn.disabled = true;
            }

            if (failedProviders.length > 0) {
                showWarning(`${failedProviders.length} provider(s) failed to respond. Results may be incomplete.`);
            }
        } else {
            if (mergedNew.length > 0) {
                store.set({ articles: mergedNew });
                renderResults(mergedNew, store.get('query'), store.get('isSelectionMode'), store.get('selectedArticleIndices'));

                els.resultsGrid.classList.remove('hidden');
                els.actionBar.classList.remove('hidden');
                els.loadMoreContainer.classList.remove('hidden');

                renderCoveragePulse(mergedNew, query);

                if (failedProviders.length > 0) {
                    showWarning(`${failedProviders.length} provider(s) failed to respond. Results may be incomplete.`);
                }
            } else {
                if (failedProviders.length > 0) {
                    setError('No articles found. Some providers failed to respond.');
                } else {
                    setError('No articles found matching your criteria.');
                }
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

function scoreArticle(article, query) {
    if (!query) return 0;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const title = (article.title || '').toLowerCase();
    const desc = (article.description || '').toLowerCase();
    let score = 0;
    terms.forEach(term => {
        if (title.includes(term)) score += 3;
        if (desc.includes(term)) score += 1;
    });
    // Recency bonus for articles published within the last 48 hours
    const ageMs = Date.now() - new Date(article.publishedAt).getTime();
    if (ageMs < 48 * 60 * 60 * 1000) score += 1;
    return score;
}

function mergeResults(resultsArrays, sortBy = 'publishedAt', query = '') {
    // Flatten array of arrays
    let merged = resultsArrays.flat();
    console.log('Merged raw results:', merged.length);

    // Filter out junk articles (removed/unavailable content from NewsAPI, etc.)
    merged = merged.filter(article => {
        if (!article.title || article.title === '[Removed]') return false;
        if (!article.url || article.url === '#') return false;
        return true;
    });

    // Remove duplicates (by Normalized URL or Title)
    const seen = new Set();
    merged = merged.filter(article => {
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

        // Also check titleKey specifically if we have one, to catch same article with different URLs
        if (titleKey && seen.has(titleKey)) return false;
        if (urlKey && seen.has(urlKey)) return false;

        if (urlKey) seen.add(urlKey);
        if (titleKey) seen.add(titleKey);

        return true;
    });
    console.log('Deduped results:', merged.length);

    if (sortBy === 'relevancy') {
        // Drop articles with zero relevance score (query not found in title or description)
        if (query) {
            merged = merged.filter(a => scoreArticle(a, query) > 0);
        }
        // Score each article by query term matches in title/description, with a recency tiebreaker
        merged.sort((a, b) => {
            const scoreDiff = scoreArticle(b, query) - scoreArticle(a, query);
            if (scoreDiff !== 0) return scoreDiff;
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });
    } else if (!sortBy || sortBy === 'publishedAt') {
        merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    }
    // For 'popularity', keep the providers' interleaved order (each provider's own ranking)

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

// ─── Trending Topics ─────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
    'from','is','are','was','were','be','been','have','has','had','will','would',
    'could','should','may','might','can','not','no','its','that','this','it',
    'they','them','their','he','she','his','her','we','our','you','your','after',
    'over','about','into','as','if','then','so','amid','gets','says','said',
    'year','years','first','last','more','just','also','still','even','only',
    'new','now','back','make','made','time','report','news','top','show','deal',
    'take','come','here','two','three','five','ten','what','when','how','why',
    'who','where','than','before','during','since','while','within','without',
    'next','week','month','day','days','high','free','live','off','out','up',
    'one','man','woman','people','world','against','across','under','between',
]);

function extractTrendingKeywords(articles) {
    const scores = {};

    articles.forEach(article => {
        if (!article.title) return;
        const words = article.title.split(/\s+/);
        words.forEach((raw, idx) => {
            // Detect proper nouns: capitalised but not the first word of the title
            const isProper = idx > 0 && /^[A-Z]/.test(raw);
            const word = raw.toLowerCase().replace(/[^a-z]/g, '');
            if (word.length < 4 || STOP_WORDS.has(word)) return;
            scores[word] = (scores[word] || 0) + (isProper ? 3 : 1);
        });
    });

    return Object.entries(scores)
        .filter(([, s]) => s >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

async function fetchAndRenderTrending() {
    try {
        const data = await fetchNews('newsapi', '', {
            pageSize: '50', language: 'en', sortBy: 'popularity'
        });
        const keywords = extractTrendingKeywords(data.articles || []);
        renderTrendingTopics(keywords);

        // Attach click handlers to trending chips
        document.querySelectorAll('.trending-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                els.searchInput.value = btn.dataset.query;
                performSearch(btn.dataset.query, true);
            });
        });
    } catch (e) {
        // Trending is non-critical — fail silently
    }
}

// Run Init
init();
