// Toggle tema claro/oscuro
function toggleTheme() {
  const body = document.body;
  body.classList.toggle('dark-mode');
  localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
}

// Cargar tema guardado
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', loadTheme);