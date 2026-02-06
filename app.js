// ==========================================
🎵 KOLEKCJA MUZYKI v5.0
// ==========================================

VAR albums = [];
var currentView = 'siatka';
var useFirebase = false;
var currentTheme = 'ciemny';
var html5QrCode = null;
var foundAlbumsFromScan = [];
var COLLECTION_NAME = 'albumy';
var db = null; Firebase Firestore - inicjalizowane później

Sprawdź, czy Firebase jest dostępny
funkcja isFirebaseAvailable() {
 typ powrotu bazy ognia !== 'niezdefiniowane' && 
 typeof firebaseInitialized !== 'niezdefiniowane' && 
 firebaseInitialized === true && 
 db !== null;
}

Inicjalizacja Firebase (wywoływana po załadowaniu)
function initFirebase() {
 if (typeoffirebase !== 'undefined' & typeoffirebaseInitialized !== 'undefined' && firebaseInitialized) {
 try {
 db = firebase.firestore();
 console.log('✅ Firestore zainicjalizowany');
 return true;
 } catch (e) {
 console.warn('⚠️ Błąd inicjalizacji Firestore:', e);
 return false;
 }
 } else {
 console.warn('⚠️ Firebase niedostępny - używam localStorage');
 return false;
 }
}

var audioPlayer = {
 element: null,
 currentAlbum: null,
 currentTrackIndex: 0,
 Playlista: [],
 isPlaying: false
};
// ==========================================
🖼️ POBIERANIE BRAKUJĄCYCH OKŁADEK
// ==========================================

funkcja fetchMissingCovers() {
 var albumsWithoutCover = albums.filter(function(a) { return !a.coverUrl; });
 
if (albumsWithoutCover.length === 0) {
 showNotification('✅ Wszystkie albumy mają okładki!', 'success');
 powrót;
 }
 
var total = albumyBez okładki.długość;
 showNotification(' 🖼️ Szukam okładek dla ' + total + ' albumów... (może chwilę potrwać)', 'info');
 
var found = 0;
 var processed = 0;
 
Przetwarzaj po jednym albumie z dłuższym opóźnieniem (wiele API = więcej zapytań)
 function processNext(index) {
 if (index >= albumsWithoutCover.length) {
 renderAlbums();
 showNotification(' 🖼️ Gotowe! Znaleziono ' + found + ' z ' + total + ' okładek!', 'sukces');
 powrót;
 }
 
var album = albumyBez okładki[index];
 
Pokaż progress co 5 albumów
 jeśli (indeks > 0 && indeks % 5 === 0) {
 showNotification('🖼️ Postęp: ' + index + '/' + total + ' (znaleziono: ' + found + ')', 'info');
 }
 
fetchAlbumCover(album.artist, album.title, function(coverUrl) {
 przetworzone++;
 
if (coverUrl) {
 album.coverUrl = coverUrl;
 found++;
 
if (useFirebase && isFirebaseAvailable()) {
 db.collection(COLLECTION_NAME).doc(album.id).update({ coverUrl: coverUrl });
 } else {
 saveData();
 }
 
Odśwież widok co 10 znalezionych
 jeśli (znaleziono % 10 === 0) {
 renderAlbums();
 }
 }
 
// Następny album po 1.5s (żeby nie przeciążyć API)
 setTimeout(function() {
 processNext(index + 1);
 }, 1500);
 });
 }
 
processNext(0);
}

// ==========================================
📀 SKANOWANIE KODU Z LISTĄ UTWORÓW
// ==========================================

function searchByBarcodeWithTracks(barcode) {
 if (!barcode || barcode.length < 8) { 
 showNotification('⚠️ Nieprawidłowy kod!', 'warning'); 
 powrót; 
 }
 
var resultDiv = document.getElementById('scannerResult');
 resultDiv.classList.remove('hidden');
 resultDiv.innerHTML = '<div class="scanner-loading"><div class="spinner"></div><p>Szukam albumu i utworów... </p></div>';
 
fetch('https://musicbrainz.org/ws/2/release/?query=barcode:' + kod kreskowy + '&fmt=json', { 
 nagłówki: { 'User-Agent': 'MusicCollectionApp/1.0' } 
 })
 .then(function(r) { return r.json(); })
 .then(function(data) {
 if (data.releases & data.releases.length > 0) {
 var release = data.releases[0];
 var releaseId = release.id;
 
return fetch('https://musicbrainz.org/ws/2/release/' + releaseId + '?inc=recordings+artist-credits&fmt=json', {
 nagłówki: { 'User-Agent': 'MusicCollectionApp/1.0' }
 });
 } else {
 throw new Error('Nie znaleziono');
 }
 })
 .then(function(r) { return r.json(); })
 .then(function(releaseData) {
 displayBarcodeResultsWithTracks (releaseData);
 })
 .catch(function(error) {
 console.error(error);
 resultDiv.innerHTML = '<h4> ❌ Nie znaleziono</h4><p>Spróbuj wpisać kod ręcznie lub dodaj album manualnie.</p>';
 });
}

