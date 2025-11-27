const CONFIG = {
  ordenTareas: ['Flejar+Paquete', 'Paquete', 'Bobina', 'Cuna', 'Tacos'],
  abrev: { 'Flejar+Paquete': 'F-P', Paquete: 'P', Bobina: 'B', Cuna: 'C', Tacos: 'T' },
  tiempos: { 'Flejar+Paquete': 6, Paquete: 3, Bobina: 8, Cuna: 2, Tacos: 4 },
  coloresTareas: {
    'Flejar+Paquete': 'rgba(25, 135, 84, 0.8)',
    'Paquete': 'rgba(255, 165, 0, 0.8)',
    'Bobina': 'rgba(238, 54, 54, 0.8)',
    'Cuna': 'rgba(165, 42, 42, 0.8)',
    'Tacos': '#a2785b',
  },
  coloresFijosPuestos: {
    '23': '#FF4D4D',
    '24': '#4DB3FF',
    '11': '#FFF04D',
    '15': '#6CFF6C',
  },
  paletaSecundaria: ['#FFA500', '#FF69B4', '#FFFFFF', '#9370DB', '#87CEEB', '#7FFFD4', '#FFB366'],
  JORNADA_MINUTOS: 465,
};

function getJornadaLogica() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
}

function showPopup(msg, type = 'success') {
  const popup = document.getElementById('popup');
  popup.textContent = msg;
  popup.className = 'popup show';
  if (type === 'error') popup.style.backgroundColor = '#dc3545';
  else popup.style.backgroundColor = '#198754';
  setTimeout(() => popup.classList.remove('show'), 3000);
}

