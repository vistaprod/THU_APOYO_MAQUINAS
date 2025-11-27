// utils.js

export function getJornadaLogica() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
}

export function showPopup(msg, type = 'success') {
  const popup = document.getElementById('popup');
  popup.textContent = msg;
  popup.className = 'popup show';
  if (type === 'error') popup.style.backgroundColor = '#dc3545';
  else popup.style.backgroundColor = '#198754';
  setTimeout(() => popup.classList.remove('show'), 3000);
}

export function yyyyMmDd(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function parseDdMmYyyy(dateString) {
  const [day, month, year] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