function displayBarcodeResultsWithTracks(release) {
 var resultDiv = document.getElementById('scannerResult');
 
var artist = 'Nieznany';
 if (release['artist-credit'] & release['artist-credit'][0]) {
 artysta = wydanie['autor artysty'][0].nazwa || wydawnictwo['artist-credit'][0].artist.name;
 }
 var title = release.title || 'Bez tytułu';
 var year = data wydania? release.date.substring(0, 4) : '';
 
var tracks = [];
 if (release.media & release.media.length > 0) {
 release.media.forEach(function(medium) {
 if (medium.tracks) {
 medium.tracks.forEach(function(track) {
 tracks.push({
 tytuł: utwór.tytuł,
 Długość: Ścieżka.Długość ? Math.round(track.length / 1000) : null
 });
 });
 }
 });
 }
 
var tracksHtml = '';
 if (tracks.length > 0) {
 tracksHtml = '<div style="margin-top:15px; maksymalna wysokość: 200px; overflow-y:auto;" >' +
 '<strong> 🎵 Lista utworów (' + tracks.length + '):</strong>' +
 '<div style="margin-top:10px;" >';
 
tracks.forEach(function(t, i) {
 var duration = t.długość ? formatTime(t.length) : '';
 tracksHtml += '<div style="display:flex; wypełnienie: 8px; tło: RGBBA (255,255,255,05); promień granicy: 5px; margines-dolny:3px;" >' +
 '<span style="width:25px; kolor:#888;" >' + (i + 1) + '.</rozpętl>' +
 '<span style="flex:1;" >' + escapeHtml(t.title) + '</span>' +
 '<span style="color:#888;" >' + czas trwania + '</rozpięte>' +
 '</div>';
 });
 
tracksHtml += '</div></div>';
 }
 
window.scannedTracks = tracks;
 
var html = '<h4> ✅ Znaleziono album!</h4>' +
 '<div style="background:rgba(255,255,255,0.1); wypełnienie: 15 px; promień granicy: 10px; margin-top:10px;" >' +
 '<div style="font-size:1.2rem; font-weight:bold;" >' + escapeHtml(tytuł) + '</div>' +
 '<div style="color:#4ade80;" >' + escapeHtml(artysta) + '</div>' +
 '<div style="color:#888; margin-top:5px;" >' + (rok ? ' 📅 ' + rok : '') + '</div>' +
 tracksHtml +
 '</div>' +
 '<przycisk onclick="addAlbumFromScan(\'' + escapeHtml(artist).replace(/'/g, "\\'") + '\', \'' + escapeHtml(title).replace(/'/g, "\\'") + '\', \'' + year + '\')" style="width:100%; margin-góra: 15px; wypełnienie: 15 px; Tło: #4ade80; granica: brak; promień granicy: 10px; rozmiar czcionki: 1rem; Grubość czcionki: pogrubiona; kursor:wskaźnik;" > ➕ Dodaj do kolekcji</button>';
 
resultDiv.innerHTML = html;
}

funkcja addAlbumFromScan(artysta, tytuł, rok) {
 var tracks = window.scannedTracks || [];
 
var trackList = [];
 tracks.forEach(function(t) {
 trackList.push({
 tytuł: t.title,
 fileUrl: null
 });
 });
 
fetchAlbumCover(artist, title, function(coverUrl) {
 addAlbum({
 artysta: artysta,
 Tytuł: Tytuł,
 Rok: Rok? parseInt(year) : null,
 Gatunek: 'inne',
 Format: 'CD',
 Ocena: 3,
 coverUrl: coverUrl,
 TRacks: TrackList,
 notatki: trackList.length > 0? trackList.length + ' utworów' : null
 });
 
closeScannerModal();
 showNotification('✅ Album dodany z ' + trackList.length + ' utworami!', 'success');
 });
}

// ==========================================
🔔 POWIADOMIENIA
// ==========================================

function showNotification(msg, type) {
 typ = typ || 'sukces';
 var n = document.createElement('div');
 n.textContent = msg;
 kolory zmienności = {
 Sukces: 'gradient liniowy (135°, #4ade80, #22c55e)',
 błąd: 'gradient liniowy(135°, #ef4444, #dc2626)',
 Uwaga: 'gradient liniowy(135°, #fbbf24, #f59e0b)',
 Informacja: 'gradient liniowy(135°, #3b82f6, #2563eb)'
 };
 n.style.cssText = 'position:fixed; dole: 100px; prawa: 20px; tło:' + kolory[typ] + '; kolor:' + (typ === 'ostrzeżenie' ? '#000' : '#fff') + '; wypełnienie: 15px 25px; promień granicy: 10px; grubość czcionki: 600; box-shadow: 0 5px 20px RGBA (0,0,0,0,0,3); z-indeks: 3000; maksymalna szerokość: 300px;';
 document.body.appendChild(n);
 setTimeout(function() { n.style.opacity = '0'; setTimeout(function() { n.remove(); }, 300); }, 3000);
}

// ==========================================
🎨 POMOCNICZE
// ==========================================

funkcja getStars(r) {
 VAR gwiazdy = '';
 dla (var i = 0; i < r; i++) gwiazd += '⭐';
 dla (var j = r; j < 5; j++) gwiazd += '☆';
 gwiazdy powrotne;
}

function escapeHtml(t) {
 jeśli (!t) zwróć '';
 var div = document.createElement('div');
 div.textContent = t;
 return div.innerHTML;
}

funkcja getGenreName(g) {
 var m = {'rock':' 🎸 Rock', 'pop':' 🎤 Pop', 'jazz':' 🎷 Jazz', 'classical':' 🎻 Klasyczna', 'electronic':' 🎹 Elektroniczna', 'hip-hop':' 🎧 Hip-Hop', 'metal':' 🤘 Metal', 'punk':' ⚡ Punk', 'blues':' 🎺 Blues', 'country':' 🤠 Country', 'reggae':' 🌴 Reggae', 'soul':' Soul', 'Soul':' 💜 Soul 🪕', 'Folk', 'indie':' 🎭 Indie', 'soundtrack':' 🎬 Soundtrack', 'inne'🎵};
 return m[g] || g;
}

function getFormatName(f) {
 var m = {'cd':' 💿 CD', 'winyl':' 📀 Winyl', 'digital':' 📱 Cyfrowy', 'kassette':' Kaseta','📼 streaming':' 🌐 Streaming'};
 return m[f] || f;
}

function formatDate(ts) { return new Date(ts).toLocaleDateString('pl-PL'); }

format funkcji Czas(sekundy) {
 jeśli (!seconds || isNaN(seconds)) zwróć '0:00';
 var mins = Math.floor(sekundy / 60);
 var secs = Math.floor(sekundy % 60);
 Return mins + ':' + (sekundy < 10? '0' : '') + sek;
}

// ==========================================
🌙 MOTYW
// ==========================================

function toggleTheme() {
 currentTheme = currentTheme === 'dark' ? 'światło': 'ciemność';
 document.body.className = currentTheme + '-theme';
 document.getElementById('themeIcon').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
 localStorage.setItem('theme', currentTheme);
 showNotification('Zmieniono motyw!');
}

funkcja loadTheme() {
 var save = localStorage.getItem('theme');
 jeśli (zapisane) {
 currentTheme = zapisany;
 document.body.className = currentTheme + '-theme';
 var icon = document.getElementById('themeIcon');
 if (icon) icon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
 }
}

// ==========================================
📦 PRZECHOWYWANIE
// ==========================================

funkcja saveData() {
 if (!useFirebase) localStorage.setItem('musicCollection', JSON.stringify(album));
 updateSyncStatus(useFirebase ? 'firebase': 'lokalny');
}

funkcja loadData() {
 if (useFirebase && isFirebaseAvailable()) { loadFromFirebase(); } 
 else { loadFromLocalStorage(); renderAlbums(); }
}

funkcja loadFromLocalStorage() {
 try {
 var stored = localStorage.getItem('musicCollection');
 jeśli (przechowywany) {
 var parsowany = JSON.parse(stored);
 albums = Array.isArray(parsed) ? przeanalizowana: [];
 } else { albums = []; }
 } catch (e) { albums = []; }
 updateSyncStatus ('local');
}

function loadFromFirebase() {
 if (!isFirebaseAvailable()) {
 showNotification('⚠️ Firebase niedostępny, używam localStorage', 'warning');
 useFirebase = false;
 localStorage.setItem('useFirebase', 'false');
 loadFromLocalStorage();
 renderAlbums();
 powrót;
 }
 showNotification('⏳ Ładowanie...', 'info');
 db.collection(COLLECTION_NAME).orderBy('dateAdded', 'desc').get()
 .then(function(migawka) {
 albumy = [];
 snapshot.forEach(function(doc) { albums.push({id: doc.id, ... doc.data()}); });
 updateSyncStatus ('firebase');
 renderAlbums();
 showNotification('☁️ Załadowano' + albums.length + 'albumów!');
 })
 .catch(function(error) {
 console.error(error);
 showNotification('❌ Błąd Firebase!', 'error');
 useFirebase = false;
 loadFromLocalStorage();
 renderAlbums();
 });
}

funkcja updateSyncStatus(type) {
 var status = document.getElementById('syncStatus');
 var btn = document.getElementById('toggleStorage');
 if (!status || !btn) return;
 if (type === 'firebase') {
 status.textContent = '☁️ Firebase';
 status.className = 'sync-status firebase';
 btn.textContent = ' 💾 Lokalnie';
 } else {
 status.textContent = '💾 Lokalnie';
 status.className = 'sync-status';
 btn.textContent = '☁️ Firebase';
 }
}

function toggleStorageMode() {
 if (!useFirebase && !isFirebaseAvailable()) {
 showNotification('⚠️ Firebase niedostępny (sprawdź połączenie z internetem)', 'error');
 powrót;
 }
 useFirebase = !useFirebase;
 localStorage.setItem('useFirebase', useFirebase);
 if (useFirebase & albums.length > 0 & confirm('Przenieść dane do Firebase?')) { migrateToFirebase(); } 
 else { loadData(); }
}

funkcja migrateToFirebase() {
 if (!isFirebaseAvailable()) {
 showNotification('⚠️ Firebase niedostępny!', 'error');
 useFirebase = false;
 powrót;
 }
 showNotification('⏳ Przenoszenie...', 'info');
 var promises = albums.map(function(album) {
 var data = Object.assign({}, album);
 usuń data.id;
 data.dateAdded = data.dateAdded || Date.now();
 return db.collection(COLLECTION_NAME).add(data);
 });
 Promise.all(promises).then(function() { showNotification(' ✅ Przeniesione!'); loadData(); }). catch(function() { showNotification(' ❌ Błąd!', 'error'); });
}

// ==========================================
➕ CRUD
// ==========================================

🔍 WYKRYWANIE DUPLIKATÓW
function checkDuplicate(artist, title) {
 jeśli (! Array.isArray(albums)) return null;
 var artistLower = artist.toLowerCase().trim();
 var titleLower = title.toLowerCase().trim();
 
return albums.find(function(a) {
 var existingArtist = (a.artist || '').toLowerCase().trim();
 var existingTitle = (a.title || '').toLowerCase().trim();
 
Dokładne dopasowanie
 if (existingArtist === artistLower & existingTitle === titleLower) {
 return true;
 }
 
Podobieństwo (np. "The Beatles" kontra "Beatles")
 var artistSimilar = existingArtist.replace(/^the\s+/i, '') === artistLower.replace(/^the\s+/i, '');
 var titleSimilar = istnyTitle === titleLower || 
 existingTitle.indexOf(titleLower) !== -1 || 
 titleLower.indexOf(existingTitle) !== -1;
 
powrót artystaPodobne && tytułPodobne;
 });
}

function addAlbum(albumData, skipDuplicateCheck) {
 console.log(' 📀 addAlbum wywołane:', albumData);
 
jeśli (! Array.isArray(albumy)) albumy = [];
 
Sprawdź duplikaty (chyba, że skipDuplicateCheck = true)
 if (!skipDuplicateCheck) {
 var duplicate = checkDuplicate(albumData.artist, albumData.title);
 jeśli (duplikat) {
 var msg = ' ⚠️ Album "' + albumData.title + '" od "' + albumData.artist + '" już istnieje w kolekcji!\n\nCzy chcesz go dodać mimo to?';
 if (!confirm(msg)) {
 showNotification('❌ Anulowano - album już istnieje', 'warning');
 return false;
 }
 }
 }
 
albumData.dateAdded = Date.now();
 albumData.favorite = albumData.favorite || fałsz;
 albumData.wishlist = albumData.wishlist || fałsz;
 
console.log('📀 useFirebase:', useFirebase, 'isFirebaseAvailable:', isFirebaseAvailable());
 
if (useFirebase && isFirebaseAvailable()) {
 console.log('📀 Zapisuję do Firebase...');
 db.collection(COLLECTION_NAME).add(albumData)
 .then(function(docRef) { 
 console.log('📀 Firebase OK, id:', docRef.id);
 albumData.id = docRef.id; 
 albums.unshift (albumData); 
 renderAlbums(); 
 showNotification('☁️ Dodano!'🎉); 
 })
 .catch(function(err) { 
 console.error('📀 Firebase błąd:', err);
 showNotification('❌ Błąd!', 'error'); 
 });
 } else {
 if (useFirebase && !isFirebaseAvailable()) {
 useFirebase = false;
 showNotification('⚠️ Firebase niedostępny, zapisuję lokalnie', 'warning');
 }
 albumData.id = Date.now().toString();
 albums.unshift (albumData);
 console.log(' 📀 Zapisuję lokalnie, albums.length:', albums.length);
 saveData();
 renderAlbums();
 showNotification('💾 Dodano!'🎉);
 }
 return true;
}

function updateAlbum(id, albumData) {
 if (useFirebase && isFirebaseAvailable()) {
 db.collection(COLLECTION_NAME).doc(id).update(albumData)
 .then(function() { var idx = albums.findIndex(function(a) { return a.id === id; }); if (idx !== -1) albums[idx] = Object.assign(albums[idx], albumData); renderAlbums(); showNotification(' ☁️ Zapisano! ✅ '); })
 .catch(function() { showNotification(' ❌ Błąd!', 'error'); });
 } else {
 var idx = albums.findIndex(function(a) { return a.id === id; });
 if (idx !== -1) albums[idx] = Object.assign(albums[idx], albumData);
 saveData(); renderAlbums(); showNotification(' 💾 Zapisano! ✅ ');
 }
}

funkcja removeAlbum(id) {
 if (useFirebase && isFirebaseAvailable()) {
 db.collection(COLLECTION_NAME).doc(id).delete()
 .then(function() { albums = albums.filter(function(a) { return a.id !== id; }); renderAlbums(); showNotification(' ☁️ Usunięto! 🗑️ '); })
 .catch(function() { showNotification(' ❌ Błąd!', 'error'); });
 } else {
 albums = albums.filter(function(a) { return a.id !== id; });
 saveData(); renderAlbums(); showNotification(' 💾 Usunięto!'🗑️);
 }
}

function deleteAlbum(id) { if (confirm('Usunąć album?')) { removeAlbum(id); closeDetailsModal(); } }

funkcja toggleFavorite(id) {
 var album = albums.find(function(a) { return a.id === id; });
 if (!album) return;
 var newFav = !album.favorite;
 if (useFirebase && isFirebaseAvailable()) {
 db.collection(COLLECTION_NAME).doc(id).update({ favorite: newFav }).then(function() { album.favorite = newFav; renderAlbums(); showNotification(newFav ? ' ❤️ Ulubiony!' : '🤍 Usunięto'); });
 } else {
 album.favorite = newFav; saveData(); renderAlbums(); showNotification(newFav ? ' ❤️ Ulubiony!' : '🤍 Usunięto');
 }
}

📋 WISHLIST - Lista życzeń
function toggleWishlist(id) {
 var album = albums.find(function(a) { return a.id === id; });
 if (!album) return;
 var newWish = !album.wishlist;
 if (useFirebase && isFirebaseAvailable()) {
 db.collection(COLLECTION_NAME).doc(id).update({ wishlist: newWish }).then(function() { 
 album.wishlist = newWish; 
 renderAlbums(); 
 showNotification(newWish? ' 📋 Dodano do listy życzeń!' : ' ✅ Usunięto z listy życzeń'); 
 });
 } else {
 album.wishlist = newWish; 
 saveData(); 
 renderAlbums(); 
 showNotification(newWish? ' 📋 Dodano do listy życzeń!' : ' ✅ Usunięto z listy życzeń');
 }
}

Szybkie dodawanie do wishlist (bez pełnych danych)
funkcja addToWishlist() {
 var artist = prompt('Artysta:');
 jeśli (!artysta) powróci;
 var title = prompt('Tytuł albumu:');
 if (!title) return;
 
var albumData = {
 artysta: artist.trim(),
 tytuł: title.trim(),
 Rok: Zero,
 Gatunek: 'inne',
 Format: 'cyfrowy',
 Ocena: 3,
 coverUrl: null,
 Lista życzeń: Prawda,
 Notatki: '📋 Do kupienia/posłuchania'
 };
 
Pobierz okładkę
 fetchAlbumCover(wykonawca, tytuł, funkcja(cover) {
 if (cover) albumData.coverUrl = cover;
 addAlbum (albumData);
 });
}

// ==========================================
🖼️ OKŁADKI
// ==========================================

// ==========================================
🖼️ POBIERANIE OKŁADEK - WIELE ŹRÓDEŁ
// ==========================================

function cleanSearchQuery(text) {
 // Wyczyść śmieci z tagów MP3
 Zwróć tekst
 .replace(/[!@#$%^&*()]+/g, '')
 .replace(/www\.[ ^\s]+/gi, '')
 .zastąp(/\(\d{4}\)/g, '') // (2003)
 .replace(/cd\s*\d+/gi, '') // cd1, cd 2
 .zastąp(/disc\s*\d+/gi, '') // disc1
 .zastąp(/\[.*?\]/g, '') // [cokolwiek]
 .zastąp(/\s+/g, ' ')
 .trim();
}

funkcja fetchAlbumCover(artysta, album, callback) {
 var cleanArtist = cleanSearchQuery(artist);
 var cleanAlbum = cleanSearchQuery(album);
 
console.log('🖼️ Szukam okładki:', cleanArtist, '-', cleanAlbum);
 
Próba 1: Deezer (dobry dla polskiej muzyki!)
 fetchCoverFromDeezer(cleanArtist, cleanAlbum, function(cover) {
 jeśli (pokrycie) {
 console.log('🖼️ Znaleziono w Deezer');
 callback (cover);
 } else {
 Próba 2: iTunes
 fetchCoverFromiTunes(cleanArtist, cleanAlbum, function(cover2) {
 if (cover2) {
 console.log('🖼️ Znaleziono w iTunes');
 callback (cover2);
 } else {
 Próba 3: MusicBrainz + Archiwum Okładek
 fetchCoverFromMusicBrainz(cleanArtist, cleanAlbum, function(cover3) {
 jeśli (cover3) {
 console.log(' 🖼️ Znaleziono w MusicBrainz');
 callback (cover3);
 } else {
 // Próba 4: Last.fm
 fetchCoverFromLastFm(cleanArtist, cleanAlbum, function(cover4) {
 if (cover4) {
 console.log(' 🖼️ Znaleziono w Last.fm');
 callback (cover4);
 } else {
 console.log('🖼️ Nie znaleziono okładki');
 callback(null);
 }
 });
 }
 });
 }
 });
 }
 });
}

Deezer API - świetny dla polskiej muzyki!
function fetchCoverFromDeezer(artist, album, callback) {
 var query = encodeURIComponent(artist + ' ' + album);
 fetch('https://api.deezer.com/search/album?q=' + query + '&limit=1')
 .then(function(r) { return r.json(); })
 .then(function(data) {
 if (data.data & data.data.length > 0 & data.data[0].cover_xl) {
 callback(data.data[0].cover_xl); Duża okładka
 } else {
 callback(null);
 }
 })
 .catch(function() { callback(null); });
}

API iTunes
funkcja fetchCoverFromiTunes(wykonawca, album, odwołanie) {
 var query = encodeURIComponent(artist + ' ' + album);
 fetch('https://itunes.apple.com/search?term=' + query + '&entity=album&limit=1')
 .then(function(r) { return r.json(); })
 .then(function(data) {
 if (data.results & data.results.length > 0 & data.results[0].artworkUrl100) {
 callback(data.results[0].artworkUrl100.replace('100x100', '600x600'));
 } else {
 callback(null);
 }
 })
 .catch(function() { callback(null); });
}

MusicBrainz + Archiwum Okładek
funkcja fetchCoverFromMusicBrainz(artysta, album, callback) {
 var query = encodeURIComponent('release:"' + album + '" AND artist:"' + artist + '"');
 fetch('https://musicbrainz.org/ws/2/release/?query=' + query + '&limit=1&fmt=json', {
 nagłówki: { 'User-Agent': 'MusicCollectionApp/1.0' }
 })
 .then(function(r) { return r.json(); })
 .then(function(data) {
 if (data.releases & data.releases.length > 0) {
 var mbid = data.releases[0].id;
 // Pobierz okładkę z Cover Art Archive
 return fetch('https://coverartarchive.org/release/' + mbid);
 }
 throw new Error('Nie znaleziono');
 })
 .then(function(r) { return r.json(); })
 .then(function(coverData) {
 if (coverData.images & coverData.images.length > 0) {
 Znajdź front cover lub pierwszą dostępną
 var front = coverData.images.find(function(img) { return img.front; });
 var coverUrl = front ? front.image : coverData.images[0].image;
 callback (coverUrl);
 } else {
 callback(null);
 }
 })
 .catch(function() { callback(null); });
}

Last.fm API (bez klucza - ograniczone)
function fetchCoverFromLastFm(artist, album, callback) {
 Last.fm wymaga API key, więc używamy alternatywnego endpointu
 var query = encodeURIComponent(artist + ' ' + album);
 Próba przez Spotify embed (backup)
 fetch('https://open.spotify.com/oembed?url=https://open.spotify.com/search/' + query)
 .then(function(r) { return r.json(); })
 .then(function(data) {
 jeśli (data.thumbnail_url) {
 callback(data.thumbnail_url);
 } else {
 callback(null);
 }
 })
 .catch(function() { callback(null); });
}

Szybkie wyszukiwanie okładki (przycisk w formularzu)
funkcja searchCover() {
 var artist = document.getElementById('artist').value.trim();
 var title = document.getElementById('title').value.trim();
 if (!artist && !title) { 
 showNotification('Wpisz artystę lub tytuł!', 'warning'); 
 powrót; 
 }
 
showNotification('🔍 Szukam okładki...', 'info');
 
fetchAlbumCover(artist, title, function(coverUrl) {
 if (coverUrl) {
 document.getElementById('coverUrl').value = coverUrl;
 document.getElementById('coverPreview').innerHTML = '<img src="' + coverUrl + '">';
 showNotification('🖼️ Znaleziono okładkę!', 'success');
 } else {
 showNotification('😔 Nie znaleziono - otwieram Google Images', 'warning');
 window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(artist + ' ' + title + ' album cover'), '_blank');
 }
 });
}

Szukaj okładki w oknie edycji
function searchCoverEdit() {
 var artist = document.getElementById('editArtist').value.trim();
 var title = document.getElementById('editTitle').value.trim();
 if (!artist && !title) { 
 showNotification('Wpisz artystę lub tytuł!', 'warning'); 
 powrót; 
 }
 
showNotification('🔍 Szukam okładki...', 'info');
 
fetchAlbumCover(artist, title, function(coverUrl) {
 if (coverUrl) {
 document.getElementById('editCoverUrl').value = coverUrl;
 document.getElementById('editCoverPreview').innerHTML = '<img src="' + coverUrl + '">';
 showNotification('🖼️ Znaleziono okładkę!', 'success');
 } else {
 showNotification('😔 Nie znaleziono - otwieram Google Images', 'warning');
 window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(artist + ' ' + title + ' album cover'), '_blank');
 }
 });
}

// ==========================================
🎲 ALBUM LOSOWY
// ==========================================

funkcja randomAlbum() {
 jeśli (! Array.isArray(albums) || albums.length === 0) { showNotification('Dodaj najpierw albumy! 📀 ', 'warning'); return; }
 var random = albumy[Math.floor(Math.random() * albums.length)];
 var modal = document.getElementById('randomModal');
 var content = document.getElementById('randomContent');
 content.innerHTML = '<div class="random-album"><h3> 🎲 Co dziś posłuchać?</h3>' +
 (random.coverUrl ? '<img src="' + random.coverUrl + '">' : '<div class="no-cover-big">🎵</div>') +
 '<p class="artist">' + escapeHtml(random.artist) + '</p><p class="title">' + escapeHtml(random.title) + '</p>' +
 '<p class="meta">' + (random.year || '') + ' • ' + getGenreName(random.genre) + ' • ' + getStars(random.rating || 3) + '</p>' +
 '<div class="random-actions"><button class="btn-another" onclick="randomAlbum()"> 🎲 Inny</button>' +
 '<button class="btn-listen" onclick="playAlbum(\'' + random.id + '\')"> ▶️ Słuchaj</button></div></div>';
 modal.classList.add('active');
}

funkcja closeRandomModal() { document.getElementById('randomModal').classList.remove('active'); }

// ==========================================
📷 SKANER KODÓW
// ==========================================

function openScannerModal() {
 document.getElementById('scannerModal').classList.add('active');
 document.getElementById('scannerResult').classList.add('hidden');
 document.getElementById('manualBarcode').value = '';
 startBarcodeScanner();
}

funkcja closeScannerModal() { stopBarcodeScanner(); document.getElementById('scannerModal').classList.remove('active'); }

funkcja startBarcodeScanner() {
 var scannerDiv = document.getElementById('scannerPreview');
 
Sprawdź HTTPS (kamera wymaga bezpiecznego połączenia)
 if (location.protocol !== 'https:' & location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
 scannerDiv.innerHTML = '<div style="padding:40px; kolor: #ffa500; text-align:center;" >' +
 '<p style="font-size:2rem;" >🔒</p>' +
 '<p><strong>Kamera wymaga HTTPS</strong></p>' +
 '<p style="font-size:0.9rem; kolor: #888; margin-top:10px;" >Wgraj aplikację na Netlify lub użyj ręcznego wprowadzania kodu</p>' +
 '</div>';
 powrót;
 }
 
Sprawdź czy biblioteka załadowana
 if (typeof Html5Qrcode === 'niezdefiniowane') { 
 scannerDiv.innerHTML = '<div style="padding:40px; kolor: #aaa; text-align:center;" >' +
 '<p> 📷 Skaner niedostępny</p>' +
 '<p style="font-size:0.9rem;" >Wpisz kod ręcznie poniżej</p>' +
 '</div>'; 
 powrót; 
 }
 
Zatrzymaj poprzedni skaner
 if (html5QrCode) { 
 try { html5QrCode.stop(); } catch(e) {} 
 html5QrCode = null;
 }
 
scannerDiv.innerHTML = '<div style="padding:40px; text-align:center;" ><p> 📷 Uruchamiam kamerę... </p></div>';
 
html5QrCode = nowy Html5Qrcode ("scannerPodgląd");
 
// Konfiguracja dla kodów kreskowych (EAN, UPC)
 var config = {
 FPS: 10,
 qrbox: { szerokość: 280, wysokość: 120 }, // Szeroki prostokąt dla kodów kreskowych
 współczynnik aspektów: 1,777, // 16:9
 formatsToSupport: [
 Html5QrcodeSupportedFormats.EAN_13,
 Html5QrcodeSupportedFormats.EAN_8,
 Html5QrcodeSupportedFormats.UPC_A,
 Html5QrcodeSupportedFormats.UPC_E,
 Html5QrcodeSupportedFormats.CODE_128,
 Html5QrcodeSupportedFormats.CODE_39
 ]
 };
 
html5QrCode.start(
 { facing ngMode: "środowisko" }, // Tylna kamera
 config,
 function(decodedText) { 
 console.log(' 📷 Zeskanowano:', dekodowanyText);
 showNotification(' 📷 Kod: ' + dekodedText, 'success'); 
 stopBarcodeScanner();
 searchByBarcode(dekodowanyTekst); 
 },
 function(errorMessage) {
 Cichy błąd - to normalne, gdy nie ma kodu w kadrze
 }
 ).catch(function(err) { 
 console.error('Błąd kamery:', err);
 var errorMsg = ' 📷 Kamera niedostępna';
 if (err.toString().includes('NotAllowedError')) {
 errorMsg = ' 🚫 Brak dostępu do kamery. Kliknij "Zezwól" w przeglądarce.';
 } else if (err.toString().includes('NotFoundError')) {
 errorMsg = ' 📷 Nie znaleziono kamery';
 }
 scannerDiv.innerHTML = '<div style="padding:40px; kolor: #ff6b6b; text-align:center;" >' +
 '<p>' + errorMsg + '</p>' +
 '<p style="font-size:0.9rem; kolor: #888; margin-top:10px;" >Wpisz kod ręcznie poniżej</p>' +
 '</div>'; 
 });
}

function stopBarcodeScanner() { 
 if (html5QrCode) { 
 try { 
 html5QrCode.stop().then(function() {
 html5QrCode = null;
 }).catch(function() {
 html5QrCode = null;
 });
 } catch(e) {
 html5QrCode = null;
 } 
 } 
}

search funkcjiByBarcode(barcode) {
 searchByBarcodeWithTracks(kod kreskowy);
}

function displayBarcodeResults(releases) {
 var resultDiv = document.getElementById('scannerResult');
 var html = '<h4> ✅ Znaleziono</h4>';
 releases.slice(0, 5).forEach(function(r) {
 var artist = (r['artist-credit'] & r['artist-credit'][0]) ? r['artist-credit'][0].nazwa: 'Nieznany';
 VAR title = r.title || 'Bez tytułu';
 var rok = r.data ? r.date.substring(0, 4) : '';
 html += '<div class="scanner-result-item" onclick="addFromBarcode(\'' + escapeHtml(artist).replace(/'/g, "\\'") + '\',\'' + escapeHtml(title).replace(/'/g, "\\'") + '\',\'' + year + '\')"><div class="info"><div class="title">' + escapeHtml(title) + '</div><div class="artist">' + escapeHtml(artist) + '</div></div></div>';
 });
 resultDiv.innerHTML = html;
}

funkcja addFromBarcode(artysta, tytuł, rok) {
 closeScannerModal();
 document.getElementById('artist').value = artysta;
 document.getElementById('title').value = title;
 document.getElementById('year').value = year;
 fetchAlbumCover(artysta, tytuł, funkcja(cover) { if (cover) { document.getElementById('coverUrl').value = cover; document.getElementById('coverPreview').innerHTML = '<img src="' + cover + '">'; } });
 showNotification('📝 Dane wypełnione!', 'info');
 document.querySelector('.add-section').scrollIntoView({ zachowanie: 'smooth' });
}

// ==========================================
🎵 SKANER MP3
// ==========================================

function openMp3Scanner() {
 document.getElementById('mp3Modal').classList.add('active');
 document.getElementById('mp3Progress').classList.add('hidden');
 document.getElementById('mp3Results').classList.add('hidden');
 foundAlbumsFromScan = [];
}

funkcja closeMp3Modal() { document.getElementById('mp3Modal').classList.remove('active'); }

function scanAudioFiles(files) {
 var progressDiv = document.getElementById('mp3Progress');
 var progressFill = document.getElementById('progressFill');
 var progressText = document.getElementById('progressText');
 var resultsDiv = document.getElementById('mp3Results');
 progressDiv.classList.remove('hidden');
 resultsDiv.classList.add('hidden');
 var albumsMap = {};
 var processed = 0;
 var total = pliki.długość;

function processNext(index) {
 jeśli (indeks >= całkowity) {
 foundAlbumsFromScan = Object.values(albumsMap);
 if (foundAlbumsFromScan.length === 0) { showNotification(' ⚠️ Brak albumów!', 'warning'); progressDiv.classList.add('hidden'); return; }
 foundAlbumsFromScan.forEach(function(a) { if (!a.coverUrl) { fetchAlbumCover(a.artist, a.title, function(c) { if (c) { a.coverUrl = c; displayFoundAlbums(); } }); } });
 progressDiv.classList.add('hidden');
 resultsDiv.classList.remove('hidden');
 displayFoundAlbums();
 showNotification('🎵 Znaleziono ' + foundAlbumsFromScan.length + ' albumów!');
 powrót;
 }
 var file = pliki[index];
 readID3Tags(plik, funkcja(tags) {
 if (tags & tags.artist & tags.album) {
 var key = tags.artist.toLowerCase() + '-' + tags.album.toLowerCase();
 if (!albumsMap[key]) { albumsMap[key] = { artist: tags.artist, title: tags.album, year: tags.year || null, genre: tags.genre ? mapGenre(tags.genre) : 'other', coverUrl: tags.picture || null, tracks: [] }; }
 albumsMap[key].tracks.push({ title: tags.title || file.name.replace(/\.[ ^/.]+$/, ''), fileUrl: URL.createObjectURL(file), fileName: file.name });
 }
 przetworzone++;
 progressFill.style.width = Math.round((processed / sum) * 100) + '%';
 progressText.textContent = 'Skanowanie... ' + przetworzone + '/' + suma;
 setTimeout(function() { processNext(index + 1); }, 10);
 });
 }
 processNext(0);
}

function displayFoundAlbums() {
 var div = document.getElementById('foundAlbums');
 var html = '';
 foundAlbumsFromScan.forEach(function(a, i) {
 html += '<div class="found-album"><input type="checkbox" id="album-' + i + '" checked><div class="album-cover-small">' + (a.coverUrl ? '<img src="' + a.coverUrl + '">' : '🎵') + '</div><div class="info"><div class="title">' + escapeHtml(a.title) + '</div><div class="artist">' + escapeHtml(a.artist) + '</div><div class="tracks">' + a.tracks.length + ' utworów</div></div></div>';
 });
 div.innerHTML = html;
}

function readID3Tags(plik, callback) {
 if (typeofjsmediatags === 'niezdefiniowane') { callback(null); return; }
 jsmediatags.read(file, {
 onSuccess: function(tag) {
 var t = tag.tags;
 var pic = null;
 jeśli (t.picture) { try { var d = t.picture.data; var b = ''; for (var i = 0; i < d.length; i++) b += String.fromCharCode(d[i]); pic = 'data:' + t.picture.format + '; base64,' + btoa(b); } catch(e) {} }
 Callback({ tytuł: T.Title, Wykonawca: T.Artysta, Album: T.Album, Rok: T.Rok, Gatunek: T.Genre, Zdjęcie: Pic });
 },
 onError: function() { callback(null); }
 });
}

function mapGenre(g) {
 var l = g.toLowerCase();
 jeśli (l.indexOf('rock') !== -1) zwróć 'rock';
 jeśli (l.indexOf('pop') !== -1) zwróć 'pop';
 jeśli (l.indexOf('metal') !== -1) zwraca 'metal';
 jeśli (l.indexOf('jazz') !== -1) zwróć 'jazz';
 jeśli (l.indexOf('klasyczny') !== -1) zwróć 'klasyczny';
 jeśli (l.indexOf('electronic') !== -1) zwróć 'electronic';
 if (l.indexOf('hip') !== -1) zwróć 'hip-hop';
 zwrot 'inny';
}

function addAllFoundAlbums() {
 var boxes = document.querySelectorAll('#foundAlbums input[type="checkbox"]');
 VAR dodano = 0;
 dla (var i = 0; i < box.length; i++) {
 if (boxes[i].checked & foundAlbumsFromScan[i]) {
 var a = foundAlbumsFromScan[i];
 addAlbum({ artysta: a.artysta, tytuł: a.tytuł, rok: a.rok, gatunek: a.gatunek, format: 'cyfrowy', ocena: 3, coverUrl: a.coverUrl, utwory: a.tracks, notatki: a.tracks.length + ' utworów' });
 dodano++;
 }
 }
 closeMp3Modal();
 showNotification(' 🎉 Dodano ' + added + ' albumów!');
}

// ==========================================
🎵 ODTWARZACZ
// ==========================================

function initAudioPlayer() {
 audioPlayer.element = document.getElementById('audioElement');
 if (audioPlayer.element) {
 audioPlayer.element.addEventListener('timeupdate', updateProgress);
 audioPlayer.element.addEventListener('zakończony', nextTrack);
 audioPlayer.element.addEventListener('loadedmetadata', function() {
 var el = document.getElementById('totalTime');
 if (el) el.textContent = formatTime(audioPlayer.element.duration);
 });
 }
}

function playTrack(albumId, trackIndex) {
 var album = albums.find(function(a) { return a.id === albumId; });
 if (!album || !album.tracks || !album.tracks[trackIndex]) { 
 showNotification('⚠️ Brak utworu', 'warning'); 
 powrót; 
 }
 var track = album.tracks[trackIndex];
 
if (!track.fileUrl) { 
 window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(album.artist + ' ' + track.title), '_blank'); 
 powrót; 
 }
 
audioPlayer.currentAlbum = album;
 audioPlayer.currentTrackIndex = trackIndex;
 audioPlayer.playlist = album.tracks;
 audioPlayer.element.src = track.fileUrl;
 
document.getElementById('playerTrackTitle').textContent = track.title || 'Nieznany';
 document.getElementById('playerTrackArtist').textContent = album.artist;
 
var artEl = document.getElementById('playerAlbumArt');
 if (artEl) artEl.src = album.coverUrl || '';
 
document.getElementById('audioPlayerBar').classList.remove('hidden');
 
audioPlayer.element.play();
 audioPlayer.isPlaying = true;
 document.getElementById('playPauseBtn').textContent = '⏸️';
 
showNotification(' 🎵 ' + track.title, 'info');
}

funkcja togglePlay() {
 jeśli (!audioPlayer.element || !audioPlayer.element.src) return;
 if (audioPlayer.isPlaying) { 
 audioPlayer.element.pause(); 
 audioPlayer.isPlaying = false; 
 document.getElementById('playPauseBtn').textContent = '▶️'; 
 } else { 
 audioPlayer.element.play(); 
 audioPlayer.isPlaying = true; 
 document.getElementById('playPauseBtn').textContent = '⏸️'; 
 }
}

funkcja nextTrack() {
 jeśli (!audioPlayer.currentAlbum || !audioPlayer.playlist.length) return;
 var next = audioPlayer.currentTrackIndex + 1;
 jeśli (następny >= audioPlayer.playlist.length) następny = 0;
 playTrack(audioPlayer.currentAlbum.id, następny);
}

funkcja prevTrack() {
 jeśli (!audioPlayer.currentAlbum || !audioPlayer.playlist.length) return;
 var prev = audioPlayer.currentTrackIndex - 1;
 jeśli (prev < 0) prev = audioPlayer.playlist.length - 1;
 playTrack(audioPlayer.currentAlbum.id, wcześniej);
}

funkcja updateProgress() {
 jeśli (!audioPlayer.element || !audioPlayer.element.duration) return;
 var pct = (audioPlayer.element.currentTime / audioPlayer.element.duration) * 100;
 var progressEl = document.getElementById('progressBar');
 jeśli (progressEl) progressEl.wartość = pct;
 var currentEl = document.getElementById('currentTime');
 if (currentEl) currentEl.textContent = formatTime(audioPlayer.element.currentTime);
}

function seekTo(pct) { 
 if (audioPlayer.element & audioPlayer.element.duration) {
 audioPlayer.element.currentTime = (pct / 100) * audioPlayer.element.duration; 
 }
}

funkcja setVolume(v) { 
 jeśli (audioPlayer.element) audioPlayer.element.volume = v / 100; 
}

funkcja closeAudioPlayer() { 
 if (audioPlayer.element) { 
 audioPlayer.element.pause(); 
 audioPlayer.element.src = ''; 
 } 
 audioPlayer.isPlaying = false; 
 document.getElementById('audioPlayerBar').classList.add('hidden'); 
}

funkcja playAlbum(id) {
 var album = albums.find(function(a) { return a.id === id; });
 if (!album) return;
 closeRandomModal(); 
 closeDetailsModal();
 var q = encodeURIComponent(album.artist + ' ' + album.title + ' full album');
 var modal = document.getElementById('playerModal');
 document.getElementById('playerContent').innerHTML = '<div class="player-container"><h3>' + escapeHtml(album.title) + '</h3><p class="artist">' + escapeHtml(album.artist) + '</p><iframe width="100%" height="350" src="https://www.youtube.com/embed?listType=search&list=' + q + '" frameborder="0" allowfullscreen></iframe><div class="player-links"><a href="https://open.spotify.com/search/' + q + '" target="_blank" class=" link-spotify"> 🎵 Spotify</a><a href="https://www.youtube.com/results?search_query=' + q + '" target="_blank" class="link-youtube"> ▶️ YouTube</a></div></div>';
 modal.classList.add('active');
}

funkcja closePlayerModal() { document.getElementById('playerModal').classList.remove('active'); }

funkcja closePlayer() { 
 var m = document.getElementById('miniPlayer'); 
 jeśli (m) m.classList.add('ukryty'); 
 closePlayerModal(); 
}

funkcja openSpotify(id) { 
 var a = albums.find(function(x) { return x.id === id; }); 
 if (a) window.open('https://open.spotify.com/search/' + encodeURIComponent(a.artist + ' ' + a.title), '_blank'); 
}

funkcja openYouTube(id) { 
 var a = albums.find(function(x) { return x.id === id; }); 
 if (a) window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(a.artist + ' ' + a.title), '_blank'); 
}