function yyyyMmDd(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseDdMmYyyy(dateString) {
  const [day, month, year] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function loadFromStorage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error cargando ${key}:`, e);
    showPopup(`⚠️ Error cargando ${key}`, 'error');
    return defaultValue;
  }
}

function saveToStorage(key, data) {
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

function migrateHistorial() {
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

const STATE = {
  puestos: loadFromStorage('puestos', []),
  log: loadFromStorage(`log-${jornadaActual}`, []),
  colorPuestos: loadFromStorage('colorPuestos', {}),
  chartInstance: null,
  jornadaActual: jornadaActual,
  vistaActual: 'actual',
  jornadaMinutos: initialJornadaMinutos,
};

function getLogsForDateRange(start, end) {
  const logs = [];
  const startDate = parseDdMmYyyy(start);
  const endDate = parseDdMmYyyy(end);

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('log-')) {
      const fecha = key.substring(4);
      const logDate = parseDdMmYyyy(fecha);
      if (logDate >= startDate && logDate <= endDate) {
        const dayLogs = loadFromStorage(key, []);
        logs.push(...dayLogs);
      }
    }
  }
  return logs;
}


function getColorPuesto(puesto) {
  if (STATE.colorPuestos[puesto]) return STATE.colorPuestos[puesto];
  
  if (CONFIG.coloresFijosPuestos[puesto]) {
    STATE.colorPuestos[puesto] = CONFIG.coloresFijosPuestos[puesto];
    saveToStorage('colorPuestos', STATE.colorPuestos);
    return STATE.colorPuestos[puesto];
  }
  
  const puestosNoFijos = STATE.puestos.filter(p => !CONFIG.coloresFijosPuestos[p]);
  const index = puestosNoFijos.indexOf(puesto);
  
  if (index >= 0) {
    let color = CONFIG.paletaSecundaria[index % CONFIG.paletaSecundaria.length];
    if (color === '#FFFFFF' && !document.body.classList.contains('dark-mode')) {
      color = '#000000';
    }
    STATE.colorPuestos[puesto] = color;
    saveToStorage('colorPuestos', STATE.colorPuestos);
    return color;
  }
  
  STATE.colorPuestos[puesto] = '#CCCCCC';
  saveToStorage('colorPuestos', STATE.colorPuestos);
  return '#CCCCCC';
}

function renderPuestos() {
  const container = document.getElementById('puestos-container');
  if (!container) return;
  
  container.innerHTML = STATE.puestos.map(p => `
    <div class="puesto" style="border-left: 5px solid ${getColorPuesto(p)}">
      <div class="puesto-header">
        <span>Puesto ${p}</span>
        <button class="quitar-puesto-btn" data-puesto="${p}" aria-label="Quitar puesto ${p}">X</button>
      </div>
      <div class="tarea-buttons">
        ${CONFIG.ordenTareas.map(t => 
          `<button class="add-tarea-btn ${CONFIG.abrev[t]}" data-puesto="${p}" data-tarea="${t}" aria-label="Añadir ${t}">${CONFIG.abrev[t]}</button>`
        ).join('')}
      </div>
    </div>
  `).join('');
}

function renderDashboard() {
  const container = document.getElementById('dashboard-container');
  if (!container) return;
  
  const logHoy = STATE.log;
  const contador = logHoy.reduce((acc, l) => {
    acc[l.puesto] = acc[l.puesto] || { total: 0, ...CONFIG.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}) };
    acc[l.puesto][l.tarea]++;
    acc[l.puesto].total++;
    return acc;
  }, {});

  const puestos = Object.keys(contador).sort((a, b) => contador[b].total - contador[a].total);
  if (puestos.length === 0) {
    container.innerHTML = '<p>No hay registros para hoy.</p>';
    return;
  }
  
  let html = '<table class="tabla-resumen"><thead><tr><th>Puesto</th>' +
    CONFIG.ordenTareas.map(t => `<th>${CONFIG.abrev[t]}</th>`).join('') + '<th>Total</th></tr></thead><tbody>';
  
  puestos.forEach(p => {
    html += `<tr><td><span style="color:${getColorPuesto(p)}; font-weight:bold;">Puesto ${p}</span></td>` +
      CONFIG.ordenTareas.map(t => `<td>${contador[p][t] || 0}</td>`).join('') +
      `<td>${contador[p].total}</td></tr>`;
  });
  
  container.innerHTML = html + '</tbody></table>';
}

function renderLog() {
  const container = document.getElementById('log-container');
  if (!container) return;
  
  const logHoy = STATE.log.slice(0, 50);
  container.innerHTML = logHoy.map(l => `
    <div class="log-entry">
      <span><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> | ${l.hora} | ${CONFIG.abrev[l.tarea]}</span>
      <button class="eliminar-log-btn" data-id="${l.id}" aria-label="Eliminar registro">🗑️</button>
    </div>
  `).join('');
}

function renderAll() {
  renderPuestos();
  renderDashboard();
  renderLog();
}

function toggleTheme() {
  try {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    
    const headerIcon = document.getElementById('header-icon');
    if (headerIcon) {
      headerIcon.src = isDark ? 'icon-header.png' : 'icon-header-black.png';
    }
    
    localStorage.setItem('theme', isDark ? 'dark-mode' : '');
  } catch (e) {
    console.error('Error cambiando tema:', e);
  }
}

function cambiarVista(vista) {
  STATE.vistaActual = vista;
  
  document.querySelectorAll('.vista-container').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.modo-toggle button').forEach(b => b.classList.remove('active'));
  
  const vistaEl = document.getElementById(`vista-${vista}`);
  if (vistaEl) vistaEl.classList.add('active');
  
  const boton = document.querySelector(`[data-vista="${vista}"]`);
  if (boton) boton.classList.add('active');
  
  if (vista === 'historial') {
    cambiarSubVistaHistorial('completo');
  }
  if (vista === 'horas') {
    renderDistribucionHoras('hoy');
  }
  if (vista === 'graficas') {
    renderGraficas('daily');
  }
}

function cambiarSubVistaHistorial(subVista) {
  const completo = document.getElementById('hist-completo');
  const compact = document.getElementById('hist-compact');
  
  if (completo) completo.style.display = 'none';
  if (compact) compact.style.display = 'none';
  
  document.querySelectorAll('.hist-tabs button').forEach(b => b.classList.remove('active'));
  
  const subVistaEl = document.getElementById(`hist-${subVista}`);
  if (subVistaEl) subVistaEl.style.display = 'block';
  
  const botonSubVista = document.querySelector(`.hist-tabs button[data-sub="${subVista}"]`);
  if (botonSubVista) botonSubVista.classList.add('active');
  
  if (subVista === 'completo') {
    renderHistorialCompleto();
  }
}

function renderHistorialCompleto() {
  const cont = document.getElementById('hist-completo');
  if (!cont) return;
  cont.innerHTML = '<p>Cargando historial...</p>';

  const allLogs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('log-')) {
      const dayLogs = loadFromStorage(key, []);
      allLogs.push(...dayLogs);
    }
  }

  const porFecha = allLogs.reduce((acc, l) => {
    if (!acc[l.fecha]) acc[l.fecha] = [];
    acc[l.fecha].push(l);
    return acc;
  }, {});
  
  const fechas = Object.keys(porFecha).sort((a, b) => parseDdMmYyyy(b).getTime() - parseDdMmYyyy(a).getTime());
  
  if (fechas.length === 0) {
    cont.innerHTML = '<p>No hay historial.</p>';
    return;
  }
  
  cont.innerHTML = fechas.map(f => {
    const fecha = parseDdMmYyyy(f);
    const titulo = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
      <div class="puesto">
        <div class="puesto-header">
          <h3 style="margin:0;">${titulo}</h3>
        </div>
        ${porFecha[f].map(l => `
          <div class="log-entry">
            <span><strong style="color:${getColorPuesto(l.puesto)};">Puesto ${l.puesto}</strong> - ${l.hora} - ${CONFIG.abrev[l.tarea]}</span>
            <button class="eliminar-log-btn" data-id="${l.id}" aria-label="Eliminar registro">🗑️</button>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function renderDistribucionHoras(rango) {
  const cont = document.getElementById('horas-container');
  if (!cont) return;
  cont.innerHTML = '<p>Cargando datos...</p>';

  const hoy = new Date();
  let start, end;

  switch (rango) {
    case 'hoy':
      start = end = STATE.jornadaActual;
      break;
    case 'ayer':
      const ayer = new Date(hoy);
      ayer.setDate(hoy.getDate() - 1);
      start = end = yyyyMmDd(ayer);
      break;
    case '7dias':
      const sieteDiasAtras = new Date(hoy);
      sieteDiasAtras.setDate(hoy.getDate() - 6);
      start = yyyyMmDd(sieteDiasAtras);
      end = yyyyMmDd(hoy);
      break;
    case 'mes':
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      start = yyyyMmDd(primerDiaMes);
      end = yyyyMmDd(hoy);
      break;
    default:
      start = end = STATE.jornadaActual;
  }

  const allLogs = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('log-')) {
      const fecha = key.substring(4);
      const logDate = parseDdMmYyyy(fecha);
      const startDateObj = parseDdMmYyyy(start);
      const endDateObj = parseDdMmYyyy(end);

      if (logDate >= startDateObj && logDate <= endDateObj) {
        const dayLogs = loadFromStorage(key, []);
        allLogs.push(...dayLogs);
      }
    }
  }

  if (allLogs.length === 0) {
    cont.innerHTML = '<p>No hay datos para este rango.</p>';
    return;
  }

  const logsPorFecha = allLogs.reduce((acc, l) => {
    if (!acc[l.fecha]) acc[l.fecha] = [];
    acc[l.fecha].push(l);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(logsPorFecha).sort((a, b) => parseDdMmYyyy(b).getTime() - parseDdMmYyyy(a).getTime());

  let htmlContent = `<h3>Distribución de Horas - ${rango}</h3>`;

  fechasOrdenadas.forEach(fecha => {
    const logsDelDia = logsPorFecha[fecha];
    const tituloFecha = parseDdMmYyyy(fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const esfuerzoDelDia = logsDelDia.reduce((acc, l) => {
      acc[l.puesto] = (acc[l.puesto] || 0) + (CONFIG.tiempos[l.tarea] || 0);
      return acc;
    }, {});

    const totalEsfuerzoDelDia = Object.values(esfuerzoDelDia).reduce((s, v) => s + v, 0);

    if (totalEsfuerzoDelDia === 0) {
      htmlContent += `<div class="puesto"><div class="puesto-header"><h4>${tituloFecha}</h4></div><p>No hay tareas con tiempo para este día.</p></div>`;
      return;
    }

    const asignacionDelDia = {};
    Object.keys(esfuerzoDelDia).forEach(p => {
      const minutos = (esfuerzoDelDia[p] / totalEsfuerzoDelDia) * STATE.jornadaMinutos;
      asignacionDelDia[p] = { minutos, horas: minutos / 60 };
    });

    htmlContent += `
      <div class="puesto">
        <div class="puesto-header">
          <h4>${tituloFecha}</h4>
        </div>
        <table class="tabla-resumen">
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Tiempo</th>
              <th>Decimal</th>
            </tr>
          </thead>
          <tbody>
    `;
    Object.keys(asignacionDelDia)
      .sort((a, b) => asignacionDelDia[b].minutos - asignacionDelDia[a].minutos)
      .forEach(p => {
        const h = Math.floor(asignacionDelDia[p].minutos / 60);
        const m = Math.round(asignacionDelDia[p].minutos % 60);
        htmlContent += `<tr><td><strong style="color:${getColorPuesto(p)};">P${p}</strong></td><td>${h}h ${m}min</td><td>${asignacionDelDia[p].horas.toFixed(2)}</td></tr>`;
      });
    htmlContent += `
          </tbody>
        </table>
      </div>
    `;
  });

  cont.innerHTML = htmlContent;
}

function renderGraficas(periodo) {
  if (STATE.chartInstance) {
    STATE.chartInstance.destroy();
    STATE.chartInstance = null;
  }
  
  let fechaInicio = new Date();
  if (periodo === 'weekly') fechaInicio.setDate(fechaInicio.getDate() - 6);
  if (periodo === 'biweekly') fechaInicio.setDate(fechaInicio.getDate() - 14);
  if (periodo === 'monthly') fechaInicio.setDate(fechaInicio.getDate() - 29);
  
  const fechaInicioStr = yyyyMmDd(fechaInicio);
  const hoyStr = yyyyMmDd(new Date());
  
  const logParaGraficar = getLogsForDateRange(fechaInicioStr, hoyStr);
  
  const contador = logParaGraficar.reduce((acc, l) => {
    acc[l.puesto] = acc[l.puesto] || { ...CONFIG.ordenTareas.reduce((a, t) => ({ ...a, [t]: 0 }), {}), total: 0 };
    acc[l.puesto][l.tarea]++;
    acc[l.puesto].total++;
    return acc;
  }, {});
  
  const puestos = Object.keys(contador).sort((a, b) => contador[b].total - contador[a].total);
  
  const datasets = CONFIG.ordenTareas.map(t => ({
    label: CONFIG.abrev[t],
    data: puestos.map(p => contador[p][t]),
    backgroundColor: CONFIG.coloresTareas[t],
  }));
  
  const ctx = document.getElementById('grafico-puestos');
  if (!ctx) return;
  
  STATE.chartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: { labels: puestos.map(p => `Puesto ${p}`), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
    },
  });
}

function validarPuesto(numStr) {
  if (!numStr || numStr.trim() === '') {
    showPopup('⚠️ Ingresa un número de puesto', 'error');
    return false;
  }
  
  const numero = parseInt(numStr.trim());
  if (isNaN(numero) || !/^\d+$/.test(numStr.trim())) {
    showPopup('⚠️ Solo números permitidos', 'error');
    return false;
  }
  
  if (STATE.puestos.includes(numero.toString())) { // Compare as string since STATE.puestos stores strings
    showPopup('⚠️ Puesto ya existe', 'error');
    return false;
  }
  
  return true;
}

function addPuesto() {
  const input = document.getElementById('nuevo-puesto-input');
  if (!input) return;
  
  const num = input.value; // Get raw string value
  if (!validarPuesto(num)) return;
  
  STATE.puestos.push(num.trim()); // Store as string
  STATE.puestos.sort((a, b) => parseInt(a) - parseInt(b));
  
  if (saveToStorage('puestos', STATE.puestos)) {
    renderAll();
    showPopup('✓ Puesto añadido');
    input.value = '';
  }
}

function addTarea(puesto, tarea) {
  const now = new Date();
  const newLog = {
    id: Date.now(),
    puesto,
    tarea,
    fecha: STATE.jornadaActual,
    hora: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  };
  
  STATE.log.unshift(newLog);
  
  if (saveToStorage(`log-${STATE.jornadaActual}`, STATE.log)) {
    renderDashboard();
    renderLog();
    showPopup('✓ Registro añadido');
  } else {
    STATE.log.shift(); // Revertir si falla
  }
}

function quitarPuesto(puesto) {
  if (!confirm(`¿Seguro que quieres quitar el puesto ${puesto}?`)) return;
  
  STATE.puestos = STATE.puestos.filter(p => p !== puesto);
  
  if (saveToStorage('puestos', STATE.puestos)) {
    renderAll();
    showPopup('✓ Puesto eliminado');
  }
}

function eliminarLog(id) {
  const logId = parseInt(id);
  
  const logHoyInicial = STATE.log.length;
  STATE.log = STATE.log.filter(l => l.id !== logId);
  
  if (logHoyInicial > STATE.log.length) {
    if (saveToStorage(`log-${STATE.jornadaActual}`, STATE.log)) {
      renderDashboard();
      renderLog();
      showPopup('✓ Registro eliminado');
    }
    return;
  }

  // Fallback to search in old logs
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('log-')) {
      let logDia = loadFromStorage(key, []);
      const logDiaInicial = logDia.length;
      logDia = logDia.filter(l => l.id !== logId);
      if (logDiaInicial > logDia.length) {
        if (saveToStorage(key, logDia)) {
          if (STATE.vistaActual === 'historial') {
            renderHistorialCompleto();
          }
          showPopup('✓ Registro eliminado del historial');
        }
        return;
      }
    }
  }
}

