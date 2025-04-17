{document.addEventListener('DOMContentLoaded', () => {
  const pairContainer = document.getElementById('term-definition-pairs');
  const addPairBtn = document.getElementById('add-pair-btn');
  const startGameBtn = document.getElementById('start-game-btn');
  const gameContainer = document.getElementById('game-container');
  const gameSection = document.getElementById('game-play');
  const gameResults = document.getElementById('game-results');
  const timerDisplay = document.getElementById('game-timer');
  const resultScore = document.getElementById('results-score');
  const resultTime = document.getElementById('results-time');
  const playAgainBtn = document.getElementById('play-again-btn');
  const flashcardsList = document.getElementById('flashcards-list');
  const loadBtn = document.getElementById('load-flashcards-btn');
  const backBtn = document.getElementById('back-to-new-game');
  const savedFlashcardSection = document.getElementById('saved-flashcards');

  let timer = 0;
  let timerInterval = null;

  function startTimer() {
    timer = 0;
    timerDisplay.textContent = 0;
    timerInterval = setInterval(() => {
      timer++;
      timerDisplay.textContent = timer;
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function addPair(term = '', def = '') {
    const div = document.createElement('div');
    div.className = 'flex gap-3 items-start';
    div.innerHTML = `
      <div class="notes-modern-input flex-1">
        <input type="text" class="term-input" placeholder=" " value="${term}" required />
        <label>Term</label>
      </div>
      <div class="notes-modern-input flex-1">
        <input type="text" class="definition-input" placeholder=" " value="${def}" required />
        <label>Definition</label>
      </div>
      <button type="button" class="remove-pair-btn text-red-400 hover:text-red-600 text-xl mt-3">🗑</button>
    `;
    div.querySelector('.remove-pair-btn').addEventListener('click', () => div.remove());
    pairContainer.appendChild(div);
  }

  addPairBtn.addEventListener('click', () => addPair());
  addPair(); // Add one by default

  startGameBtn.addEventListener('click', () => {
    const termInputs = document.querySelectorAll('.term-input');
    const defInputs = document.querySelectorAll('.definition-input');

    const terms = [], definitions = [];

    for (let i = 0; i < termInputs.length; i++) {
      const term = termInputs[i].value.trim();
      const def = defInputs[i].value.trim();
      if (term && def) {
        terms.push({ text: term, pairId: `pair-${i}` });
        definitions.push({ text: def, pairId: `pair-${i}` });
      }
    }

    if (terms.length < 2) {
      alert("❗ Please add at least two term-definition pairs.");
      return;
    }

    const items = [...terms, ...definitions].sort(() => Math.random() - 0.5);

    gameContainer.innerHTML = '';
    gameResults.classList.add('hidden');
    gameSection.classList.remove('hidden');
    startTimer();

    let selected = [], matched = new Set();
    document.getElementById('game-score').textContent = 0;
    document.getElementById('total-pairs').textContent = terms.length;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'game-card bg-white border rounded-xl p-5 shadow text-center cursor-pointer';
      card.dataset.pairId = item.pairId;
      card.textContent = item.text;

      card.addEventListener('click', () => {
        if (card.classList.contains('matched') || selected.includes(card)) return;

        card.style.backgroundColor = '#fff9c4'; // yellow on click
        selected.push(card);

        if (selected.length === 2) {
          const [a, b] = selected;
          if (a.dataset.pairId === b.dataset.pairId && a !== b) {
            a.style.backgroundColor = '#c8e6c9'; // green
            b.style.backgroundColor = '#c8e6c9';
            a.classList.add('matched');
            b.classList.add('matched');
            matched.add(a.dataset.pairId);
            document.getElementById('game-score').textContent = matched.size;
            selected = [];

            if (matched.size === terms.length) {
              stopTimer();
              gameResults.classList.remove('hidden');
              resultScore.textContent = `${matched.size}/${terms.length}`;
              resultTime.textContent = timer;
            }
          } else {
            a.style.backgroundColor = '#ffcdd2'; // red
            b.style.backgroundColor = '#ffcdd2';
            setTimeout(() => {
              a.style.backgroundColor = '';
              b.style.backgroundColor = '';
              selected = [];
            }, 800);
          }
        }
      });

      gameContainer.appendChild(card);
    });
  });

  playAgainBtn?.addEventListener('click', () => {
    pairContainer.innerHTML = '';
    addPair();
    gameResults.classList.add('hidden');
    gameSection.classList.add('hidden');
    pairContainer.scrollIntoView({ behavior: 'smooth' });
  });

  loadBtn?.addEventListener('click', async () => {
    savedFlashcardSection.classList.remove('hidden');
    gameSection.classList.add('hidden');
    gameResults.classList.add('hidden');
    pairContainer.parentElement.classList.add('hidden');

    flashcardsList.innerHTML = '<p class="text-sm text-gray-500">Loading...</p>';

    const res = await fetch('/api/saved-flashcards');
    const data = await res.json();

    if (data.success && data.flashcards.length > 0) {
      flashcardsList.innerHTML = '';
      data.flashcards.forEach(set => {
        const div = document.createElement('div');
        div.className = 'p-4 border rounded-md bg-white shadow cursor-pointer hover:bg-green-50';
        div.innerHTML = `<strong>${set.title}</strong><br><small>${set.terms.length} pairs</small>`;
        div.addEventListener('click', () => {
          pairContainer.innerHTML = '';
          for (let i = 0; i < set.terms.length; i++) {
            addPair(set.terms[i], set.definitions[i]);
          }
          savedFlashcardSection.classList.add('hidden');
          pairContainer.parentElement.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        flashcardsList.appendChild(div);
      });
    } else {
      flashcardsList.innerHTML = '<p class="text-sm text-gray-500">No flashcards found.</p>';
    }
  });

  backBtn?.addEventListener('click', () => {
    savedFlashcardSection.classList.add('hidden');
    pairContainer.parentElement.classList.remove('hidden');
  });
});