// ==========================================
📊 STATYSTYKI
// ==========================================

funkcja showStats() {
 var modal = document.getElementById('statsModal');
 var content = document.getElementById('statsContent');
 jeśli (! Array.isArray(albums) || albums.length === 0) { content.innerHTML = '<p style="text-align:center; wyduszka:40px;" >Brak danych</p>'; modal.classList.add('active'); powrót; }
 var t = albums.length;
 var artists = {}; albums.forEach(function(a) { artists[a.artist.toLowerCase()] = true; });
 var średnia = 0; albums.forEach(function(a) { avg += (a.rating || 0); }); avg = (avg / t).toFixed(1);
 var favorites = albums.filter(function(a) { return a.favorite; }). długość;
 var genres = {}; albums.forEach(function(a) { gatunki[a.genre] = (gatunki[a.genre] || 0) + 1; });
 var sorted = Object.entries(genres).sort(function(a, b) { return b[1] - a[1]; });
 var max = sortowane[0] ? posortowane[0][1] : 1;
 var html = '<div class="stats-grid"><div class="stats-card"><div class="number">' + t + '</div><div class="label">Albumów</div></div><div class="stats-card"><div class="number">' + Object.keys(artists).length + '</div><div class="label">Artystów</div></div><div class="stats-card"><div class="number">' + avg + '</div> <div class="etykieta">Śr. ocena</div></div><div class="stats-card"><div class="number">' + ulubione + '</div><div class="label">Ulubionych</div></div></div><div class="chart-section"><h3> 🎸 Gatunki</h3>';
 sorted.slice(0, 6).forEach(function(i) { html += '<div class="chart-bar"><span class="label">' + getGenreName(i[0]) + '</span><div class="bar-container"><div class="bar" style="width:' + (i[1]/max)*100) + '%">' + i[1] + '</div></div></div>'; });
 html += '</div>';
 content.innerHTML = html;
 modal.classList.add('active');
}

