/**
 * Single source of truth for the fields the harness can send. Mirrors the
 * `KhipuOptions` interface from `src/definitions.ts`.
 *
 * `webSupported: false` marks the fields that `src/web.ts` receives but ignores,
 * so the harness can flag it instead of giving the impression that the flag is
 * broken.
 */
export const OPTION_FIELDS = [
  {
    key: 'title',
    type: 'text',
    label: 'title',
    default: 'Demo Capacitor',
    webSupported: false,
  },
  {
    key: 'titleImageUrl',
    type: 'text',
    label: 'titleImageUrl',
    default: '',
    webSupported: false,
  },
  {
    key: 'locale',
    type: 'text',
    label: 'locale',
    default: 'es_CL',
    webSupported: false,
  },
  {
    key: 'theme',
    type: 'select',
    label: 'theme',
    default: 'light',
    choices: ['light', 'dark', 'system'],
    webSupported: true,
  },
  {
    key: 'skipExitPage',
    type: 'bool',
    label: 'skipExitPage',
    default: false,
    webSupported: true,
  },
  {
    key: 'skipExitSuccessPage',
    type: 'bool',
    label: 'skipExitSuccessPage',
    default: false,
    webSupported: true,
  },
  {
    key: 'showFooter',
    type: 'bool',
    label: 'showFooter',
    default: true,
    webSupported: false,
  },
  {
    key: 'showMerchantLogo',
    type: 'bool',
    label: 'showMerchantLogo',
    default: false,
    webSupported: false,
  },
  {
    key: 'showPaymentDetails',
    type: 'bool',
    label: 'showPaymentDetails',
    default: true,
    webSupported: false,
  },
];

export const COLOR_FIELDS = [
  { key: 'lightBackground', default: '#FFFFFF', webSupported: false },
  { key: 'lightOnBackground', default: '#1A1A1A', webSupported: false },
  { key: 'lightPrimary', default: '#8347AD', webSupported: true },
  { key: 'lightOnPrimary', default: '#FFFFFF', webSupported: false },
  { key: 'lightTopBarContainer', default: '#8347AD', webSupported: false },
  { key: 'lightOnTopBarContainer', default: '#FFFFFF', webSupported: false },
  { key: 'darkBackground', default: '#121212', webSupported: false },
  { key: 'darkOnBackground', default: '#EDEDED', webSupported: false },
  { key: 'darkPrimary', default: '#3CB4E5', webSupported: true },
  { key: 'darkOnPrimary', default: '#0B0B0B', webSupported: false },
  { key: 'darkTopBarContainer', default: '#1E1E1E', webSupported: false },
  { key: 'darkOnTopBarContainer', default: '#3CB4E5', webSupported: false },
];

export const PRESETS = [
  {
    id: 'defaults',
    label: 'Todo por defecto',
    optionKeys: [],
    colorKeys: null,
  },
  {
    id: 'khipu',
    label: 'Marca Khipu',
    optionKeys: ['title', 'theme'],
    colorKeys: [
      'lightPrimary',
      'lightOnPrimary',
      'lightTopBarContainer',
      'lightOnTopBarContainer',
      'darkPrimary',
      'darkOnPrimary',
    ],
  },
  {
    id: 'all',
    label: 'Todo activado',
    optionKeys: OPTION_FIELDS.map((field) => field.key),
    colorKeys: COLOR_FIELDS.map((field) => field.key),
  },
  {
    id: 'dark',
    label: 'Modo oscuro',
    optionKeys: ['theme'],
    colorKeys: [
      'darkBackground',
      'darkOnBackground',
      'darkPrimary',
      'darkOnPrimary',
      'darkTopBarContainer',
      'darkOnTopBarContainer',
    ],
    overrides: { theme: 'dark' },
  },
];

/** Initial state: no field included, all loaded with their suggested value. */
export function initialState() {
  const options = {};
  for (const field of OPTION_FIELDS) {
    options[field.key] = { include: false, value: field.default };
  }

  const fields = {};
  for (const field of COLOR_FIELDS) {
    fields[field.key] = { include: false, value: field.default };
  }

  return { operationId: '', options, colors: { include: false, fields } };
}

/** A preset replaces what's included, but preserves the typed `operationId`. */
export function applyPreset(state, preset) {
  const next = initialState();
  next.operationId = state.operationId;

  for (const key of preset.optionKeys) {
    next.options[key].include = true;
  }

  for (const [key, value] of Object.entries(preset.overrides ?? {})) {
    next.options[key].value = value;
  }

  if (preset.colorKeys) {
    next.colors.include = true;
    for (const key of preset.colorKeys) {
      next.colors.fields[key].include = true;
    }
  }

  return next;
}
