/* app.js */

const searchInput = document.getElementById('search-input');
const resultsArea = document.getElementById('results-area');
const hero = document.getElementById('hero');
const featuredContainer = document.getElementById('featured-container');
const filterToggle = document.getElementById('filter-toggle');
const filterMenu = document.getElementById('filter-menu');
const checkboxes = document.querySelectorAll('#filter-menu input[type="checkbox"]');
const micBtn = document.getElementById('mic-btn');
const screensaver = document.getElementById('screensaver');

let selectedGenres = new Set(['All']);
let favorites = JSON.parse(localStorage.getItem('libnav_favs')) || [];

// --- Idle Timer Logic ---
const IDLE_LIMIT = 30000; // 30 Seconds for testing (Set to 60000 for 1 min)
let idleTimeout;

function init() {
    loadTheme();
    loadFeaturedBook();
    performSearch('');
    resetIdleTimer(); // Start timer
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            filterMenu.style.display = 'none';
        }
    });
}

// Reset timer on any interaction
function resetIdleTimer() {
    clearTimeout(idleTimeout);
    screensaver.classList.remove('active');
    idleTimeout = setTimeout(goIdle, IDLE_LIMIT);
}

function goIdle() {
    // 1. Clear search
    searchInput.value = '';
    performSearch('');
    // 2. Reset UI
    hero.classList.remove('minimized');
    featuredContainer.style.display = 'block';
    // 3. Close modals
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    // 4. Show Screensaver
    screensaver.classList.add('active');
}

// Add listeners for activity
window.onload = resetIdleTimer;
document.onmousemove = resetIdleTimer;
document.onkeypress = resetIdleTimer;
document.onclick = resetIdleTimer;
document.ontouchstart = resetIdleTimer;

// --- End Idle Logic ---

function toggleFavorite(e, bookId) {
    e.stopPropagation(); 
    const index = favorites.indexOf(bookId);
    if (index === -1) favorites.push(bookId);
    else favorites.splice(index, 1);
    
    localStorage.setItem('libnav_favs', JSON.stringify(favorites));
    performSearch(searchInput.value);
}

function loadFeaturedBook() {
    const books = LibraryDB.getBooks();
    if(books.length === 0) return;
    const randomBook = books[Math.floor(Math.random() * books.length)];
    
    featuredContainer.innerHTML = `
        <div class="featured-section">
            <span class="featured-label">Recommended for you</span>
            <div class="featured-card">
                <h2 style="font-size:1.4rem; margin-bottom:5px;">${randomBook.title}</h2>
                <p style="color:var(--text-muted); font-size:0.95rem;">by ${randomBook.author}</p>
                <div style="margin-top:10px;">
                    <span class="chip">${randomBook.genre}</span>
                </div>
            </div>
        </div>
    `;
    featuredContainer.querySelector('.featured-card').addEventListener('click', () => {
        openModal(randomBook);
    });
}

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';

    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('listening')) recognition.stop();
        else recognition.start();
    });
    recognition.onstart = () => { micBtn.classList.add('listening'); searchInput.placeholder = "Listening..."; };
    recognition.onend = () => { micBtn.classList.remove('listening'); searchInput.placeholder = "Search title or author..."; };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        performSearch(transcript);
        hero.classList.add('minimized');
        featuredContainer.style.display = 'none';
    };
} else { micBtn.style.display = 'none'; }

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (term.length > 0) {
        hero.classList.add('minimized'); featuredContainer.style.display = 'none';
    } else {
        hero.classList.remove('minimized'); featuredContainer.style.display = 'block';
    }
    performSearch(term);
});

function performSearch(term) {
    term = term.toLowerCase().trim();
    const books = LibraryDB.getBooks();
    
    let matches = books.filter(book => {
        const titleMatch = book.title.toLowerCase().includes(term);
        const authorMatch = book.author.toLowerCase().includes(term);
        
        let genreMatch = true;
        if (selectedGenres.has('Favorites')) {
            genreMatch = favorites.includes(book.id);
        } else {
            genreMatch = selectedGenres.has('All') || selectedGenres.has(book.genre);
        }
        return (titleMatch || authorMatch) && genreMatch;
    });

    renderResults(matches);
}

function renderResults(books) {
    resultsArea.innerHTML = '';
    if (books.length === 0) {
        resultsArea.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:20px;">No books found.</div>';
        return;
    }

    books.forEach((book, index) => {
        const isFav = favorites.includes(book.id);
        const div = document.createElement('div');
        div.className = 'book-card';
        div.style.animationDelay = `${index * 0.05}s`;
        
        // SVG Bookmark Icon
        div.innerHTML = `
            <div class="book-info" style="flex:1;">
                <h3>${book.title}</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;">by ${book.author}</p>
                <div style="margin-top:5px;">
                    <span class="chip">${book.genre}</span>
                    <span style="color:var(--text-muted); font-size:0.85rem; margin-left:10px;">Shelf ${book.shelf}</span>
                </div>
            </div>
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, ${book.id})" title="Bookmark">
                <svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
            </button>
        `;
        
        div.addEventListener('click', (e) => {
            if(!e.target.closest('.fav-btn')) openModal(book);
        });
        
        resultsArea.appendChild(div);
    });
}

