/**
 * Centralized State Management
 * Uses a simple pub/sub pattern for state changes.
 */

const state = {
    articles: [],
    query: '',
    isSelectionMode: false,
    selectedArticleIndices: new Set(),
    isSearching: false,
    currentPage: 1,
    providers: ['newsapi', 'newsdata', 'gnews'], // Default active providers
    theme: 'light'
};

const listeners = new Set();

export const store = {
    get(key) {
        return state[key];
    },

    set(updates) {
        let hasChanges = false;
        for (const [key, value] of Object.entries(updates)) {
            if (state[key] !== value) {
                state[key] = value;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            notifyListeners();
        }
    },

    // specific helpers for complex types
    toggleSelection(index) {
        const newSet = new Set(state.selectedArticleIndices);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        this.set({ selectedArticleIndices: newSet });
    },

    clearSelection() {
        this.set({ selectedArticleIndices: new Set() });
    },

    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
};

function notifyListeners() {
    listeners.forEach(listener => listener(state));
}
