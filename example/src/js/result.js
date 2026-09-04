const FIELDS = ['operationId', 'result', 'exitTitle', 'exitMessage', 'exitUrl', 'failureReason', 'continueUrl'];

function field(key, value, result) {
  const dt = document.createElement('dt');
  dt.textContent = key;

  const dd = document.createElement('dd');
  dd.textContent = String(value);
  if (key === 'result') {
    dd.className = `result-${result}`;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'result-field';
  wrapper.append(dt, dd);
  return wrapper;
}

function eventsTable(events) {
  const table = document.createElement('table');

  const head = table.createTHead().insertRow();
  for (const label of ['name', 'timestamp', 'type']) {
    const th = document.createElement('th');
    th.textContent = label;
    head.appendChild(th);
  }

  const body = table.createTBody();
  for (const event of events) {
    const tr = body.insertRow();
    for (const key of ['name', 'timestamp', 'type']) {
      tr.insertCell().textContent = event[key] ?? '';
    }
  }

  return table;
}

/** Los campos opcionales del `KhipuResult` pueden no venir; se omiten en silencio. */
export function renderResult(container, result) {
  const dl = document.createElement('dl');
  for (const key of FIELDS) {
    if (result[key] !== undefined && result[key] !== null) {
      dl.appendChild(field(key, result[key], result.result));
    }
  }

  container.replaceChildren(dl, eventsTable(result.events ?? []));
}

export function renderError(container, error) {
  const p = document.createElement('p');
  p.className = 'result-ERROR';
  p.textContent = error?.message ?? String(error);
  container.replaceChildren(p);
}
