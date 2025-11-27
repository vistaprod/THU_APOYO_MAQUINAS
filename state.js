// state.js
import { loadFromStorage } from './storage.js';
import { getJornadaLogica, showPopup } from './utils.js';
import { CONFIG } from './config.js';

let initialJornadaMinutos = CONFIG.JORNADA_MINUTOS;
try {
  const saved = localStorage.getItem('jornadaMinutos');
  if (saved) {
    initialJornadaMinutos = parseInt(saved) || CONFIG.JORNADA_MINUTOS;
  }
} catch (e) {
  console.error('Error cargando jornadaMinutos:', e);
  showPopup('⚠️ Error cargando jornadaMinutos', 'error');
}

const jornadaActual = localStorage.getItem('jornadaActual') || getJornadaLogica();

// Normalizar log: puede ser array directo o {jornadaMinutos, registros}
function normalizarLog(logData) {
  if (!logData) return [];
  if (Array.isArray(logData)) return logData;
  if (logData.registros && Array.isArray(logData.registros)) return logData.registros;
  return [];
}

export const STATE = {
  puestos: loadFromStorage('puestos', []),
  log: normalizarLog(loadFromStorage(`log-${jornadaActual}`, [])),
  colorPuestos: loadFromStorage('colorPuestos', {}),
  chartInstance: null,
  jornadaActual: jornadaActual,
  vistaActual: 'actual',
  jornadaMinutos: initialJornadaMinutos,
};
