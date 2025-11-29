export class CountrySelector {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = options;
        this.selectedCountries = new Set();
        this.isOpen = false;
        this.countries = [
            { code: 'us', name: 'United States' },
            { code: 'gb', name: 'United Kingdom' },
            { code: 'au', name: 'Australia' },
            { code: 'ca', name: 'Canada' },
            { code: 'in', name: 'India' },
            { code: 'de', name: 'Germany' },
            { code: 'fr', name: 'France' },
            { code: 'jp', name: 'Japan' },
            { code: 'cn', name: 'China' },
            { code: 'it', name: 'Italy' },
            { code: 'nl', name: 'Netherlands' },
            { code: 'ru', name: 'Russia' },
            { code: 'sa', name: 'Saudi Arabia' },
            { code: 'za', name: 'South Africa' },
            { code: 'es', name: 'Spain' },
            { code: 'se', name: 'Sweden' },
            { code: 'ch', name: 'Switzerland' },
            { code: 'ae', name: 'UAE' },
            { code: 'ua', name: 'Ukraine' },
            { code: 'br', name: 'Brazil' },
            { code: 'mx', name: 'Mexico' },
            { code: 'ar', name: 'Argentina' },
            { code: 'ng', name: 'Nigeria' },
            { code: 'eg', name: 'Egypt' },
            { code: 'id', name: 'Indonesia' },
            { code: 'kr', name: 'South Korea' },
            { code: 'tw', name: 'Taiwan' },
            { code: 'th', name: 'Thailand' },
            { code: 'tr', name: 'Turkey' },
            { code: 'vn', name: 'Vietnam' }
        ].sort((a, b) => a.name.localeCompare(b.name));

        this.init();
    }

    init() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="relative">
                <button type="button" id="country-selector-btn" 
                    class="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700 border-none rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left flex items-center justify-between">
                    <span id="country-selector-label" class="truncate">All Countries</span>
                    <svg class="w-4 h-4 text-slate-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>

                <div id="country-dropdown" class="hidden absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 max-h-80 flex flex-col">
                    <div class="p-2 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-lg">
                        <input type="text" id="country-search" placeholder="Search countries..." 
                            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white">
                    </div>
                    <div id="country-list" class="overflow-y-auto p-2 space-y-1 flex-1">
                        <!-- Items injected here -->
                    </div>
                </div>
            </div>
        `;
        this.renderList();
    }

    renderList(filter = '') {
        const list = document.getElementById('country-list');
        const filtered = this.countries.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length === 0) {
            list.innerHTML = '<div class="p-2 text-sm text-slate-400 text-center">No results</div>';
            return;
        }

        list.innerHTML = filtered.map(c => `
            <label class="flex items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md cursor-pointer transition-colors">
                <input type="checkbox" value="${c.code}" class="country-checkbox form-checkbox text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 w-4 h-4 mr-3"
                    ${this.selectedCountries.has(c.code) ? 'checked' : ''}>
                <span class="text-sm text-slate-700 dark:text-slate-200">${c.name}</span>
            </label>
        `).join('');

        // Re-attach checkbox listeners since we re-rendered
        list.querySelectorAll('.country-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedCountries.add(e.target.value);
                } else {
                    this.selectedCountries.delete(e.target.value);
                }
                this.updateLabel();
                if (this.options.onChange) this.options.onChange(Array.from(this.selectedCountries));
            });
        });
    }

    updateLabel() {
        const label = document.getElementById('country-selector-label');
        if (this.selectedCountries.size === 0) {
            label.textContent = 'All Countries';
        } else if (this.selectedCountries.size === 1) {
            const code = Array.from(this.selectedCountries)[0];
            const country = this.countries.find(c => c.code === code);
            label.textContent = country ? country.name : code;
        } else {
            label.textContent = `${this.selectedCountries.size} Countries Selected`;
        }
    }

    attachEvents() {
        const btn = document.getElementById('country-selector-btn');
        const dropdown = document.getElementById('country-dropdown');
        const search = document.getElementById('country-search');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());

        search.addEventListener('input', (e) => {
            this.renderList(e.target.value);
        });

        document.addEventListener('click', () => {
            if (this.isOpen) this.close();
        });
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        const dropdown = document.getElementById('country-dropdown');
        dropdown.classList.remove('hidden');
        this.isOpen = true;
        document.getElementById('country-search').focus();
    }

    close() {
        const dropdown = document.getElementById('country-dropdown');
        dropdown.classList.add('hidden');
        this.isOpen = false;
    }

    setValue(codes) {
        this.selectedCountries = new Set(codes);
        this.updateLabel();
        this.renderList(); // Re-render to update checkboxes
    }

    getValue() {
        return Array.from(this.selectedCountries);
    }
}
