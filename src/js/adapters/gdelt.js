import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

// FIPS 10-4 → used by GDELT's sourcecountry param (mapped from ISO codes)
const ISO_TO_FIPS = {
    us: 'US', gb: 'UK', de: 'GM', fr: 'FR', it: 'IT', es: 'SP',
    nl: 'NL', se: 'SW', ch: 'SZ', ua: 'UP', ru: 'RS', pl: 'PL',
    be: 'BE', at: 'AU', no: 'NO', dk: 'DA', fi: 'FI', pt: 'PO',
    gr: 'GR', cz: 'EZ', hu: 'HU', ro: 'RO', jp: 'JA', cn: 'CH',
    kr: 'KS', au: 'AS', in: 'IN', id: 'ID', th: 'TH', vn: 'VM',
    tw: 'TW', sg: 'SN', my: 'MY', nz: 'NZ', ph: 'RP', pk: 'PK',
    bd: 'BG', sa: 'SA', ae: 'AE', tr: 'TU', eg: 'EG', il: 'IS',
    iq: 'IZ', ir: 'IR', qa: 'QA', kw: 'KU', jo: 'JO', ng: 'NI',
    za: 'SF', ke: 'KE', gh: 'GH', ma: 'MO', tn: 'TS', et: 'ET',
    tz: 'TZ', br: 'BR', ar: 'AR', co: 'CO', cl: 'CI', pe: 'PE',
    ve: 'VE', mx: 'MX', ca: 'CA', lk: 'CE', np: 'NP',
};

// GDELT uses full language names, not ISO codes
const ISO_TO_GDELT_LANG = {
    en: 'English',  es: 'Spanish',  fr: 'French',  de: 'German',
    it: 'Italian',  pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ar: 'Arabic',   ko: 'Korean',  nl: 'Dutch',
};

function parseSeen(seendate) {
    // "20240314T120000Z" → ISO string
    if (!seendate) return new Date().toISOString();
    const s = seendate.replace(/[TZ]/g, '');
    return new Date(
        `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` +
        `T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}Z`
    ).toISOString();
}

function isoDateToGdelt(isoDate, endOfDay = false) {
    // "2024-03-07" → "20240307000000" or "20240307235959"
    const d = isoDate.replace(/-/g, '');
    return d + (endOfDay ? '235959' : '000000');
}

export class GdeltProvider extends NewsProvider {
    constructor() { super('gdelt'); }

    async fetch(query, options = {}) {
        const {
            sortBy, language, country,
            pageSize, from, to,
            gdeltFips // pre-computed FIPS codes for regional mode
        } = options;

        const params = new URLSearchParams();
        params.append('provider', 'gdelt');
        params.append('mode', 'artlist');
        params.append('format', 'json');

        if (query) params.append('query', query);
        params.append('maxrecords', String(Math.min(parseInt(pageSize) || 25, 250)));

        // Sorting
        params.append('sort', sortBy === 'relevancy' ? 'Relevance' : 'DateDesc');

        // Language
        const gdeltLang = language && ISO_TO_GDELT_LANG[language];
        if (gdeltLang) params.append('sourcelang', gdeltLang);

        // Country → FIPS (prefer pre-computed regional FIPS)
        const fipsCodes = gdeltFips
            || (country
                ? country.split(',').map(c => ISO_TO_FIPS[c.toLowerCase()]).filter(Boolean)
                : []);
        if (fipsCodes.length) params.append('sourcecountry', fipsCodes.join(','));

        // Date range
        if (from || to) {
            if (from) params.append('STARTDATETIME', isoDateToGdelt(from, false));
            if (to)   params.append('ENDDATETIME',   isoDateToGdelt(to, true));
        } else {
            params.append('timespan', '7d');
        }

        const data = await fetchWithRetry(`/api/proxy?${params.toString()}`);

        if (!data || data.status === 'error') {
            throw new Error(data?.message || 'GDELT API error');
        }

        const articles = data.articles || [];
        return {
            totalResults: articles.length,
            articles: articles.map(a => this.normalize(a)),
        };
    }

    normalize(item) {
        return super.normalize({
            source:      { name: item.domain || 'GDELT' },
            author:      null,
            title:       item.title || 'No Title',
            description: null,
            url:         item.url,
            urlToImage:  item.socialimage || null,
            publishedAt: parseSeen(item.seendate),
            content:     null,
            sourceLang:  item.language,
            sourceCountry: item.sourcecountry,
        });
    }
}

/**
 * Fetch GDELT volume-over-time for a query (last 7 days).
 * Returns an array of 7 daily volume values [oldest … today].
 */
export async function fetchGdeltTimeline(query) {
    if (!query) return null;

    const params = new URLSearchParams({
        provider: 'gdelt',
        mode:     'timelinevolume',
        format:   'json',
        query,
        timespan: '7d',
    });

    const data = await fetchWithRetry(`/api/proxy?${params.toString()}`);
    if (!data?.timeline?.[0]?.series) return null;

    const series = data.timeline[0].series;
    const now = Date.now();
    const DAY = 86400000;
    const buckets = Array(7).fill(0);

    series.forEach(pt => {
        // Date format: "20240307 000000"
        const s = (pt.date || '').replace(' ', '');
        if (s.length < 8) return;
        const ts = new Date(
            `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` +
            `T${(s.slice(8,10)||'00')}:${(s.slice(10,12)||'00')}:00Z`
        ).getTime();
        if (isNaN(ts)) return;
        const daysAgo = Math.floor((now - ts) / DAY);
        if (daysAgo >= 0 && daysAgo < 7) buckets[6 - daysAgo] += (pt.value || 0);
    });

    return buckets;
}