funkcja closeStatsModal() { document.getElementById('statsModal').classList.remove('active'); }

funkcja updateStats() {
 jeśli (! Array.isArray(albums)) return;
 var t = albums.length;
 var el1 = document.getElementById('totalAlbums'); jeśli (el1) el1.textContent = t;
 var artists = {}; albums.forEach(function(a) { artists[a.artist.toLowerCase()] = true; });
 var el2 = document.getElementById('totalArtists'); if (el2) el2.textContent = Object.keys(artists).length;
 var średnia = 0; if (t > 0) { albums.forEach(function(a) { avg += (a.rating || 0); }); avg = (avg / t).toFixed(1); }
 var el3 = document.getElementById('avgRating'); jeśli (el3) el3.textContent = avg;
 var el4 = document.getElementById('totalFavorites'); if (el4) el4.textContent = albums.filter(function(a) { return a.favorite; }). długość;
 var el5 = document.getElementById('totalWishlist'); if (el5) el5.textContent = albums.filter(function(a) { return a.wishlist; }). długość;
}

// ==========================================
🖨️ DRUKOWANIE KOLEKCJI
// ==========================================

funkcja printCollection() {
 var printWindow = window.open('', '_blank');
 
Grupuj albumy według artysty
 var byArtist = {};
 albums.forEach(function(a) {
 var artist = a.artist || 'Nieznany';
 jeśli (!byArtist[artist]) byArtist[artist] = [];
 byArtist[artist].push(a);
 });
 
var sortedArtists = Object.keys(byArtist).sort();
 
var wishlistAlbums = albums.filter(function(a) { return a.wishlist; });
 var ownedAlbums = albums.filter(function(a) { return !a.wishlist; });
 
var html = '<! DOCTYPE html><html><head><meta charset="UTF-8"><title>Moja Kolekcja Muzyki</title><style>';
 html += 'body{font-family:Arial,sans-serif; maksymalna szerokość: 800px; margines:0 auto; wypełnienie: 20px; kolor:#333;}';
 html += 'h1{text-align:center; kolor: #1a1a2e; Border-bottom: 3px stała #4ade80; padding-bottom:10px;}';
 html += 'h2{color:#4ade80; margin-top: 30px; border-bottom:1px solid #ddd;padding-bottom:5px;}';
 html += 'h3{color:#666; margin-top:20px;}';
 html += '.stats{display:flex; justify-content:center; gap:30px; margines: 20px 0; wypełnienie: 15 px; tło: #f5f5f5; promień granicy: 10px;}';
 html += '.stat{text-align:center;}. stat-num{font-size:24px; Grubość czcionki: pogrubiona; kolor: #4ade80;}. stat-label{font-size:12px; kolor:#666;}';
 html += '.album{display:flex; przerwa: 15px; wypełnienie: 10px; Border-bottom: 1px solidny #eee; page-break-inside:avoid;}';
 html += '.album img{width:60px; wysokość: 60px; dopasowanie obiektu:osłona; border-radius:5px;}';
 html += '.album-info{flex:1;}. album-title{font-weight:bold;}. album-meta{font-size:12px; kolor:#666;}';
 html += '.stars{color:#fbbf24;}';
 html += '.wishlist-section{background:#fff3cd; wypełnienie: 15 px; promień granicy: 10px; margin-top:20px;}';
 html += '.no-cover{width:60px; wysokość: 60px; tło: #ddd;promień granicy: 5px; display:flex; wyrównanie-elementy: środek; justify-content:center; font-size:24px;}';
 html += '@media print{body{padding:0;}. statystyki{background:#f5f5f5 !important;-webkit-print-color-adjust:exact; druk-kolor-dostosowując:dokładnie;}}';
 html += '</style></head><body>';
 
html += '<h1> 🎵 Moja Kolekcja Muzyki</h1>';
 html += '<p style="text-align:center; kolor:#666;" >Wydrukowano: ' + nowy Date().toLocaleDateString('pl-PL') + '</p>';
 
Statystyki
 html += '<div class="stats">';
 html += '<div class="stat"><div class="stat-num">' + ownedAlbums.length + '</div><div class="stat-label">Albumów</div></div>';
 html += '<div class="stat"><div class="stat-num">' + Object.keys(byArtist).length + '</div><div class="stat-label">Artystów</div></div>';
 html += '<div class="stat"><div class="stat-num">' + albums.filter(function(a){return a.favorite;}). długość + '</div><div class="stat-label">Ulubionych</div></div>';
 html += '<div class="stat"><div class="stat-num">' + wishlistAlbums.length + '</div><div class="stat-label">Na liście życzeń</div></div>';
 html += '</div>';
 
Lista życzeń
 if (wishlistAlbums.length > 0) {
 html += '<div class="wishlist-section"><h2> 📋 Lista życzeń (' + wishlistAlbums.length + ')</h2>';
 wishlistAlbums.forEach(function(a) {
 html += '<div class="album">';
 html += a.coverUrl ? '<img src="' + a.coverUrl + '">' : '<div class="no-cover">🎵</div>';
 html += '<div class="album-info">';
 html += '<div class="album-title">' + escapeHtml(a.title) + '</div>';
 html += '<div class="album-meta">' + escapeHtml(a.artist) + (a.year ? ' • ' + a.rok : '') + '</div>';
 html += '</div></div>';
 });
 html += '</div>';
 }
 
Kolekcja według artystów
 html += '<h2> 📀 Kolekcja (' + ownedAlbums.length + ' albumów)</h2>';
 
sortedArtists.forEach(function(artist) {
 var artistAlbums = byArtist[artist].filter(function(a) { return !a.wishlist; });
 if (artistAlbums.length === 0) return;
 
html += '<h3>' + escapeHtml(artysta) + ' (' + artistAlbums.length + ')</h3>';
 
artistAlbums.sort(function(a, b) { return (a.year || 0) - (b.year || 0); });
 
artistAlbums.forEach(function(a) {
 html += '<div class="album">';
 html += a.coverUrl ? '<img src="' + a.coverUrl + '">' : '<div class="no-cover">🎵</div>';
 html += '<div class="album-info">';
 html += '<div class="album-title">' + escapeHtml(a.title) + ' <span class="stars">' + getStars(a.rating || 3) + '</span></div>';
 html += '<div class="album-meta">';
 html += (a.year ? a.year + ' • ' : '') + getGenreName(a.genre) + ' • ' + getFormatName(a.format);
 jeśli (a.favorite) html += ' • ❤️ ';
 html += '</div>';
 html += '</div></div>';
 });
 });
 
html += '<p style="text-align:center; margin-top: 40px; kolor: #999; czcionka:12px;" >Wygenerowano przez Kolekcja Muzyki App</p>';
 html += '</body></html>';
 
printWindow.document.write(html);
 printWindow.document.close();
 
setTimeout(function() {
 printWindow.print();
 }, 500);
 
showNotification('🖨️ Otwarto okno drukowania!', 'info');
}

