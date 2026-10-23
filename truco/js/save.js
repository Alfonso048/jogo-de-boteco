/* ============================================================
   save.js — guarda o progresso no aparelho (localStorage).
   No APK (WebView do Capacitor) o armazenamento funciona e o
   progresso fica salvo entre sessões. No preview em iframe o
   navegador pode bloquear: aí o jogo segue salvando só na memória.
   ============================================================ */

const SAVE_KEY = 'truco_boteco_save_v1';
let _mem = null;
let _ls = null;
try {
  const t = '__truco_test__';
  window.localStorage.setItem(t, '1'); window.localStorage.removeItem(t);
  _ls = window.localStorage;
} catch (_) { _ls = null; }

const Save = {
  available: true,
  persistent: !!_ls,
  read() {
    if (_ls) {
      try { const raw = _ls.getItem(SAVE_KEY); if (raw) return JSON.parse(raw); } catch (_) { /* save corrompido: ignora */ }
    }
    return _mem;
  },
  write(data) {
    _mem = data;
    if (_ls) { try { _ls.setItem(SAVE_KEY, JSON.stringify(data)); } catch (_) { return false; } }
    return true;
  },
  clear() {
    _mem = null;
    if (!_ls) return true;
    try {
      _ls.removeItem(SAVE_KEY);
      return _ls.getItem(SAVE_KEY) === null;
    } catch (_) {
      return false;
    }
  },
};

window.Save = Save;
