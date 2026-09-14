(() => {
  'use strict';
  const KEY = 'afterlife_error_monitor_v1';
  const MAX = 200;
  const safe = (value) => {
    try {
      if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack || '' };
      if (typeof value === 'object' && value !== null) return JSON.parse(JSON.stringify(value));
      return String(value ?? '');
    } catch { return String(value ?? ''); }
  };
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  };
  const write = (rows) => {
    try { localStorage.setItem(KEY, JSON.stringify(rows.slice(-MAX))); } catch {}
  };
  const record = (type, payload = {}) => {
    const row = {
      id: (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random()),
      timestamp: new Date().toISOString(),
      page: location.href,
      type,
      ...safe(payload)
    };
    write([...read(), row]);
    window.dispatchEvent(new CustomEvent('afterlife:error-recorded', { detail: row }));
    return row;
  };

  if (!window.AFTERLIFE_ERROR_MONITOR) {
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalFetch = window.fetch.bind(window);
    window.addEventListener('error', (event) => {
      record('javascript', { message: event.message, filename: event.filename, line: event.lineno, column: event.colno, stack: event.error?.stack || '' });
    });
    window.addEventListener('unhandledrejection', (event) => {
      const reason = safe(event.reason);
      record('unhandledrejection', { message: typeof reason === 'object' ? reason.message : reason, stack: typeof reason === 'object' ? reason.stack : '' });
    });
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
          record('http', { url, status: response.status, statusText: response.statusText, method: args[1]?.method || 'GET' });
        }
        return response;
      } catch (error) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        record('network', { url, message: error?.message || String(error), stack: error?.stack || '' });
        throw error;
      }
    };
    console.error = (...args) => { record('console-error', { message: args.map(safe).join(' ') }); originalError(...args); };
    console.warn = (...args) => { record('console-warn', { message: args.map(safe).join(' ') }); originalWarn(...args); };

    window.AFTERLIFE_ERROR_MONITOR = Object.freeze({
      get logs() { return read(); },
      record,
      clear() { try { localStorage.removeItem(KEY); } catch {} },
      export() { return JSON.stringify(read(), null, 2); }
    });
  }
})();
