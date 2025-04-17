document.addEventListener('DOMContentLoaded', async () => {
  const addBtn = document.getElementById('add-lecture-btn');
  const noteFormBox = document.getElementById('current-lecture-box');
  const lectureTitleEl = document.getElementById('current-lecture-title');
  const notesList = document.getElementById('notes-list');
  const emptyState = document.getElementById('empty-state');
  const createBtn = document.getElementById('create-note-btn');

  let selectedLecture = null;

  // 🔐 Confirm login
  const check = await fetch('/api/user', { credentials: 'include' });
  if (check.redirected) {
    window.location.href = check.url;
    return;
  }

  // ➕ Add Lecture → redirect to editor
  addBtn.addEventListener('click', async () => {
    const title = prompt("Enter a name for your new lecture:");
    if (!title || title.trim() === '') return;

    const res = await fetch('/api/lectures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ lecture_title: title.trim() })
    });

    const result = await res.json();
    if (result.success) {
      const lectureTitleEncoded = encodeURIComponent(title.trim());
      window.location.href = `/notes/editor?lecture=${lectureTitleEncoded}`;
    } else {
      alert("Failed to create lecture.");
    }
  });

  // ✏️ Save Note
  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const title = document.getElementById('noteTitle').value.trim();
      const content = document.getElementById('noteContent').value.trim();

      if (!selectedLecture) return alert("❗ Please add a lecture first.");
      if (!title || !content) return alert("❗ Please fill in both fields.");

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, content, lecture_title: selectedLecture })
      });

      const data = await response.json();
      if (data.success) {
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        loadNotesByLecture(selectedLecture);
      } else {
        alert("Error saving note: " + data.error);
      }
    });
  }

  // 📥 Load notes for selected lecture
  async function loadNotesByLecture(lectureTitle) {
    const res = await fetch(`/api/notes?lecture_title=${encodeURIComponent(lectureTitle)}`, {
      credentials: 'include'
    });

    const data = await res.json();
    notesList.innerHTML = '';

    if (data.success && data.notes.length > 0) {
      emptyState.classList.add('hidden');
      data.notes.forEach(note => appendNote(note));
    } else {
      emptyState.classList.remove('hidden');
    }
  }

  // 🧱 Display a note
  function appendNote(note) {
    const card = document.createElement('div');
    card.className = 'note-card bg-white border border-gray-200 rounded-xl p-5 shadow hover:shadow-lg transition';
    card.innerHTML = `
      <h3 class="text-xl font-semibold text-[#2d7a2d] mb-2">${note.title}</h3>
      <p class="text-gray-700 mb-4">${note.content}</p>
      <div class="text-sm text-gray-500 flex justify-between items-center">
        <span>Created: ${formatDate(note.created_at)}</span>
        <button class="text-red-400 hover:text-red-600" onclick="deleteNote('${note.id}', event)">🗑 Delete</button>
      </div>
    `;
    notesList.prepend(card);
  }

  // 🗑 Delete note
  window.deleteNote = async function (noteId, event) {
    event.preventDefault();
    if (!confirm("Delete this note?")) return;

    const response = await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const result = await response.json();
    if (result.success) {
      event.target.closest('.note-card').remove();
      if (notesList.children.length === 0) emptyState.classList.remove('hidden');
    } else {
      alert("Failed to delete note.");
    }
  };

  // 🕓 Format date
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }
});
