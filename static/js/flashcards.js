{% extends "index.html" %}

{% block content %}
<div class="max-w-6xl mx-auto mt-20 px-6">
 <div class="bg-white dark:bg-black border border-gray-100 dark:border-gray-700 shadow-2xl rounded-3xl p-10">

   <!-- Header -->
   <div class="flex justify-between items-center mb-10 border-b border-gray-200 dark:border-gray-700 pb-4">
     <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
       <i class="fas fa-clone text-green-500 text-3xl"></i>
       <span>Flashcards</span>
     </h1>
     <div class="flex gap-4 items-center">
       <button id="toggle-theme"
         class="bg-gray-200 dark:bg-zinc-800 dark:text-white px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-700 transition">
         Toggle Theme
       </button>
       <button id="create-flashcard-btn"
         class="inline-flex items-center gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-transform transform hover:scale-105">
         <i class="fas fa-plus-circle text-lg"></i> New Set
       </button>
     </div>
   </div>

   <!-- Flashcard Form -->
   <div id="flashcard-form-container" class="hidden mb-12">
     <div class="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-md">
       <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">Create/Edit Flashcard Set</h2>
       <form id="flashcard-form" class="space-y-8">
         <div class="notes-modern-input">
           <input type="text" id="flashcard-title" placeholder=" " required class="dark:bg-zinc-800 dark:text-white w-full px-4 py-2 border rounded-md" />
           <label for="flashcard-title">Set Title</label>
         </div>

         <div>
           <label class="text-sm font-semibold text-gray-600 dark:text-gray-300 block mb-3">Terms & Definitions</label>
           <div id="flashcard-pairs" class="space-y-4"></div>
           <button type="button" id="add-flashcard-pair-btn"
             class="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-800 text-sm font-medium">
             <i class="fas fa-plus-circle"></i> Add Pair
           </button>
         </div>

         <div class="flex justify-between mt-8">
           <button type="submit"
             class="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-transform transform hover:scale-105">
             Save Set
           </button>
           <button type="button" id="cancel-flashcard-btn"
             class="text-gray-600 hover:text-red-500 font-medium transition">Cancel</button>
         </div>
       </form>
     </div>
   </div>

   <!-- Flashcard List -->
   <div>
     <h3 class="text-xl font-bold text-gray-700 dark:text-white mb-4">Your Flashcard Sets</h3>
     <div id="flashcards-list" class="grid sm:grid-cols-1 gap-6"></div>
   </div>

 </div>
</div>
{% endblock %}