// ==========================================
🎨 RENDEROWANIE
// ==========================================

function renderAlbums() {
 console.log(' 🎨 renderAlbums wywołane, albums.length:', albums ? albums.length : 'undefined');
 jeśli (! Array.isArray(albums)) albumy = [];
 var search = (document.getElementById('searchInput') || {}).value || '';
 search = search.toLowerCase();
 var genre = (document.getElementById('filterGenre') || {}).value || 'wszystkie';
 var format = (document.getElementById('filterFormat') || {}).value || 'wszystkie';
 var sort = (document.getElementById('sortBy') || {}).value || 'najnowszy';
 var favOnly = (document.getElementById('showFavoritesOnly') || {}).sprawdzone || false;
 var wishlistOnly = (document.getElementById('showWishlistOnly') || {}).sprawdzone || fałsz;

var filtered = albums.filter(function(a) {
 return (a.artist.toLowerCase().indexOf(search) !== -1 || a.title.toLowerCase().indexOf(search) !== -1) &&
 (gatunek === 'wszystkie' || a.gatunek === gatunek) &&
 (format === 'wszystkie' || a.format === format) &&
 (!favOnly || a.favorite) &&
 (!wishlistOnly || a.wishlist);
 });

filtered.sort(function(a, b) {
 przełącznik (sort) {
 przypadek 'najnowszy': return (b.dateAdded || 0) - (a.dateAdded || 0);
 przypadek 'artysta': return a.artist.localeCompare(b.artist);
 przypadek 'title': return a.title.localeCompare(b.title);
 przypadek 'ocena': return (b.rating || 0) - (a.rating || 0);
 przypadek 'rok': return (b.year || 0) - (a.year || 0);
 Przypadek 'ulubionych': powrót (b.ulubiony ? 1 : 0) - (a. ulubiony ? 1 : 0);
 przypadek 'wishlist': return (b.wishlist ? 1 : 0) - (a.wishlist ? 1 : 0);
 domyślnie: return 0;
 }
 });

var countEl = document.getElementById('albumCount');
 jeśli (countEl) countEl.textContent = '(' + filtered.length + ')';
 var list = document.getElementById('albumsList');
 console.log(' 🎨 albumsList znaleziony:', !! list, 'filtered.length:', filtered.length);
 if (!list) { console.error(' ❌ Nie znaleziono #albumsList!'); return; }
 if (filtrowany.długość === 0) { 
 list.innerHTML = '<p class="empty-message"> 🎵 Brak albumów</p>'; 
 } else { 
 var html = ''; 
 filtered.forEach(function(a) { html += createAlbumCard(a); }); 
 console.log('🎨 HTML length:', html.length);
 list.innerHTML = html; 
 }
 list.className = currentView === 'siatka' ? 'albums-grid': 'albums-list';
 updateStats();
}