function clearToday() {
  if (!confirm('¿Seguro que quieres borrar todos los registros de hoy?')) return;
  
  STATE.log = [];
  
  if (saveToStorage(`log-${STATE.jornadaActual}`, STATE.log)) {
    renderAll();
    showPopup('✓ Registros de hoy eliminados');
  }
}

function resetColors() {
  if (!confirm('¿Resetear todos los colores?')) return;
  
  STATE.colorPuestos = {};
  
  if (saveToStorage('colorPuestos', STATE.colorPuestos)) {
    renderAll();
    showPopup('✓ Colores reseteados');
  }
}



function finalizarJornada() {
  if (!confirm('¿Finalizar jornada y guardar en historial?')) return;
  
  const logHoy = STATE.log.filter(l => l.fecha === STATE.jornadaActual);
  
  if (logHoy.length === 0) {
    showPopup('⚠️ No hay registros para finalizar', 'error');
    return;
  }
  
  if (!saveToStorage(`log-${STATE.jornadaActual}`, logHoy)) return;
  
  STATE.log = [];
  
  const today = new Date();
  today.setDate(today.getDate() + 1);
  STATE.jornadaActual = yyyyMmDd(today);
  localStorage.setItem('jornadaActual', STATE.jornadaActual);

  // Export to CSV
  const filename = `registros_jornada_${logHoy[0].fecha}.csv`; // Use the date of the finalized log
  exportToCsv(logHoy, filename);
  
  renderAll();
  showPopup('✓ Jornada finalizada correctamente');
}

