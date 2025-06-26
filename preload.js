// Preload script for Electron
window.addEventListener('DOMContentLoaded', () => {
  // Fix base URL for React Router
  const baseTag = document.createElement('base');
  baseTag.href = '/';
  document.head.appendChild(baseTag);
});