function createAlbumCard(a) {
 var cover = a.coverUrl ? '<img src="' + a.coverUrl + '" onerror="this.parentElement.innerHTML=\'🎵\'"">' : '🎵';
 var tracks = a.tracks ? ' • ' + a.tracks.length + ' utw.' : '';
 var wishlistBadge = a.wishlist ? '<span class="wishlist-badge"> 📋 Lista życzeń</span>' : '';
 var wishlistBtn = a.wishlist ? '✅' : '📋';
 return '<div class="album-card" + (a.wishlist ? ' wishlist-item' : '') + '"><div class="album-cover" onclick="showDetails(\'' + a.id + '\')">' + cover + wishlistBadge + '</div><div class="album-info"><div class="album-header"><span class="album-artist">' + escapeHtml(a.artist) + '</span><div class="album-header-btns"><button class="album-wishlist" onclick="toggleWishlist(\'' + a.id + '\')" title="Lista życzeń">' + wishlistBtn + '</button><button class="album-favorite"  onclick="toggleFavorite(\'' + a.id + '\')">' + (a.favorite ? '❤️' : '🤍') + '</button></div></div><h3 class="album-title" onclick="showDetails(\'' + a.id + '\')">' + escapeHtml(a.title) + '</h3><div class="album-meta">' + (a.year ? '<span> 📅 ' + a.year + '</span>' : '') + '<span>' + getGenreName(a.) gatunek) + utwory + '</span></div><div class="album-rating">' + getStars(a.rating || 3) + '</div><div class="album-actions"><button class="btn-play" onclick="playAlbum(\'' + a.id + '\')">▶️</button><button class="btn-edit" onclick="openEditModal(\'' + a.id + '\')">✏️</button><button class="btn-delete" onclick="deleteAlbum(\'' + a.id + '\')">🗑️< /button></div></div></div>';
}

// ==========================================
👁️ SZCZEGÓŁY Z TEKSTAMI
// ==========================================

funkcja pokażSzczegóły(id) {
 var a = albums.find(function(x) { return x.id === id; });
 jeśli (!a) return;
 
var tracks = '';
 if (a.tracks & a.tracks.length > 0) {
 tracks = '<div style="margin-top:20px; Border-top: 1px stałe RGBA (255,255,255,0,1); Padding-top:20px;" >' +
 '<h3> 🎵 Utwory (' + a.tracks.length + ')</h3>' +
 '<div style="display:flex; kierunek flex:kolumna; przerwa: 5px; margin-top:10px;" >';
 
a.tracks.forEach(function(t, i) {
 var trackTitle = t.title || 'Utwór' + (i + 1);
 var youtubeUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(a.artist + ' ' + TrackTitle);
 var geniusUrl = 'https://genius.com/search?q=' + encodeURIComponent(a.artist + ' ' + trackTitle);
 var tekstowoUrl = 'https://www.tekstowo.pl/szukaj,wykonawca,' + encodeURIComponent(a.artist) + ',tytul,' + encodeURIComponent(trackTitle) + '.html';
 
tracks += '<div style="display:flex; wyrównanie-elementy: środek; wypełnienie: 12 px; tło: RGBBA (255,255,255,05); promień ramy: 8px; przerwa:10px;" >' +
 '<span style="width:30px; kolor: #888; text-align:center;" >' + (i + 1) + '</rozpiętość>' +
 '<div style="flex:1;" >' +
 '<div style="font-weight:500;" >' + escapeHtml(trackTitle) + '</div>' +
 '</div>' +
 '<div style="display:flex; przerwa: 5px; flex-wrap:wrap;" >' +
 (t.fileUrl 
 ? '<przycisk onclick="playTrack(\'' + a.id + '\',' + i + ')" style="background:#4ade80; granica: brak; wypełnienie: 5px 10px; promień ramy: 15px; kursor:wskaźnik;" tytuł="Odtwórz">▶️</przycisk>' 
 : '<a href="' + youtubeUrl + '" target="_blank" style="background:#ff0000; granica: brak; wypełnienie: 5px 10px; promień ramy: 15px; kursor:wskaźnik; dekoracja tekstu: brak; kolor: #fff; font-size:0.8rem;" title="YouTube"> ▶️ YT</a>') +
 '<przycisk onclick="openKaraoke(\'' + a.id + '\',' + i + ')" class="btn-karaoke" tytuł="Karaoke">🎤</button>' +
 '<a href="' + geniusUrl + '" target="_blank" style="background:#ffff64; granica: brak; wypełnienie: 5px 10px; promień ramy: 15px; kursor:wskaźnik; dekoracja tekstu: brak; color:#000;" tytuł="Genius">📝</a>' +
 '<a href="' + tekstowoUrl + '" target="_blank" style="background:#a855f7; granica: brak; wypełnienie: 5px 10px; promień ramy: 15px; kursor:wskaźnik; dekoracja tekstu: brak; kolor: #fff; font-size:0.7rem;" title="Tekstowo.pl">PL</a>' +
 '</div>' +
 '</div>';
 });
 
utwory += '</div></div>';
 }
 
var youtubeAlbumUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(a.artist + ' ' + a.title + ' pełny album');
 var spotifyUrl = 'https://open.spotify.com/search/' + encodeURIComponent(a.artist + ' ' + a.title);
 var geniusAlbumUrl = 'https://genius.com/search?q=' + encodeURIComponent(a.artist + ' ' + a.title);
 var tekstowoAlbumUrl = 'https://www.tekstowo.pl/szukaj,wykonawca,' + encodeURIComponent(a.artist) + '.html';
 var azlyricsUrl = 'https://search.azlyrics.com/search.php?q=' + encodeURIComponent(a.artist);
 
var quickLyrics = '<div style="margin-top:20px; wypełnienie: 15 px; tło: RGBBA (255,255,255,05); promień granicy: 10px;" >' +
 '<strong> 🔍 Szukaj tekstów:</strong><br><br>' +
 '<a href="' + geniusAlbumUrl + '" target="_blank" style="display:inline-block; Tło: #ffff64; kolor: #000; wypełnienie: 8px 15px; promień granicy: 20px; dekoracja tekstu: brak; margin-prawa: 10px; margines-dole:5px;" > 📝 Genius</a>' +
 '<a href="' + tekstowoAlbumUrl + '" target="_blank" style="display:inline-block; tło: #a855f7; kolor: #fff; wypełnienie: 8px 15px; promień granicy:20px; dekoracja tekstu: brak; margin-prawa: 10px; margines-dole:5px;" > 🇵🇱 Tekstowo.pl</a>' +
 '<a href="' + azlyricsUrl + '" target="_blank" style="display:inline-block; Tło: #3b82f6; kolor: #fff; wypełnienie: 8px 15px; promień granicy: 20px; dekoracja tekstu: brak; margines-dole:5px;" > 🌐 AZLyrics</a>' +
 '</div>';
 
document.getElementById('detailsContent').innerHTML = 
 '<div class="details-header">' +
 (a.coverUrl ? '<img src="' + a.coverUrl + '" class="details-cover">' : '<div class="details-cover" style="font-size:4rem; display:flex; wyrównanie-elementy: środek; justify-content:center;" >🎵</div>') +
 '<div class="details-main">' +
 '<h2>' + escapeHtml(a.title) + '</h2>' +
 '<p class="details-artist">' + escapeHtml(a.artist) + '</p>' +
 '<div>' + getStars(a.rating || 3) + '</div>' +
 '<div style="margin-top:10px;" >' +
 (rok ? '<span style="background:rgba(255,255,255,0.1); wypełnienie: 5px 10px; promień ramy: 15px; margin-right:5px;" > 📅 ' + rok + '</rozpięty>' : '') +
 '<span style="background:rgba(255,255,255,0.1); wypełnienie: 5px 10px; promień granicy: 15px;" >' + getGenreName(a.genre) + '</span>' +
 (a.tracks? '<span style="background:rgba(255,255,255,0.1); wypełnienie: 5px 10px; promień ramy: 15px; margin-left:5px;" > 🎵 ' + a.tracks.length + ' utworów</span>' : '') +
 '</div>' +
 '</div>' +
 '</div>' +
 '<div style="margin-top:20px; display:flex; przerwa:10px; flex-wrap:wrap;" >' +
 '<a href="' + youtubeAlbumUrl + '" target="_blank" style="background:#ff0000; kolor: #fff; wypełnienie: 10px 20px; granica: brak; promień granicy: 20px; kursor:wskaźnik; dekoracja tekstu: brak; display:inline-block;" > ▶️ YouTube</a>' +
 '<a href="' + spotifyUrl + '" target="_blank" style="background:#1DB954; kolor: #fff; wypełnienie: 10px 20px; granica: brak; promień granicy: 20px; kursor:wskaźnik; dekoracja tekstu: brak; display:inline-block;" > 🎵 Spotify</a>' +
 '<przycisk onclick="toggleFavorite(\'' + a.id + '\'); showDetails(\'' + a.id + '\');" style="background:#fbbf24; kolor: #000; wypełnienie: 10px 20px; granica: brak; promień granicy: 20px; kursor:wskaźnik;" >' + (a.favorite ? ' 💔 Usuń z ulubionych' : '❤️ Ulubione') + '</button>' +
 '<przycisk onclick="toggleWishlist(\'' + a.id + '\'); showDetails(\'' + a.id + '\');" style="background:' + (a.wishlist ? '#22c55e' : '#f59e0b') + '; kolor: #000; wypełnienie: 10px 20px; granica: brak; promień granicy: 20px; kursor:wskaźnik;" >' + (a.wishlist ? '✅ Mamo!' : '📋 Lista życzeń') + '</przycisk>' +
 '<przycisk onclick="openEditModal(\'' + a.id + '\')" style="background:#3b82f6; kolor: #fff; wypełnienie: 10px 20px; granica: brak; promień granicy: 20px; kursor:wskaźnik;" > ✏️ Edytuj</button>' +
 '<przycisk onclick="deleteAlbum(\'' + a.id + '\')" style="background:#ef4444; kolor: #fff; wypełnienie: 10px 20px; granica: brak; promień granicy: 20px; kursor:wskaźnik;" > 🗑️ Usuń</button>' +
 '</div>' +
 (a.Notatki ? '<div style="margin-top:20px; wypełnienie: 15 px; tło: RGBBA (255,255,255,05); promień granicy: 10px;" > 📝 <strong>Notatki:</strong> ' + escapeHtml(a.notes) + '</div>' : '') +
 quickLyrics +
 utwory;
 
document.getElementById('detailsModal').classList.add('active');
}

funkcja closeDetailsModal() { document.getElementById('detailsModal').classList.remove('active'); }

// ==========================================
✏️ EDYCJA
// ==========================================

function openEditModal(id) {
 var a = albums.find(function(x) { return x.id === id; });
 jeśli (!a) return;
 document.getElementById('editId').value = a.id;
 document.getElementById('editArtist').value = a.artist;
 document.getElementById('editTitle').value = a.title;
 document.getElementById('editYear').value = a.year || '';
 document.getElementById('editGenre').value = a.genre;
 document.getElementById('editFormat').value = a.format || 'cd';
 document.getElementById('editRating').value = a.rating || 3;
 document.getElementById('editCoverUrl').value = a.coverUrl || '';
 document.getElementById('editNotes').value = a.notes || '';
 document.getElementById('editRatingValue').textContent = getStars(a.rating || 3);
 document.getElementById('editCoverPreview').innerHTML = a.coverUrl ? '<img src="' + a.coverUrl + '">' : '';
 document.getElementById('editModal').classList.add('active');
}

funkcja closeEditModal() { document.getElementById('editModal').classList.remove('active'); }

// ==========================================
📤 EKSPORT
// ==========================================

