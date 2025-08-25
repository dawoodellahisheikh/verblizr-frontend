// DES Added > Titles data file following the same pattern as languages and countries
export type Title = { code: string; label: string };

export const TITLES: Title[] = [
  { code: 'mr', label: 'Mr.' },
  { code: 'mrs', label: 'Mrs.' },
  { code: 'ms', label: 'Ms.' },
  { code: 'miss', label: 'Miss' },
  { code: 'dr', label: 'Dr.' },
  { code: 'prof', label: 'Prof.' },
  { code: 'rev', label: 'Rev.' },
  { code: 'hon', label: 'Hon.' },
  { code: 'sir', label: 'Sir' },
  { code: 'dame', label: 'Dame' },
  { code: 'lord', label: 'Lord' },
  { code: 'lady', label: 'Lady' },
  { code: 'capt', label: 'Capt.' },
  { code: 'col', label: 'Col.' },
  { code: 'maj', label: 'Maj.' },
  { code: 'lt', label: 'Lt.' },
  { code: 'sgt', label: 'Sgt.' },
];

// DES Added > Export default for compatibility with both import styles
export default TITLES;