function handleUpdateJornadaMinutos() {
  const input = document.getElementById('jornada-minutos-input');
  if (!input) return;

  const newMinutos = parseInt(input.value.trim());

  if (isNaN(newMinutos) || newMinutos <= 0) {
    showPopup('⚠️ Ingresa un número válido y positivo para los minutos de jornada.', 'error');
    return;
  }

  STATE.jornadaMinutos = newMinutos;
  localStorage.setItem('jornadaMinutos', newMinutos); // Save to localStorage

  // Update the display next to the input
  const display = document.getElementById('jornada-horas-display');
  if (display) {
    const h = Math.floor(newMinutos / 60);
    const m = newMinutos % 60;
    display.textContent = `(${h}h ${m}m)`;
  }

  // Re-render the 'Horas' view if it's active, or just update the calculations
  if (STATE.vistaActual === 'horas') {
    renderDistribucionHoras(document.querySelector('.horas-filtros button.active')?.dataset.rango || 'hoy');
  }
  
  showPopup('✓ Minutos de jornada actualizados.');
}

function exportToCsv(logToExport, filename = 'registros_jornada.csv') {
  if (!logToExport || logToExport.length === 0) {
    showPopup('⚠️ No hay datos para exportar.', 'error');
    return;
  }

  const headers = ['ID', 'Puesto', 'Tarea', 'Fecha', 'Hora'];
  const rows = logToExport.map(l => [
    l.id,
    l.puesto,
    CONFIG.abrev[l.tarea] || l.tarea, // Use abbreviation if available
    l.fecha,
    l.hora
  ]);

  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
    csvContent += row.map(item => `"${item}"`).join(',') + '\n'; // Quote items to handle commas
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) { // Feature detection for download attribute
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showPopup('✓ Datos exportados a CSV.');
  } else {
    showPopup('⚠️ Tu navegador no soporta la descarga automática de archivos.', 'error');
  }
}