funkcja exportData() {
 var blob = nowy Blob([JSON.stringify(albums, null, 2)], { type: 'application/json' });
 var a = document.createElement('a');
 a.href = URL.createObjectURL(blob);
 a.download = 'kolekcja-' + new Date().toISOString().split('T')[0] + '.json';
 a.click();
 showNotification('📤 Wyeksportowano!');
}

funkcja setView(v) {
 currentView = v;
 document.getElementById('gridView').classList.toggle('active', v === 'grid');
 document.getElementById('listView').classList.toggle('active', v === 'list');
 renderAlbums();
}

// ==========================================
🚀 INICJALIZACJA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
 console.log('🎵 Inicjalizacja...');
 
Inicjalizacja Firebase (jeśli dostępny)
 initFirebase();
 
initAudioPlayer();

var albumForm = document.getElementById('albumForm');
 console.log(' 🎵 albumForm znaleziony:', !! albumForm);
 if (albumForm) {
 albumForm.addEventListener('submit', function(e) {
 e.preventDefault();
 console.log('🎵 Formularz wysłany!');
 var data = {
 artysta: document.getElementById('artist').value.trim(),
 tytuł: document.getElementById('title').value.trim(),
 year: parseInt(document.getElementById('year').value) || null,
 gatunek: document.getElementById('gatunek).value,
 format: document.getElementById('format').value,
 ocena: parseInt(document.getElementById('rating').value),
 coverUrl: document.getElementById('coverUrl').value.trim() || null,
 notatki: document.getElementById('notes').value.trim() || null
 };
 console.log 🎵('Dane formularza:', data);
 addAlbum(data);
 this.reset();
 document.getElementById('ratingValue').textContent = getStars(3);
 document.getElementById('coverPreview').innerHTML = '';
 });
 }

var rating = document.getElementById('rating');
 if (rating) rating.addEventListener('input', function(e) { document.getElementById('ratingValue').textContent = getStars(parseInt(e.target.value)); });
 
var editRating = document.getElementById('editRating');
 if (editRating) editRating.addEventListener('input', function(e) { document.getElementById('editRatingValue').textContent = getStars(parseInt(e.target.value)); });

var coverUrl = document.getElementById('coverUrl');
 if (coverUrl) coverUrl.addEventListener('input', function(e) { document.getElementById('coverPreview').innerHTML = e.target.value ? '<img src="' + e.target.value + '">' : ''; });
 
var editCoverUrl = document.getElementById ('editCoverUrl');
 if (editCoverUrl) editCoverUrl.addEventListener('input', function(e) { document.getElementById('editCoverPreview').innerHTML = e.target.value ? '<img src="' + e.target.value + '">' : ''; });

var editForm = document.getElementById('editForm');
 if (editForm) {
 editForm.addEventListener('submit', function(e) {
 e.preventDefault();
 updateAlbum(document.getElementById('editId').value, {
 artysta: document.getElementById('editArtist').value.trim(),
 tytuł: document.getElementById('editTitle').value.trim(),
 year: parseInt(document.getElementById('editYear').value) || null,
 gatunek: document.getElementById('editGenre').value,
 format: document.getElementById('editFormat').value,
 ocena: parseInt(document.getElementById('editRating').value),
 coverUrl: document.getElementById('editCoverUrl').value.trim() || null,
 notatki: document.getElementById('editNotes').value.trim() || null
 });
 closeEditModal();
 });
 }

var searchInput = document.getElementById('searchInput');
 if (searchInput) searchInput.addEventListener('input', renderAlbums);
 var filterGenre = document.getElementById('filterGenre');
 jeśli (filterGenre) filterGenre.addEventListener('change', renderAlbums);
 var filterFormat = document.getElementById('filterFormat');
 if (filterFormat) filterFormat.addEventListener('change', renderAlbums);
 var sortBy = document.getElementById('sortBy');
 jeśli (sortBy) sortBy.addEventListener('change', renderAlbums);
 var showFavoritesOnly = document.getElementById('showFavoritesOnly');
 jeśli (pokażUlubioneOnly) pokażUlubioneOnly.addEventListener('change', renderAlbums);
 var showWishlistOnly = document.getElementById('showWishlistOnly');
 jeśli (pokażListęŻyczeńOnly) pokażListę życzeńOnly.addEventListener('zmiana', renderAlbumy);

var importFile = document.getElementById('importFile');
 if (importFile) {
 importFile.addEventListener('change', function(e) {
 plik var = e.target.files[0];
 if (!file) return;
 var reader = nowy FileReader();
 reader.onload = function(ev) {
 try {
 var imported = JSON.parse(ev.target.result);
 if (Array.isArray(imported) & confirm('Importować ' + imported.length + ' albumów?')) {
 imported.forEach(function(item) { var data = Object.assign({}, item); usuń data.id; addAlbum(data); });
 }
 } catch (err) { showNotification(' ❌ Błąd importu!', 'error'); }
 };
 reader.readAsText(plik);
 e.target.value = '';
 });
 }

var folderInput = document.getElementById('folderInput');
 if (folderInput) {
 folderInput.addEventListener('change', function(e) {
 pliki var = [];
 for (var i = 0; i < e.target.files.length; i++) { var f = e.target.files[i]; if (f.name.match(/\.( mp3|flac|ogg|m4a|wav)$/i)) files.push(f); }
 if (files.length === 0) { showNotification(' ⚠️ Brak plików audio!', 'warning'); return; }
 scanAudioFiles(pliki);
 });
 }

var filesInput = document.getElementById('filesInput');
 if (filesInput) {
 filesInput.addEventListener('change', function(e) {
 pliki var = [];
 for (var i = 0; i < e.target.files.length; i++) files.push(e.target.files[i]);
 if (files.length === 0) { showNotification(' ⚠️ Nie wybrano plików!', 'warning'); return; }
 scanAudioFiles(pliki);
 });
 }

loadTheme();
 useFirebase = localStorage.getItem('useFirebase') === 'true';
 
Jeśli użytkownik chciał Firebase, ale nie jest dostępny, ostrzeż
 if (useFirebase && !isFirebaseAvailable()) {
 console.warn(' ⚠️ Firebase był zapisany jako preferowany, ale jest niedostępny');
 useFirebase = false;
 localStorage.setItem('useFirebase', 'false');
 }
 
loadData();
 console.log('🎵 Kolekcja Muzyki v5.0 załadowana!');
});
// ==========================================
🎤 KARAOKE - SYNCHRONIZOWANE TEKSTY
// ==========================================

var karaokeState = {
 Tekst: [],
 currentLine: 0,
 intervalId: null,
 isActive: false,
 currentAlbumId: null,
 currentTrackIndex: null
};

