import { COLOR_FIELDS, OPTION_FIELDS, PRESETS } from './fields.js';

/**
 * Each row carries the `include` checkbox plus the value control. The control
 * stays disabled while the field is not included, so it's obvious at a glance
 * what will actually be sent.
 */
function row(field, entry, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'row';

  const include = document.createElement('input');
  include.type = 'checkbox';
  include.checked = entry.include;
  include.id = `include-${field.key}`;
  include.addEventListener('change', () => onChange({ include: include.checked, value: entry.value }));

  const label = document.createElement('label');
  label.htmlFor = `include-${field.key}`;
  label.textContent = field.label ?? field.key;
  if (!field.webSupported) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.title = 'src/web.ts ignores this field; it only has an effect on iOS and Android';
    badge.textContent = 'no web';
    label.appendChild(badge);
  }

  wrapper.append(include, label, control(field, entry, onChange));
  return wrapper;
}

function control(field, entry, onChange) {
  const emit = (value) => onChange({ include: entry.include, value });

  if (field.type === 'select') {
    const select = document.createElement('select');
    select.disabled = !entry.include;
    for (const choice of field.choices) {
      const option = document.createElement('option');
      option.value = choice;
      option.textContent = choice;
      option.selected = choice === entry.value;
      select.appendChild(option);
    }
    select.addEventListener('change', () => emit(select.value));
    return select;
  }

  const input = document.createElement('input');
  input.disabled = !entry.include;

  if (field.type === 'bool') {
    input.type = 'checkbox';
    input.className = 'value-bool';
    input.checked = Boolean(entry.value);
    input.addEventListener('change', () => emit(input.checked));
    return input;
  }

  if (field.type === 'color') {
    input.type = 'color';
    input.value = entry.value;
    input.addEventListener('input', () => emit(input.value.toUpperCase()));
    return input;
  }

  input.type = 'text';
  input.value = entry.value ?? '';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.addEventListener('input', () => emit(input.value));
  return input;
}

export function renderOptions(container, state, onChange) {
  container.replaceChildren(
    ...OPTION_FIELDS.map((field) => row(field, state.options[field.key], (entry) => onChange(field.key, entry))),
  );
}

export function renderColors(container, state, onChange) {
  container.replaceChildren(
    ...COLOR_FIELDS.map((field) =>
      row({ ...field, type: 'color' }, state.colors.fields[field.key], (entry) => onChange(field.key, entry)),
    ),
  );
}

export function renderPresets(container, onSelect) {
  container.replaceChildren(
    ...PRESETS.map((preset) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = preset.label;
      button.addEventListener('click', () => onSelect(preset));
      return button;
    }),
  );
}

export function renderPayload(container, payload) {
  container.textContent = JSON.stringify(payload, null, 2);
}
