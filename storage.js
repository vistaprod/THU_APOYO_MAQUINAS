import { showPopup } from './utils.js';

export function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error cargando ${key}:`, e);
    showPopup(`⚠️ Error cargando ${key}`, 'error');
    return defaultValue;
  }
}

export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`Error guardando ${key}:`, e);
    if (e.name === 'QuotaExceededError') {
      showPopup('⚠️ Almacenamiento lleno. Libera espacio.', 'error');
    } else {
      showPopup(`⚠️ Error guardando datos`, 'error');
    }
    return false;
  }
}

export function migrateHistorial() {
  const historial = loadFromStorage('historialCompleto', []);
  if (historial.length === 0) {
    return;
  }

  const porFecha = historial.reduce((acc, l) => {
    if (!acc[l.fecha]) {
      acc[l.fecha] = [];
    }
    acc[l.fecha].push(l);
    return acc;
  }, {});

  for (const fecha in porFecha) {
    saveToStorage(`log-${fecha}`, porFecha[fecha]);
  }

  localStorage.removeItem('historialCompleto');
  localStorage.setItem('historialMigrado', 'true');
  console.log('Migración de historial completada.');
}