{% block scripts %}
<style>
 .flip-card {
   perspective: 1000px;
   width: 100%;
   max-width: 400px;
   height: 250px;
   margin: 0 auto;
   border-radius: 1rem;
   overflow: hidden;
   box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
   transition: transform 0.6s ease;
 }

 .flip-card-inner {
   position: relative;
   width: 100%;
   height: 100%;
   transform-style: preserve-3d;
   transition: transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1);
 }

 .flip-card.flipped .flip-card-inner {
   transform: rotateY(180deg);
 }

 .flip-card-front,
 .flip-card-back {
   position: absolute;
   width: 100%;
   height: 100%;
   backface-visibility: hidden;
   display: flex;
   align-items: center;
   justify-content: center;
   font-size: 1.5rem;
   font-weight: 600;
   padding: 2rem;
   border-radius: 1rem;
 }

 .flip-card-front {
   background: linear-gradient(to right, #e8f5e9, #a5d6a7);
   color: #1b5e20;
 }

 .flip-card-back {
   background: linear-gradient(to right, #c8e6c9, #81c784);
   color: #1b5e20;
   transform: rotateY(180deg);
 }

 body.dark-theme .flip-card-front {
   background: linear-gradient(to right, #1b5e20, #388e3c);
   color: white;
 }

 body.dark-theme .flip-card-back {
   background: linear-gradient(to right, #2e7d32, #4caf50);
   color: white;
 }

 .fancy-nav-btn {
   padding: 0.75rem 1.5rem;
   border-radius: 0.75rem;
   font-weight: 600;
   background: linear-gradient(to right, #4caf50, #66bb6a);
   color: white;
   box-shadow: 0 4px 14px rgba(76, 175, 80, 0.4);
   transition: all 0.3s ease;
 }

 .fancy-nav-btn:hover {
   transform: translateY(-2px);
   background: linear-gradient(to right, #388e3c, #4caf50);
 }

 .set-container {
   background: white;
   border: 2px solid #e0f2f1;
   border-radius: 1rem;
   padding: 2rem;
   box-shadow: 0 12px 24px rgba(0, 0, 0, 0.06);
   transition: all 0.3s ease;
 }

 .set-container:hover {
   transform: translateY(-5px);
   box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
 }

 body.dark-theme .set-container {
   background: #121212;
   border-color: #333;
   color: #f5f5f5;
 }
</style>

<script>
 document.addEventListener('DOMContentLoaded', () => {
   const flashcardsList = document.getElementById('flashcards-list');
   const flashcardFormContainer = document.getElementById('flashcard-form-container');
   const flashcardForm = document.getElementById('flashcard-form');
   const addPairBtn = document.getElementById('add-flashcard-pair-btn');
   const cancelBtn = document.getElementById('cancel-flashcard-btn');
   const createBtn = document.getElementById('create-flashcard-btn');
   const pairsContainer = document.getElementById('flashcard-pairs');
   let editingSetId = null;

   document.getElementById('toggle-theme').addEventListener('click', () => {
     document.body.classList.toggle('dark-theme');
   });

   createBtn.addEventListener('click', () => {
     editingSetId = null;
     flashcardForm.reset();
     pairsContainer.innerHTML = '';
     addFlashcardPair();
     flashcardFormContainer.classList.remove('hidden');
   });

   cancelBtn.addEventListener('click', () => {
     flashcardFormContainer.classList.add('hidden');
   });

   addPairBtn.addEventListener('click', () => addFlashcardPair());

   function addFlashcardPair(term = '', def = '') {
     const container = document.createElement('div');
     container.className = 'flex gap-4';
     container.innerHTML = `
       <input type="text" placeholder="Term" value="${term}" class="w-1/2 px-3 py-2 border rounded-md dark:bg-zinc-800 dark:text-white" />
       <input type="text" placeholder="Definition" value="${def}" class="w-1/2 px-3 py-2 border rounded-md dark:bg-zinc-800 dark:text-white" />
     `;
     pairsContainer.appendChild(container);
   }

   flashcardForm.addEventListener('submit', async (e) => {
     e.preventDefault();
     const title = document.getElementById('flashcard-title').value;
     const inputs = pairsContainer.querySelectorAll('div');
     const terms = [];
     const definitions = [];

     inputs.forEach(pair => {
       const fields = pair.querySelectorAll('input');
       if (fields[0].value && fields[1].value) {
         terms.push(fields[0].value.trim());
         definitions.push(fields[1].value.trim());
       }
     });

     const res = await fetch(editingSetId ? `/api/update-flashcard/${editingSetId}` : '/api/save-flashcard', {
       method: editingSetId ? 'PUT' : 'POST',
       credentials: 'include',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ title, terms, definitions })
     });

     const result = await res.json();
     if (result.success) {
       flashcardFormContainer.classList.add('hidden');
       loadFlashcards();
     }
   });

   async function loadFlashcards() {
     const res = await fetch('/api/saved-flashcards', { credentials: 'include' });
     const data = await res.json();
     flashcardsList.innerHTML = '';

     if (data.success && data.flashcards.length > 0) {
       data.flashcards.forEach(set => {
         let index = 0;
         const container = document.createElement('div');
         container.className = 'set-container';

         const header = document.createElement('div');
         header.className = 'flex justify-between items-center mb-4';
         header.innerHTML = `
           <h3 class="text-2xl font-bold text-green-700 dark:text-green-300">${set.title}</h3>
           <div class="flex gap-3">
             <button onclick='editFlashcard(${JSON.stringify(set)})' class="text-sm text-blue-600 hover:underline">✏️ Edit</button>
             <button onclick='deleteFlashcardSet("${set.id}")' class="text-sm text-red-500 hover:underline">🗑 Delete</button>
           </div>
         `;

         const card = document.createElement('div');
         card.className = 'flip-card';
         card.innerHTML = `
           <div class="flip-card-inner">
             <div class="flip-card-front">${set.terms[index]}</div>
             <div class="flip-card-back">${set.definitions[index]}</div>
           </div>
         `;
         card.addEventListener('click', () => card.classList.toggle('flipped'));

         const nav = document.createElement('div');
         nav.className = 'flex justify-center gap-6 mt-6';
         nav.innerHTML = `
           <button class="fancy-nav-btn" id="prev-${set.id}">Previous</button>
           <button class="fancy-nav-btn" id="next-${set.id}">Next</button>
         `;

         nav.querySelector(`#next-${set.id}`).addEventListener('click', () => {
           index = (index + 1) % set.terms.length;
           updateCard(card, set, index);
         });

         nav.querySelector(`#prev-${set.id}`).addEventListener('click', () => {
           index = (index - 1 + set.terms.length) % set.terms.length;
           updateCard(card, set, index);
         });

         container.appendChild(header);
         container.appendChild(card);
         container.appendChild(nav);
         flashcardsList.appendChild(container);
       });
     } else {
       flashcardsList.innerHTML = '<p class="text-center text-gray-500">No flashcards saved yet.</p>';
     }
   }

   function updateCard(card, set, index) {
     const inner = card.querySelector('.flip-card-inner');
     inner.classList.remove('flipped');
     inner.innerHTML = `
       <div class="flip-card-front">${set.terms[index]}</div>
       <div class="flip-card-back">${set.definitions[index]}</div>
     `;
   }

   window.editFlashcard = function (set) {
     editingSetId = set.id;
     document.getElementById('flashcard-title').value = set.title;
     pairsContainer.innerHTML = '';
     set.terms.forEach((term, i) => addFlashcardPair(term, set.definitions[i]));
     flashcardFormContainer.classList.remove('hidden');
   };

   window.deleteFlashcardSet = async function (id) {
     if (!confirm('Delete this flashcard set?')) return;
     const res = await fetch(`/api/delete-flashcard/${id}`, {
       method: 'DELETE',
       credentials: 'include'
     });
     const result = await res.json();
     if (result.success) loadFlashcards();
   };

   loadFlashcards();
 });
</script>
{% endblock %}