filterToggle.addEventListener('click', () => {
    filterMenu.style.display = (filterMenu.style.display === 'flex') ? 'none' : 'flex';
});

checkboxes.forEach(box => {
    box.addEventListener('change', (e) => {
        const val = e.target.value;
        const allBox = document.querySelector('input[value="All"]');
        const favBox = document.querySelector('input[value="Favorites"]');

        if (val === 'Favorites') {
             if(e.target.checked) {
                 selectedGenres.clear(); selectedGenres.add('Favorites');
                 checkboxes.forEach(c => { if(c.value !== 'Favorites') c.checked = false; });
             } else {
                 selectedGenres.delete('Favorites'); selectedGenres.add('All'); allBox.checked = true;
             }
        } else if (val === 'All') {
            if (e.target.checked) {
                selectedGenres.clear(); selectedGenres.add('All');
                checkboxes.forEach(c => { if (c.value !== 'All') c.checked = false; });
            } else e.target.checked = true;
        } else {
            if (e.target.checked) {
                selectedGenres.delete('All'); selectedGenres.delete('Favorites');
                allBox.checked = false; favBox.checked = false;
                selectedGenres.add(val);
            } else {
                selectedGenres.delete(val);
                if (selectedGenres.size === 0) { selectedGenres.add('All'); allBox.checked = true; }
            }
        }
        performSearch(searchInput.value);
    });
});

const bookModal = document.getElementById('book-modal');
const neighborsArea = document.getElementById('neighbors-area');
const neighborsList = document.getElementById('neighbors-list');

function openModal(book) {
    document.getElementById('modal-title').innerText = book.title;
    document.getElementById('modal-author').innerText = book.author;
    document.getElementById('modal-shelf').innerText = book.shelf;
    document.getElementById('modal-genre').innerText = book.genre;
    document.getElementById('modal-map').src = LibraryDB.getMapUrl(book.genre);
    
    const allBooks = LibraryDB.getBooks();
    const neighbors = allBooks.filter(b => b.shelf === book.shelf && b.id !== book.id);
    neighborsList.innerHTML = '';
    if (neighbors.length > 0) {
        neighborsArea.style.display = 'block';
        neighbors.forEach(n => {
            const chip = document.createElement('span');
            chip.className = 'neighbor-chip';
            chip.innerText = n.title;
            chip.onclick = () => openModal(n);
            neighborsList.appendChild(chip);
        });
    } else neighborsArea.style.display = 'none';

    bookModal.classList.add('active');
}

document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = (e) => e.target.closest('.modal-overlay').classList.remove('active'));

document.getElementById('stats-trigger').onclick = () => {
    const books = LibraryDB.getBooks();
    const genres = {};
    books.forEach(b => genres[b.genre] = (genres[b.genre] || 0) + 1);
    
    const favCount = favorites.length;

    let genreHTML = Object.entries(genres).map(([k,v]) => 
        `<div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid var(--border-color);">
            <span>${k}</span> <span class="text-pink">${v}</span>
        </div>`
    ).join('');

    document.getElementById('stats-content').innerHTML = `
        <div style="margin-bottom:20px;">
            <p style="color:var(--text-muted); font-size:0.9rem;">Total Books</p>
            <h1 style="font-size:2.5rem;">${books.length}</h1>
        </div>
         <div style="margin-bottom:20px;">
            <p style="color:var(--text-muted); font-size:0.9rem;">Bookmarks</p>
            <h2 style="color:#ef4444; display:flex; align-items:center; gap:10px;">
                ${favCount} 
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
            </h2>
        </div>
        <div style="margin-bottom:20px;">
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:5px;">Genre Breakdown</p>
            ${genreHTML}
        </div>
    `;
    document.getElementById('stats-modal').classList.add('active');
};

const themeBtn = document.getElementById('theme-toggle');
const moonSVG = '<svg viewBox="0 0 24 24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/></svg>';
const sunSVG = '<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>';

themeBtn.onclick = () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeBtn.innerHTML = isLight ? sunSVG : moonSVG;
};
function loadTheme() {
    if(localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        themeBtn.innerHTML = sunSVG;
    } else {
        themeBtn.innerHTML = moonSVG;
    }
}
init();