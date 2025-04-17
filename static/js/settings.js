document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const darkMode = document.getElementById('dark-mode');
  const shuffleDefault = document.getElementById('shuffle-default');
  const fontSize = document.getElementById('font-size');

  // Load saved preferences from localStorage
  darkMode.checked = localStorage.getItem('darkMode') === 'true';
  shuffleDefault.checked = localStorage.getItem('shuffleDefault') === 'true';
  fontSize.value = localStorage.getItem('fontSize') || 'md';

  // Save settings on form submit
  form.addEventListener('submit', e => {
    e.preventDefault();

    localStorage.setItem('darkMode', darkMode.checked);
    localStorage.setItem('shuffleDefault', shuffleDefault.checked);
    localStorage.setItem('fontSize', fontSize.value);

    alert('✅ Settings saved successfully!');
  });
});