Pobierz tekst z wielu źródeł
function fetchLyrics(artysta, tytuł, nawiązanie) {
 console.log('🎤 Szukam tekstu:', artysta, '-', tytuł);
 
Wyczyść artystę z śmieci (np. "! WWW.POLSKIE-MP3.TK !")
 var cleanArtist = artist.replace(/[!@#$%^&*()]+/g, '').replace(/www\.[ ^\s]+/gi, '').zastąp(/\s+/g, ' ').trim();
 var cleanTitle = title.replace(/[!@#$%^&*()]+/g, '').replace(/\(\d{4}\)/g, '').replace(/cd\d+/gi, '').replace(/\s+/g, ' ').trim();
 
console.log('🎤 Wyczyszczone:', cleanArtist, '-', cleanTitle);
 
Próba 1: LRCLIB (ma synchronizowane teksty)
 fetchFromLRCLIB(cleanArtist, cleanTitle, function(data) {
 if (data) {
 console.log('🎤 Znaleziono w LRCLIB');
 callback(dane);
 } else {
 Próba 2: lyrics.ovh (proste API, dużo tekstów)
 fetchFromLyricsOvh(cleanArtist, cleanTitle, function(data2) {
 if (data2) {
 console.log('🎤 Znaleziono w lyrics.ovh');
 callback(data2);
 } else {
 console.log(' 🎤 Nie znaleziono tekstu');
 callback(null);
 }
 });
 }
 });
}

function fetchFromLRCLIB(artist, title, callback) {
 var url = 'https://lrclib.net/api/get?artist_name=' + encodeURIComponent(artist) + '&track_name=' + encodeURIComponent(title);
 
fetch(url)
 .then(function(response) {
 if (!response.ok) wyrzuć nowy błąd('Nie znaleziono');
 return response.json();
 })
 .then(function(data) {
 if (data.syncedLyrics) {
 var lines = parseLRC(data.syncedLyrics);
 callback({ synced: true, lines: lines, plain: data.plainLyrics || data.syncedLyrics, źródło: 'LRCLIB' });
 } else if (data.plainLyrics) {
 callback({ synced: false, lines: [], plain: data.plainLyrics, źródło: 'LRCLIB' });
 } else {
 callback(null);
 }
 })
 .catch(function() {
 callback(null);
 });
}

function fetchFromLyricsOvh(artist, title, callback) {
 var url = 'https://api.lyrics.ovh/v1/' + encodeURIComponent(artist) + '/' + encodeURIComponent(title);
 
fetch(url)
 .then(function(response) {
 if (!response.ok) wyrzuć nowy błąd('Nie znaleziono');
 return response.json();
 })
 .then(function(data) {
 if (data.lyrics) {
 callback({ synchronizacja: false, linie: [], pojedyncze: data.lyrics, źródło: 'Lyrics.ovh' });
 } else {
 callback(null);
 }
 })
 .catch(function() {
 callback(null);
 });
}

Parsuj format LRC na tablicę obiektów {time, text}
funkcja parseLRC(lrcText) {
 linie var = [];
 var regex = /\[(\d{2}):(\d{2})[\.\:](\d{2,3})\](.*)/g;
 VAR;
 
while ((match = regex.exec(lrcText)) !== null) {
 var minutes = parseInt(match[1]);
 var seconds = parseInt(match[2]);
 var ms = parseInt(match[3]);
 jeśli (match[3].długość === 2) ms *= 10;
 
var timeInSeconds = minuty * 60 + sekund + ms / 1000;
 var text = match[4].trim();
 
if (text) {
 lines.push({ time: timeInSeconds, tekst: text });
 }
 }
 
return lines.sort(function(a, b) { return a.time - b.time; });
}

Otwórz modal karaoke
function openKaraoke(albumId, trackIndex) {
 var album = albums.find(function(a) { return a.id === albumId; });
 if (!album || !album.tracks || !album.tracks[trackIndex]) {
 showNotification('⚠️ Nie znaleziono utworu', 'warning');
 powrót;
 }
 
karaokeState.currentAlbumId = albumId;
 karaokeState.currentTrackIndex = trackIndex;
 
VAR TRack = album.tracks[trackIndex];
 var trackTitle = track.title || 'Utwór' + (trackIndex + 1);
 
Pokaż modal z ładowaniem
 var modal = document.getElementById('karaokeModal');
 if (!modal) {
 createKaraokeModal();
 modal = document.getElementById('karaokeModal');
 }
 
document.getElementById('karaokeTitle').textContent = trackTitle;
 document.getElementById('karaokeArtist').textContent = album.artist;
 document.getElementById('karaokeCover').src = album.coverUrl || '';
 document.getElementById('karaokeCover').style.display = album.coverUrl ? 'blok': 'brak';
 document.getElementById('karaokeLyrics').innerHTML = '<div class="karaoke-loading"> 🔍 Szukam tekstu w bazach... </div>';
 document.getElementById('karaokeControls').classList.add('hidden');
 
modal.classList.add('active');
 
Pobierz tekst
 fetchLyrics(album.artist, trackTitle, function(data) {
 if (!data) {
 document.getElementById('karaokeLyrics').innerHTML = 
 '<div class="karaoke-not-found">' +
 '<p> 😔 Nie znaleziono tekstu w bazach online</p>' +
 '<p style="font-size:0.85rem; kolor: #888; margin-top:5px;" >Polskie piosenki rzadko są w darmowych bazach</p>' +
 '<div style="margin-top:20px;" >' +
 '<h4 style="margin-bottom:10px;" > 🔍 Szukaj tekstu:</h4>' +
 '<a href="https://www.tekstowo.pl/szukaj,wykonawca,' + encodeURIComponent(album.artist) + ',tytul,' + encodeURIComponent(trackTitle) + '.html" target="_blank" class="karaoke-link"> 🇵🇱 Tekstowo.pl</a>' +
 '<a href="https://www.teksciory.pl/szukaj?q=' + encodeURIComponent(album.artist + ' ' + TrackTitle) + '" target="_blank" class="karaoke-link"> 🇵🇱 Teksciory.pl</a>' +
 '<a href="https://genius.com/search?q=' + encodeURIComponent(album.artist + ' ' + trackTitle) + '" target="_blank" class="karaoke-link"> 📝 Genius</a>' +
 '<a href="https://www.azlyrics.com/lyrics/' + encodeURIComponent(album.artist.toLowerCase().replace(/\s+/g, '')) + '/' + encodeURIComponent(trackTitle.toLowerCase().replace(/\s+/g, '')) + '.html" target="_blank" class="karaoke-link"> 🌐 AZLyrics</a>' +
 '</div>' +
 '<div style="margin-top:25px; wyduszka-góra: 20px; Border-top: 1px stałe RGBA (255,255,255,0.1);" >' +
 '<h4 style="margin-bottom:10px;" > 📋 Wklej własny tekst:</h4>' +
 '<p style="font-size:0.8rem; kolor: #888; margines-dolny:10px;" >Skopiuj tekst ze strony i wklej poniżej</p>' +
 '<textarea id="manualLyricsInput" placeholder="Wklej tekst piosenki tutaj..." style="szerokość:100%; wysokość: 150px; tło: rgba (0,0,0,0,0,3); Border: 1px stałe RGBA (255,255,255,0,2); promień granicy: 10px; wypełnienie: 10px; kolor: #fff; rozmiar czcionki: 0,9 rem; resize:vertical;" ></textarea>' +
 '<przycisk onclick="applyManualLyrics()" style="margin-top:10px; wypełnienie: 10px 20px; Tło: #4ade80; granica: brak; promień granicy: 20px; kursor:wskaźnik; font-weight:bold;" > ✅ Zastosuj tekst</button>' +
 '</div>' +
 '</div>';
 powrót;
 }
 
var sourceInfo = data.source ? '<p style="text-align:center; rozmiar czcionki: 0,75 rem; kolor: #888; margines-dolny:10px;" >Źródło: ' + data.source + (data.synced ? ' (synchronizowany)' : '') + '</p>' : '';
 
karaokeState.lyrics = data.lines;
 karaokeState.currentLine = 0;
 karaokeState.isActive = data.synced;
 
if (data.synced & data.lines.length > 0) {
 Synchronizowane karaoke
 document.getElementById('karaokeLyrics').innerHTML = sourceInfo;
 renderKaraokeLyrics(data.lines);
 document.getElementById('karaokeControls').classList.remove('hidden');
 showNotification('🎤 Znaleziono zsynchronizowany tekst!', 'success');
 
Automatycznie rozpocznij synchronizację, jeśli jest odtwarzanie
 if (audioPlayer.isPlaying & audioPlayer.currentAlbum && audioPlayer.currentAlbum.id === albumId) {
 startKaraokeSync();
 }
 } else {
 Zwykły tekst
 document.getElementById('karaokeLyrics').innerHTML = 
 sourceInfo +
 '<div class="karaoke-plain">' + 
 '<pre>' + escapeHtml(data.plain) + '</pre>' +
 '</div>';
 showNotification('📝 Znaleziono tekst (bez synchronizacji)', 'info');
 }
 });
}

Zastosuj ręcznie wklejony tekst
function applyManualLyrics() {
 var textarea = document.getElementById('manualLyricsInput');
 if (!textarea || !textarea.value.trim()) {
 showNotification('⚠️ Wklej tekst!', 'warning');
 powrót;
 }
 
var text = textarea.value.trim();
 
Sprawdź czy to format LRC (z timestampami)
 var isLRC = /\[\d{2}:\d{2}[\.:]\d{2,3}\]/.test(text);
 
if (isLRC) {
 var lines = parseLRC(text);
 jeśli (linie.długość > 0) {
 karaokeState.lyrics = linie;
 karaokeState.currentLine = 0;
 karaokeState.isActive = prawdziwe;
 renderKaraokeLyrics (wersy);
 document.getElementById('karaokeControls').classList.remove('hidden');
 showNotification(' 🎤 Tekst LRC załadowany! Kliknij synchronizuj.', 'success');
 powrót;
 }
 }
 
Zwykły tekst
 document.getElementById('karaokeLyrics').innerHTML = 
 '<div class="karaoke-plain">' + 
 '<pre>' + escapeHtml(text) + '</pre>' +
 '</div>';
 showNotification('📝 Tekst załadowany', 'info');
}

function createKaraokeModal() {
 var modalHtml = 
 '<div id="karaokeModal" class="modal">' +
 '<div class="modal-content modal-karaoke">' +
 '<span class="close" onclick="closeKaraokeModal()">&times; </rozpiętość>' +
 '<div class="karaoke-header">' +
 '<img id="karaokeCover" src="" alt="" class="karaoke-album-art">' +
 '<div>' +
 '<h2 id="karaokeTitle">-</h2>' +
 '<p id="karaokeArtist" klasa="karaoke-artist">-</p>' +
 '</div>' +
 '</div>' +
 '<div id="karaokeLyrics" class="karaoke-lyrics"></div>' +
 '<div id="karaokeControls" class="karaoke-controls hidden">' +
 '<div id="karaokePlayerStatus" style="margin-bottom:10px; wypełnienie: 10px; tło: rgba (255,0,0,0,2); promień granicy: 10px; font-size: 0,85rem;" >' +
 ' ⚠️ Aby synchronizacja działała, musisz odtwarzać plik MP3 z tego albumu (przycisk ▶️ przy utworze)' +
 '</div>' +
 '<przycisk onclick="startKaraokeSync()" class="btn-karaoke-sync"> ▶️ Włącz synchronizację</button>' +
 '<przycisk onclick="manualKaraokeScroll()" class="btn-karaoke-manual" style="margin-left:10px; wypełnienie: 10px 20px; Tło: #3b82f6; granica: brak; promień granicy: 20px; kolor: #fff; kursor:wskaźnik;" > ⏬ Przewijaj ręcznie</button>' +
 '<p class="karaoke-hint"> 💡 Kliknij na linijkę tekstu żeby do niej przejść</p>' +
 '</div>' +
 '</div>' +
 '</div>';
 
document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderKaraokeLyrics(lines) {
 var container = document.getElementById('karaokeLyrics');
 var html = '<div class="karaoke-synced">';
 lines.forEach(function(line, i) {
 html += '<div class="karaoke-line" data-index="' + i + '" data-time="' + line.time + '" onclick="jumpToKaraokeLine(' + i + ')">' + escapeHtml(line.text) + '</div>';
 });
 html += '</div>';
 container.innerHTML = html;
}

Przejdź do konkretnej linijki (kliknięcie)
function jumpToKaraokeLine(index) {
 karaokeState.currentLine = indeks;
 wyróżnienie KaraokeLine (indeks);
 
Jeśli odtwarzamy audio, przewiń też audio
 if (audioPlayer.element && karaokeState.lyrics[index]) {
 audioPlayer.element.currentTime = karaokeState.lyrics[index].time;
 }
}

Ręczne przewijanie (bez audio)
var manualScrollActive = false;
function manualKaraokeScroll() {
 manualScrollActive = !manualScrollActive;
 
if (manualScrollActive) {
 showNotification('⏬ Użyj strzałek ↑↓ lub klikaj na tekst', 'info');
 document.addEventListener ('keydown', karaokeKeyHandler);
 } else {
 document.removeEventListener ('keydown', karaokeKeyHandler);
 showNotification('⏹️ Ręczne przewijanie wyłączone', 'info');
 }
}

function karaokeKeyHandler(e) {
 if (e.key === 'ArrowDown' || e.key === ' ') {
 e.preventDefault();
 var next = Math.min(karaokeState.currentLine + 1, karaokeState.lyrics.length - 1);
 karaokeState.currentLine = następny;
 wyróżnienie KaraokeLine (następny);
 } w przeciwnym razie jeśli (e.key === 'ArrowUp') {
 e.preventDefault();
 var prev = Math.max(karaokeState.currentLine - 1, 0);
 karaokeState.currentLine = prev;
 wyróżnienie KaraokeLine (wcześniej);
 }
}

function startKaraokeSync() {
 Sprawdź, czy audio jest dostępne
 if (!audioPlayer.element || !audioPlayer.element.src) {
 document.getElementById('karaokePlayerStatus').innerHTML = 
 ' ❌ <strong>Nie odtwarzasz żadnego audio!</strong><br>' +
 'Zamknij to okno, kliknij ▶️ przy utworze żeby odtworzyć plik MP3, potem wróć tutaj.';
 document.getElementById('karaokePlayerStatus').style.background = 'rgba(255,0,0,0.3)';
 showNotification('⚠️ Najpierw odtwórz plik MP3!', 'warning');
 powrót;
 }
 
if (karaokeState.intervalId) {
 clearInterval(karaokeState.intervalId);
 }
 
document.getElementById('karaokePlayerStatus').innerHTML = ' ✅ Synchronizacja aktywna!';
 document.getElementById('karaokePlayerStatus').style.background = 'rgba(74,222,128,0.2)';
 
karaokeState.intervalId = setInterval(function() {
 if (!audioPlayer.element) return;
 
var currentTime = audioPlayer.element.currentTime;
 var newLineIndex = -1;
 
Znajdź aktualną linijkę
 for (var i = karaokeState.lyrics.length - 1; i >= 0; i--) {
 if (currentTime >= karaokeState.lyrics[i].time) {
 newLineIndex = i;
 przerwę;
 }
 }
 
if (newLineIndex !== karaokeState.currentLine & newLineIndex >= 0) {
 karaokeState.currentLine = newLineIndex;
 highlight: KaraokeLine(newLineIndex);
 }
 }, 100);
 
showNotification('🎤 Synchronizacja włączona!', 'success');
}

function highlightKaraokeLine(index) {
 var lines = document.querySelectorAll('.karaoke-line');
 lines.forEach(function(line, i) {
 line.classList.remove('active', 'past');
 jeśli (i === indeks) {
 line.classList.add('active');
 line.scrollIntoView({ zachowanie: 'smooth', block: 'center' });
 } w przeciwnym razie jeśli (i < indeks) {
 line.classList.add('past');
 }
 });
}

funkcja closeKaraokeModal() {
 var modal = document.getElementById('karaokeModal');
 if (modal) modal.classList.remove('active');
 
if (karaokeState.intervalId) {
 clearInterval(karaokeState.intervalId);
 karaokeState.intervalId = null;
 }
 karaokeState.isActive = false;
 
Wyczyść ręczne przewijanie
 manualScrollActive = false;
 document.removeEventListener ('keydown', karaokeKeyHandler);
}

// ==========================================
📱 PWA – PRACOWNIK USŁUGOWY
// ==========================================

if ('serviceWorker' w nawigatorze) {
 window.addEventListener('load', function() {
 navigator.serviceWorker.register('./sw.js')
 .then(function(registration) {
 console.log('📱 Service Worker zarejestrowany!');
 })
 .catch(function(error) {
 console.log('📱 Service Worker błąd:', błąd);
 });
 });
}
