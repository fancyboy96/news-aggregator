/**
 * Region definitions with ISO 3166-1 alpha-2 codes (for other providers)
 * and FIPS 10-4 codes (for GDELT's sourcecountry filter).
 */
export const REGIONS = [
    {
        id: 'north-america',
        name: 'North America',
        emoji: '🌎',
        iso:  ['us', 'ca', 'mx'],
        fips: ['US', 'CA', 'MX'],
    },
    {
        id: 'europe',
        name: 'Europe',
        emoji: '🌍',
        iso:  ['gb', 'de', 'fr', 'it', 'es', 'nl', 'se', 'pl', 'be', 'at', 'no', 'dk', 'fi', 'pt', 'gr', 'cz', 'hu', 'ro', 'ua', 'ch'],
        fips: ['UK', 'GM', 'FR', 'IT', 'SP', 'NL', 'SW', 'PL', 'BE', 'AU', 'NO', 'DA', 'FI', 'PO', 'GR', 'EZ', 'HU', 'RO', 'UP', 'SZ'],
    },
    {
        id: 'middle-east',
        name: 'Middle East',
        emoji: '🕌',
        iso:  ['sa', 'ae', 'tr', 'eg', 'il', 'iq', 'ir', 'qa', 'kw', 'jo'],
        fips: ['SA', 'AE', 'TU', 'EG', 'IS', 'IZ', 'IR', 'QA', 'KU', 'JO'],
    },
    {
        id: 'asia-pacific',
        name: 'Asia Pacific',
        emoji: '🌏',
        iso:  ['jp', 'cn', 'kr', 'au', 'id', 'th', 'vn', 'tw', 'sg', 'my', 'nz', 'ph'],
        fips: ['JA', 'CH', 'KS', 'AS', 'ID', 'TH', 'VM', 'TW', 'SN', 'MY', 'NZ', 'RP'],
    },
    {
        id: 'south-asia',
        name: 'South Asia',
        emoji: '🌏',
        iso:  ['in', 'pk', 'bd', 'lk', 'np'],
        fips: ['IN', 'PK', 'BG', 'CE', 'NP'],
    },
    {
        id: 'africa',
        name: 'Africa',
        emoji: '🌍',
        iso:  ['ng', 'za', 'ke', 'gh', 'ma', 'tn', 'et', 'tz'],
        fips: ['NI', 'SF', 'KE', 'GH', 'MO', 'TS', 'ET', 'TZ'],
    },
    {
        id: 'latin-america',
        name: 'Latin America',
        emoji: '🌎',
        iso:  ['br', 'ar', 'co', 'cl', 'pe', 've', 'mx'],
        fips: ['BR', 'AR', 'CO', 'CI', 'PE', 'VE', 'MX'],
    },
];

export function getRegionById(id) {
    return REGIONS.find(r => r.id === id) || null;
}