function setupListeners() {
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.onclick = toggleTheme;
  
  const addBtn = document.getElementById('add-puesto-btn');
  if (addBtn) addBtn.onclick = addPuesto;
  
  const input = document.getElementById('nuevo-puesto-input');
  if (input) {
    input.onkeypress = (e) => {
      if (e.key === 'Enter') addPuesto();
    };
  }
  
  const clearBtn = document.getElementById('clear-today-btn');
  if (clearBtn) clearBtn.onclick = clearToday;
  
  const resetBtn = document.getElementById('reset-colors-btn');
  if (resetBtn) resetBtn.onclick = resetColors;
  
  const finalizarBtn = document.getElementById('finalizar-jornada-btn');
  if (finalizarBtn) finalizarBtn.onclick = finalizarJornada;
  
  const saveJornadaBtn = document.getElementById('save-jornada-btn');
  if (saveJornadaBtn) saveJornadaBtn.onclick = handleUpdateJornadaMinutos;
  
  const modoToggle = document.querySelector('.modo-toggle');
  if (modoToggle) {
    modoToggle.onclick = (e) => {
      if (e.target.tagName === 'BUTTON' && e.target.dataset.vista) {
        cambiarVista(e.target.dataset.vista);
      }
    };
  }

  const histTabs = document.querySelector('.hist-tabs');
  if (histTabs) {
    histTabs.onclick = (e) => {
      if (e.target.tagName === 'BUTTON' && e.target.dataset.sub) {
        cambiarSubVistaHistorial(e.target.dataset.sub);
      }
    };
  }
  
  const horasFiltros = document.querySelector('.horas-filtros');
  if (horasFiltros) {
    horasFiltros.onclick = (e) => {
      if (e.target.tagName === 'BUTTON' && e.target.dataset.rango) {
        document.querySelectorAll('.horas-filtros button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderDistribucionHoras(e.target.dataset.rango);
      }
    };
  }
  
  const graficasFiltros = document.querySelector('.filtros-graficas');
  if (graficasFiltros) {
    graficasFiltros.onclick = (e) => {
      if (e.target.tagName === 'BUTTON' && e.target.dataset.periodo) {
        document.querySelectorAll('.filtros-graficas button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderGraficas(e.target.dataset.periodo);
      }
    };
  }
  
  document.body.onclick = (e) => {
    const target = e.target;
    
    if (target.classList.contains('add-tarea-btn')) {
      addTarea(target.dataset.puesto, target.dataset.tarea);
    }
    
    if (target.classList.contains('quitar-puesto-btn')) {
      quitarPuesto(target.dataset.puesto);
    }
    
    if (target.classList.contains('eliminar-log-btn')) {
      eliminarLog(target.dataset.id);
    }
  };
}

function init() {
  try {
    console.log('Initializing app...');

    if (!localStorage.getItem('historialMigrado')) {
      migrateHistorial();
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark-mode') {
      document.body.classList.add('dark-mode');
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.textContent = '☀️';
      const headerIcon = document.getElementById('header-icon');
      if (headerIcon) {
        headerIcon.src = 'icon-header.png';
      }
    } else {
      const headerIcon = document.getElementById('header-icon');
      if (headerIcon) {
        headerIcon.src = 'icon-header-black.png';
      }
    }
    
    const jornadaInput = document.getElementById('jornada-minutos-input');
    if (jornadaInput) {
      jornadaInput.value = STATE.jornadaMinutos;
      const display = document.getElementById('jornada-horas-display');
      if (display) {
        const h = Math.floor(STATE.jornadaMinutos / 60);
        const m = STATE.jornadaMinutos % 60;
        display.textContent = `(${h}h ${m}m)`;
      }
    }
    
    renderAll();
    setupListeners();
    


    console.log('=== APP INITIALIZED ===');
  } catch (e) {
    console.error('Error crítico inicializando:', e);
    alert('Error iniciando la aplicación. Recarga la página.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
