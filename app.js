// ==========================================
// 🎵 KOLEKCJA MUZYKI v5.0
// ==========================================

var albums = [];
var currentView = 'grid';
var useFirebase = false;
var currentTheme = 'dark';
var html5QrCode = null;
var foundAlbumsFromScan = [];
var COLLECTION_NAME = 'albums';
var db = null; // Firebase Firestore - inicjalizowane później

// Sprawdź czy Firebase jest dostępny
function isFirebaseAvailable() {
    return typeof firebase !== 'undefined' && 
           typeof firebaseInitialized !== 'undefined' && 
           firebaseInitialized === true && 
           db !== null;
}

// Inicjalizacja Firebase (wywoływana po załadowaniu)
function initFirebase() {
    if (typeof firebase !== 'undefined' && typeof firebaseInitialized !== 'undefined' && firebaseInitialized) {
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
    playlist: [],
    isPlaying: false
};
// ==========================================
// 🖼️ POBIERANIE BRAKUJĄCYCH OKŁADEK
// ==========================================

function fetchMissingCovers() {
    var albumsWithoutCover = albums.filter(function(a) { return !a.coverUrl; });
    
    if (albumsWithoutCover.length === 0) {
        showNotification('✅ Wszystkie albumy mają okładki!', 'success');
        return;
    }
    
    var total = albumsWithoutCover.length;
    showNotification('🖼️ Szukam okładek dla ' + total + ' albumów... (może chwilę potrwać)', 'info');
    
    var found = 0;
    var processed = 0;
    
    // Przetwarzaj po jednym albumie z dłuższym opóźnieniem (wiele API = więcej zapytań)
    function processNext(index) {
        if (index >= albumsWithoutCover.length) {
            renderAlbums();
            showNotification('🖼️ Gotowe! Znaleziono ' + found + ' z ' + total + ' okładek!', 'success');
            return;
        }
        
        var album = albumsWithoutCover[index];
        
        // Pokaż progress co 5 albumów
        if (index > 0 && index % 5 === 0) {
            showNotification('🖼️ Postęp: ' + index + '/' + total + ' (znaleziono: ' + found + ')', 'info');
        }
        
        fetchAlbumCover(album.artist, album.title, function(coverUrl) {
            processed++;
            
            if (coverUrl) {
                album.coverUrl = coverUrl;
                found++;
                
                if (useFirebase && isFirebaseAvailable()) {
                    db.collection(COLLECTION_NAME).doc(album.id).update({ coverUrl: coverUrl });
                } else {
                    saveData();
                }
                
                // Odśwież widok co 10 znalezionych
                if (found % 10 === 0) {
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
// 📀 SKANOWANIE KODU Z LISTĄ UTWORÓW
// ==========================================

function searchByBarcodeWithTracks(barcode) {
    if (!barcode || barcode.length < 8) { 
        showNotification('⚠️ Nieprawidłowy kod!', 'warning'); 
        return; 
    }
    
    var resultDiv = document.getElementById('scannerResult');
    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = '<div class="scanner-loading"><div class="spinner"></div><p>Szukam albumu i utworów...</p></div>';
    
    fetch('https://musicbrainz.org/ws/2/release/?query=barcode:' + barcode + '&fmt=json', { 
        headers: { 'User-Agent': 'MusicCollectionApp/1.0' } 
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.releases && data.releases.length > 0) {
            var release = data.releases[0];
            var releaseId = release.id;
            
            return fetch('https://musicbrainz.org/ws/2/release/' + releaseId + '?inc=recordings+artist-credits&fmt=json', {
                headers: { 'User-Agent': 'MusicCollectionApp/1.0' }
            });
        } else {
            throw new Error('Nie znaleziono');
        }
    })
    .then(function(r) { return r.json(); })
    .then(function(releaseData) {
        displayBarcodeResultsWithTracks(releaseData);
    })
    .catch(function(error) {
        console.error(error);
        resultDiv.innerHTML = '<h4>❌ Nie znaleziono</h4><p>Spróbuj wpisać kod ręcznie lub dodaj album manualnie.</p>';
    });
}

function displayBarcodeResultsWithTracks(release) {
    var resultDiv = document.getElementById('scannerResult');
    
    var artist = 'Nieznany';
    if (release['artist-credit'] && release['artist-credit'][0]) {
        artist = release['artist-credit'][0].name || release['artist-credit'][0].artist.name;
    }
    var title = release.title || 'Bez tytułu';
    var year = release.date ? release.date.substring(0, 4) : '';
    
    var tracks = [];
    if (release.media && release.media.length > 0) {
        release.media.forEach(function(medium) {
            if (medium.tracks) {
                medium.tracks.forEach(function(track) {
                    tracks.push({
                        title: track.title,
                        length: track.length ? Math.round(track.length / 1000) : null
                    });
                });
            }
        });
    }
    
    var tracksHtml = '';
    if (tracks.length > 0) {
        tracksHtml = '<div style="margin-top:15px;max-height:200px;overflow-y:auto;">' +
            '<strong>🎵 Lista utworów (' + tracks.length + '):</strong>' +
            '<div style="margin-top:10px;">';
        
        tracks.forEach(function(t, i) {
            var duration = t.length ? formatTime(t.length) : '';
            tracksHtml += '<div style="display:flex;padding:8px;background:rgba(255,255,255,0.05);border-radius:5px;margin-bottom:3px;">' +
                '<span style="width:25px;color:#888;">' + (i + 1) + '.</span>' +
                '<span style="flex:1;">' + escapeHtml(t.title) + '</span>' +
                '<span style="color:#888;">' + duration + '</span>' +
            '</div>';
        });
        
        tracksHtml += '</div></div>';
    }
    
    window.scannedTracks = tracks;
    
    var html = '<h4>✅ Znaleziono album!</h4>' +
        '<div style="background:rgba(255,255,255,0.1);padding:15px;border-radius:10px;margin-top:10px;">' +
            '<div style="font-size:1.2rem;font-weight:bold;">' + escapeHtml(title) + '</div>' +
            '<div style="color:#4ade80;">' + escapeHtml(artist) + '</div>' +
            '<div style="color:#888;margin-top:5px;">' + (year ? '📅 ' + year : '') + '</div>' +
            tracksHtml +
        '</div>' +
        '<button onclick="addAlbumFromScan(\'' + escapeHtml(artist).replace(/'/g, "\\'") + '\', \'' + escapeHtml(title).replace(/'/g, "\\'") + '\', \'' + year + '\')" style="width:100%;margin-top:15px;padding:15px;background:#4ade80;border:none;border-radius:10px;font-size:1rem;font-weight:bold;cursor:pointer;">➕ Dodaj do kolekcji</button>';
    
    resultDiv.innerHTML = html;
}

function addAlbumFromScan(artist, title, year) {
    var tracks = window.scannedTracks || [];
    
    var trackList = [];
    tracks.forEach(function(t) {
        trackList.push({
            title: t.title,
            fileUrl: null
        });
    });
    
    fetchAlbumCover(artist, title, function(coverUrl) {
        addAlbum({
            artist: artist,
            title: title,
            year: year ? parseInt(year) : null,
            genre: 'other',
            format: 'cd',
            rating: 3,
            coverUrl: coverUrl,
            tracks: trackList,
            notes: trackList.length > 0 ? trackList.length + ' utworów' : null
        });
        
        closeScannerModal();
        showNotification('✅ Album dodany z ' + trackList.length + ' utworami!', 'success');
    });
}

// ==========================================
// 🔔 POWIADOMIENIA
// ==========================================

function showNotification(msg, type) {
    type = type || 'success';
    var n = document.createElement('div');
    n.textContent = msg;
    var colors = {
        success: 'linear-gradient(135deg, #4ade80, #22c55e)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    n.style.cssText = 'position:fixed;bottom:100px;right:20px;background:' + colors[type] + ';color:' + (type === 'warning' ? '#000' : '#fff') + ';padding:15px 25px;border-radius:10px;font-weight:600;box-shadow:0 5px 20px rgba(0,0,0,0.3);z-index:3000;max-width:300px;';
    document.body.appendChild(n);
    setTimeout(function() { n.style.opacity = '0'; setTimeout(function() { n.remove(); }, 300); }, 3000);
}

// ==========================================
// 🎨 POMOCNICZE
// ==========================================

function getStars(r) {
    var stars = '';
    for (var i = 0; i < r; i++) stars += '⭐';
    for (var j = r; j < 5; j++) stars += '☆';
    return stars;
}

function escapeHtml(t) {
    if (!t) return '';
    var div = document.createElement('div');
    div.textContent = t;
    return div.innerHTML;
}

function getGenreName(g) {
    var m = {'rock':'🎸 Rock','pop':'🎤 Pop','jazz':'🎷 Jazz','classical':'🎻 Klasyczna','electronic':'🎹 Elektroniczna','hip-hop':'🎧 Hip-Hop','metal':'🤘 Metal','punk':'⚡ Punk','blues':'🎺 Blues','country':'🤠 Country','reggae':'🌴 Reggae','soul':'💜 Soul/R&B','folk':'🪕 Folk','indie':'🎭 Indie','soundtrack':'🎬 Soundtrack','other':'🎵 Inne'};
    return m[g] || g;
}

function getFormatName(f) {
    var m = {'cd':'💿 CD','vinyl':'📀 Winyl','digital':'📱 Cyfrowy','cassette':'📼 Kaseta','streaming':'🌐 Streaming'};
    return m[f] || f;
}

function formatDate(ts) { return new Date(ts).toLocaleDateString('pl-PL'); }

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

// ==========================================
// 🌙 MOTYW
// ==========================================

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.className = currentTheme + '-theme';
    document.getElementById('themeIcon').textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', currentTheme);
    showNotification('Zmieniono motyw!');
}

function loadTheme() {
    var saved = localStorage.getItem('theme');
    if (saved) {
        currentTheme = saved;
        document.body.className = currentTheme + '-theme';
        var icon = document.getElementById('themeIcon');
        if (icon) icon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    }
}

// ==========================================
// 📦 STORAGE
// ==========================================

function saveData() {
    if (!useFirebase) localStorage.setItem('musicCollection', JSON.stringify(albums));
    updateSyncStatus(useFirebase ? 'firebase' : 'local');
}

function loadData() {
    if (useFirebase && isFirebaseAvailable()) { loadFromFirebase(); } 
    else { loadFromLocalStorage(); renderAlbums(); }
}

function loadFromLocalStorage() {
    try {
        var stored = localStorage.getItem('musicCollection');
        if (stored) {
            var parsed = JSON.parse(stored);
            albums = Array.isArray(parsed) ? parsed : [];
        } else { albums = []; }
    } catch (e) { albums = []; }
    updateSyncStatus('local');
}

function loadFromFirebase() {
    if (!isFirebaseAvailable()) {
        showNotification('⚠️ Firebase niedostępny, używam localStorage', 'warning');
        useFirebase = false;
        localStorage.setItem('useFirebase', 'false');
        loadFromLocalStorage();
        renderAlbums();
        return;
    }
    showNotification('⏳ Ładowanie...', 'info');
    db.collection(COLLECTION_NAME).orderBy('dateAdded', 'desc').get()
        .then(function(snapshot) {
            albums = [];
            snapshot.forEach(function(doc) { albums.push({id: doc.id, ...doc.data()}); });
            updateSyncStatus('firebase');
            renderAlbums();
            showNotification('☁️ Załadowano ' + albums.length + ' albumów!');
        })
        .catch(function(error) {
            console.error(error);
            showNotification('❌ Błąd Firebase!', 'error');
            useFirebase = false;
            loadFromLocalStorage();
            renderAlbums();
        });
}

function updateSyncStatus(type) {
    var status = document.getElementById('syncStatus');
    var btn = document.getElementById('toggleStorage');
    if (!status || !btn) return;
    if (type === 'firebase') {
        status.textContent = '☁️ Firebase';
        status.className = 'sync-status firebase';
        btn.textContent = '💾 Lokalnie';
    } else {
        status.textContent = '💾 Lokalnie';
        status.className = 'sync-status';
        btn.textContent = '☁️ Firebase';
    }
}

function toggleStorageMode() {
    if (!useFirebase && !isFirebaseAvailable()) {
        showNotification('⚠️ Firebase niedostępny (sprawdź połączenie z internetem)', 'error');
        return;
    }
    useFirebase = !useFirebase;
    localStorage.setItem('useFirebase', useFirebase);
    if (useFirebase && albums.length > 0 && confirm('Przenieść dane do Firebase?')) { migrateToFirebase(); } 
    else { loadData(); }
}

function migrateToFirebase() {
    if (!isFirebaseAvailable()) {
        showNotification('⚠️ Firebase niedostępny!', 'error');
        useFirebase = false;
        return;
    }
    showNotification('⏳ Przenoszenie...', 'info');
    var promises = albums.map(function(album) {
        var data = Object.assign({}, album);
        delete data.id;
        data.dateAdded = data.dateAdded || Date.now();
        return db.collection(COLLECTION_NAME).add(data);
    });
    Promise.all(promises).then(function() { showNotification('✅ Przeniesione!'); loadData(); }).catch(function() { showNotification('❌ Błąd!', 'error'); });
}

// ==========================================
// ➕ CRUD
// ==========================================

// 🔍 WYKRYWANIE DUPLIKATÓW
function checkDuplicate(artist, title) {
    if (!Array.isArray(albums)) return null;
    var artistLower = artist.toLowerCase().trim();
    var titleLower = title.toLowerCase().trim();
    
    return albums.find(function(a) {
        var existingArtist = (a.artist || '').toLowerCase().trim();
        var existingTitle = (a.title || '').toLowerCase().trim();
        
        // Dokładne dopasowanie
        if (existingArtist === artistLower && existingTitle === titleLower) {
            return true;
        }
        
        // Podobieństwo (np. "The Beatles" vs "Beatles")
        var artistSimilar = existingArtist.replace(/^the\s+/i, '') === artistLower.replace(/^the\s+/i, '');
        var titleSimilar = existingTitle === titleLower || 
                          existingTitle.indexOf(titleLower) !== -1 || 
                          titleLower.indexOf(existingTitle) !== -1;
        
        return artistSimilar && titleSimilar;
    });
}

function addAlbum(albumData, skipDuplicateCheck) {
    console.log('📀 addAlbum wywołane:', albumData);
    
    if (!Array.isArray(albums)) albums = [];
    
    // Sprawdź duplikaty (chyba że skipDuplicateCheck = true)
    if (!skipDuplicateCheck) {
        var duplicate = checkDuplicate(albumData.artist, albumData.title);
        if (duplicate) {
            var msg = '⚠️ Album "' + albumData.title + '" od "' + albumData.artist + '" już istnieje w kolekcji!\n\nCzy chcesz go dodać mimo to?';
            if (!confirm(msg)) {
                showNotification('❌ Anulowano - album już istnieje', 'warning');
                return false;
            }
        }
    }
    
    albumData.dateAdded = Date.now();
    albumData.favorite = albumData.favorite || false;
    albumData.wishlist = albumData.wishlist || false;
    
    console.log('📀 useFirebase:', useFirebase, 'isFirebaseAvailable:', isFirebaseAvailable());
    
    if (useFirebase && isFirebaseAvailable()) {
        console.log('📀 Zapisuję do Firebase...');
        db.collection(COLLECTION_NAME).add(albumData)
            .then(function(docRef) { 
                console.log('📀 Firebase OK, id:', docRef.id);
                albumData.id = docRef.id; 
                albums.unshift(albumData); 
                renderAlbums(); 
                showNotification('☁️ Dodano! 🎉'); 
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
        albums.unshift(albumData);
        console.log('📀 Zapisuję lokalnie, albums.length:', albums.length);
        saveData();
        renderAlbums();
        showNotification('💾 Dodano! 🎉');
    }
    return true;
}

function updateAlbum(id, albumData) {
    if (useFirebase && isFirebaseAvailable()) {
        db.collection(COLLECTION_NAME).doc(id).update(albumData)
            .then(function() { var idx = albums.findIndex(function(a) { return a.id === id; }); if (idx !== -1) albums[idx] = Object.assign(albums[idx], albumData); renderAlbums(); showNotification('☁️ Zapisano! ✅'); })
            .catch(function() { showNotification('❌ Błąd!', 'error'); });
    } else {
        var idx = albums.findIndex(function(a) { return a.id === id; });
        if (idx !== -1) albums[idx] = Object.assign(albums[idx], albumData);
        saveData(); renderAlbums(); showNotification('💾 Zapisano! ✅');
    }
}

function removeAlbum(id) {
    if (useFirebase && isFirebaseAvailable()) {
        db.collection(COLLECTION_NAME).doc(id).delete()
            .then(function() { albums = albums.filter(function(a) { return a.id !== id; }); renderAlbums(); showNotification('☁️ Usunięto! 🗑️'); })
            .catch(function() { showNotification('❌ Błąd!', 'error'); });
    } else {
        albums = albums.filter(function(a) { return a.id !== id; });
        saveData(); renderAlbums(); showNotification('💾 Usunięto! 🗑️');
    }
}

function deleteAlbum(id) { if (confirm('Usunąć album?')) { removeAlbum(id); closeDetailsModal(); } }

function toggleFavorite(id) {
    var album = albums.find(function(a) { return a.id === id; });
    if (!album) return;
    var newFav = !album.favorite;
    if (useFirebase && isFirebaseAvailable()) {
        db.collection(COLLECTION_NAME).doc(id).update({ favorite: newFav }).then(function() { album.favorite = newFav; renderAlbums(); showNotification(newFav ? '❤️ Ulubiony!' : '🤍 Usunięto'); });
    } else {
        album.favorite = newFav; saveData(); renderAlbums(); showNotification(newFav ? '❤️ Ulubiony!' : '🤍 Usunięto');
    }
}

// 📋 WISHLIST - Lista życzeń
function toggleWishlist(id) {
    var album = albums.find(function(a) { return a.id === id; });
    if (!album) return;
    var newWish = !album.wishlist;
    if (useFirebase && isFirebaseAvailable()) {
        db.collection(COLLECTION_NAME).doc(id).update({ wishlist: newWish }).then(function() { 
            album.wishlist = newWish; 
            renderAlbums(); 
            showNotification(newWish ? '📋 Dodano do listy życzeń!' : '✅ Usunięto z listy życzeń'); 
        });
    } else {
        album.wishlist = newWish; 
        saveData(); 
        renderAlbums(); 
        showNotification(newWish ? '📋 Dodano do listy życzeń!' : '✅ Usunięto z listy życzeń');
    }
}

// Szybkie dodawanie do wishlist (bez pełnych danych)
function addToWishlist() {
    var artist = prompt('Artysta:');
    if (!artist) return;
    var title = prompt('Tytuł albumu:');
    if (!title) return;
    
    var albumData = {
        artist: artist.trim(),
        title: title.trim(),
        year: null,
        genre: 'other',
        format: 'digital',
        rating: 3,
        coverUrl: null,
        wishlist: true,
        notes: '📋 Do kupienia/posłuchania'
    };
    
    // Pobierz okładkę
    fetchAlbumCover(artist, title, function(cover) {
        if (cover) albumData.coverUrl = cover;
        addAlbum(albumData);
    });
}

// ==========================================
// 🖼️ OKŁADKI
// ==========================================

// ==========================================
// 🖼️ POBIERANIE OKŁADEK - WIELE ŹRÓDEŁ
// ==========================================

function cleanSearchQuery(text) {
    // Wyczyść śmieci z tagów MP3
    return text
        .replace(/[!@#$%^&*()]+/g, '')
        .replace(/www\.[^\s]+/gi, '')
        .replace(/\(\d{4}\)/g, '')           // (2003)
        .replace(/cd\s*\d+/gi, '')           // cd1, cd 2
        .replace(/disc\s*\d+/gi, '')         // disc1
        .replace(/\[.*?\]/g, '')             // [cokolwiek]
        .replace(/\s+/g, ' ')
        .trim();
}

function fetchAlbumCover(artist, album, callback) {
    var cleanArtist = cleanSearchQuery(artist);
    var cleanAlbum = cleanSearchQuery(album);
    
    console.log('🖼️ Szukam okładki:', cleanArtist, '-', cleanAlbum);
    
    // Próba 1: Deezer (dobry dla polskiej muzyki!)
    fetchCoverFromDeezer(cleanArtist, cleanAlbum, function(cover) {
        if (cover) {
            console.log('🖼️ Znaleziono w Deezer');
            callback(cover);
        } else {
            // Próba 2: iTunes
            fetchCoverFromiTunes(cleanArtist, cleanAlbum, function(cover2) {
                if (cover2) {
                    console.log('🖼️ Znaleziono w iTunes');
                    callback(cover2);
                } else {
                    // Próba 3: MusicBrainz + Cover Art Archive
                    fetchCoverFromMusicBrainz(cleanArtist, cleanAlbum, function(cover3) {
                        if (cover3) {
                            console.log('🖼️ Znaleziono w MusicBrainz');
                            callback(cover3);
                        } else {
                            // Próba 4: Last.fm
                            fetchCoverFromLastFm(cleanArtist, cleanAlbum, function(cover4) {
                                if (cover4) {
                                    console.log('🖼️ Znaleziono w Last.fm');
                                    callback(cover4);
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

// Deezer API - świetny dla polskiej muzyki!
function fetchCoverFromDeezer(artist, album, callback) {
    var query = encodeURIComponent(artist + ' ' + album);
    fetch('https://api.deezer.com/search/album?q=' + query + '&limit=1')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.data && data.data.length > 0 && data.data[0].cover_xl) {
                callback(data.data[0].cover_xl);  // Duża okładka
            } else {
                callback(null);
            }
        })
        .catch(function() { callback(null); });
}

// iTunes API
function fetchCoverFromiTunes(artist, album, callback) {
    var query = encodeURIComponent(artist + ' ' + album);
    fetch('https://itunes.apple.com/search?term=' + query + '&entity=album&limit=1')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
                callback(data.results[0].artworkUrl100.replace('100x100', '600x600'));
            } else {
                callback(null);
            }
        })
        .catch(function() { callback(null); });
}

// MusicBrainz + Cover Art Archive
function fetchCoverFromMusicBrainz(artist, album, callback) {
    var query = encodeURIComponent('release:"' + album + '" AND artist:"' + artist + '"');
    fetch('https://musicbrainz.org/ws/2/release/?query=' + query + '&limit=1&fmt=json', {
        headers: { 'User-Agent': 'MusicCollectionApp/1.0' }
    })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.releases && data.releases.length > 0) {
                var mbid = data.releases[0].id;
                // Pobierz okładkę z Cover Art Archive
                return fetch('https://coverartarchive.org/release/' + mbid);
            }
            throw new Error('Nie znaleziono');
        })
        .then(function(r) { return r.json(); })
        .then(function(coverData) {
            if (coverData.images && coverData.images.length > 0) {
                // Znajdź front cover lub pierwszą dostępną
                var front = coverData.images.find(function(img) { return img.front; });
                var coverUrl = front ? front.image : coverData.images[0].image;
                callback(coverUrl);
            } else {
                callback(null);
            }
        })
        .catch(function() { callback(null); });
}

// Last.fm API (bez klucza - ograniczone)
function fetchCoverFromLastFm(artist, album, callback) {
    // Last.fm wymaga API key, więc używamy alternatywnego endpointu
    var query = encodeURIComponent(artist + ' ' + album);
    // Próba przez Spotify embed (backup)
    fetch('https://open.spotify.com/oembed?url=https://open.spotify.com/search/' + query)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.thumbnail_url) {
                callback(data.thumbnail_url);
            } else {
                callback(null);
            }
        })
        .catch(function() { callback(null); });
}

// Szybkie wyszukiwanie okładki (przycisk w formularzu)
function searchCover() {
    var artist = document.getElementById('artist').value.trim();
    var title = document.getElementById('title').value.trim();
    if (!artist && !title) { 
        showNotification('Wpisz artystę lub tytuł!', 'warning'); 
        return; 
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

// Szukaj okładki w oknie edycji
function searchCoverEdit() {
    var artist = document.getElementById('editArtist').value.trim();
    var title = document.getElementById('editTitle').value.trim();
    if (!artist && !title) { 
        showNotification('Wpisz artystę lub tytuł!', 'warning'); 
        return; 
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
// 🎲 LOSOWY ALBUM
// ==========================================

function randomAlbum() {
    if (!Array.isArray(albums) || albums.length === 0) { showNotification('Dodaj najpierw albumy! 📀', 'warning'); return; }
    var random = albums[Math.floor(Math.random() * albums.length)];
    var modal = document.getElementById('randomModal');
    var content = document.getElementById('randomContent');
    content.innerHTML = '<div class="random-album"><h3>🎲 Co dziś posłuchać?</h3>' +
        (random.coverUrl ? '<img src="' + random.coverUrl + '">' : '<div class="no-cover-big">🎵</div>') +
        '<p class="artist">' + escapeHtml(random.artist) + '</p><p class="title">' + escapeHtml(random.title) + '</p>' +
        '<p class="meta">' + (random.year || '') + ' • ' + getGenreName(random.genre) + ' • ' + getStars(random.rating || 3) + '</p>' +
        '<div class="random-actions"><button class="btn-another" onclick="randomAlbum()">🎲 Inny</button>' +
        '<button class="btn-listen" onclick="playAlbum(\'' + random.id + '\')">▶️ Słuchaj</button></div></div>';
    modal.classList.add('active');
}

function closeRandomModal() { document.getElementById('randomModal').classList.remove('active'); }

// ==========================================
// 📷 SKANER KODÓW
// ==========================================

function openScannerModal() {
    document.getElementById('scannerModal').classList.add('active');
    document.getElementById('scannerResult').classList.add('hidden');
    document.getElementById('manualBarcode').value = '';
    startBarcodeScanner();
}

function closeScannerModal() { stopBarcodeScanner(); document.getElementById('scannerModal').classList.remove('active'); }

function startBarcodeScanner() {
    var scannerDiv = document.getElementById('scannerPreview');
    
    // Sprawdź HTTPS (kamera wymaga bezpiecznego połączenia)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        scannerDiv.innerHTML = '<div style="padding:40px;color:#ffa500;text-align:center;">' +
            '<p style="font-size:2rem;">🔒</p>' +
            '<p><strong>Kamera wymaga HTTPS</strong></p>' +
            '<p style="font-size:0.9rem;color:#888;margin-top:10px;">Wgraj aplikację na Netlify lub użyj ręcznego wprowadzania kodu</p>' +
            '</div>';
        return;
    }
    
    // Sprawdź czy biblioteka załadowana
    if (typeof Html5Qrcode === 'undefined') { 
        scannerDiv.innerHTML = '<div style="padding:40px;color:#aaa;text-align:center;">' +
            '<p>📷 Skaner niedostępny</p>' +
            '<p style="font-size:0.9rem;">Wpisz kod ręcznie poniżej</p>' +
            '</div>'; 
        return; 
    }
    
    // Zatrzymaj poprzedni skaner
    if (html5QrCode) { 
        try { html5QrCode.stop(); } catch(e) {} 
        html5QrCode = null;
    }
    
    scannerDiv.innerHTML = '<div style="padding:40px;text-align:center;"><p>📷 Uruchamiam kamerę...</p></div>';
    
    html5QrCode = new Html5Qrcode("scannerPreview");
    
    // Konfiguracja dla kodów kreskowych (EAN, UPC)
    var config = {
        fps: 10,
        qrbox: { width: 280, height: 120 },  // Szeroki prostokąt dla kodów kreskowych
        aspectRatio: 1.777,  // 16:9
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
        { facingMode: "environment" },  // Tylna kamera
        config,
        function(decodedText) { 
            console.log('📷 Zeskanowano:', decodedText);
            showNotification('📷 Kod: ' + decodedText, 'success'); 
            stopBarcodeScanner();
            searchByBarcode(decodedText); 
        },
        function(errorMessage) {
            // Cichy błąd - to normalne gdy nie ma kodu w kadrze
        }
    ).catch(function(err) { 
        console.error('Błąd kamery:', err);
        var errorMsg = '📷 Kamera niedostępna';
        if (err.toString().includes('NotAllowedError')) {
            errorMsg = '🚫 Brak dostępu do kamery. Kliknij "Zezwól" w przeglądarce.';
        } else if (err.toString().includes('NotFoundError')) {
            errorMsg = '📷 Nie znaleziono kamery';
        }
        scannerDiv.innerHTML = '<div style="padding:40px;color:#ff6b6b;text-align:center;">' +
            '<p>' + errorMsg + '</p>' +
            '<p style="font-size:0.9rem;color:#888;margin-top:10px;">Wpisz kod ręcznie poniżej</p>' +
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

function searchByBarcode(barcode) {
    searchByBarcodeWithTracks(barcode);
}

function displayBarcodeResults(releases) {
    var resultDiv = document.getElementById('scannerResult');
    var html = '<h4>✅ Znaleziono</h4>';
    releases.slice(0, 5).forEach(function(r) {
        var artist = (r['artist-credit'] && r['artist-credit'][0]) ? r['artist-credit'][0].name : 'Nieznany';
        var title = r.title || 'Bez tytułu';
        var year = r.date ? r.date.substring(0, 4) : '';
        html += '<div class="scanner-result-item" onclick="addFromBarcode(\'' + escapeHtml(artist).replace(/'/g, "\\'") + '\',\'' + escapeHtml(title).replace(/'/g, "\\'") + '\',\'' + year + '\')"><div class="info"><div class="title">' + escapeHtml(title) + '</div><div class="artist">' + escapeHtml(artist) + '</div></div></div>';
    });
    resultDiv.innerHTML = html;
}

function addFromBarcode(artist, title, year) {
    closeScannerModal();
    document.getElementById('artist').value = artist;
    document.getElementById('title').value = title;
    document.getElementById('year').value = year;
    fetchAlbumCover(artist, title, function(cover) { if (cover) { document.getElementById('coverUrl').value = cover; document.getElementById('coverPreview').innerHTML = '<img src="' + cover + '">'; } });
    showNotification('📝 Dane wypełnione!', 'info');
    document.querySelector('.add-section').scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// 🎵 SKANER MP3
// ==========================================

function openMp3Scanner() {
    document.getElementById('mp3Modal').classList.add('active');
    document.getElementById('mp3Progress').classList.add('hidden');
    document.getElementById('mp3Results').classList.add('hidden');
    foundAlbumsFromScan = [];
}

function closeMp3Modal() { document.getElementById('mp3Modal').classList.remove('active'); }

function scanAudioFiles(files) {
    var progressDiv = document.getElementById('mp3Progress');
    var progressFill = document.getElementById('progressFill');
    var progressText = document.getElementById('progressText');
    var resultsDiv = document.getElementById('mp3Results');
    progressDiv.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    var albumsMap = {};
    var processed = 0;
    var total = files.length;

    function processNext(index) {
        if (index >= total) {
            foundAlbumsFromScan = Object.values(albumsMap);
            if (foundAlbumsFromScan.length === 0) { showNotification('⚠️ Brak albumów!', 'warning'); progressDiv.classList.add('hidden'); return; }
            foundAlbumsFromScan.forEach(function(a) { if (!a.coverUrl) { fetchAlbumCover(a.artist, a.title, function(c) { if (c) { a.coverUrl = c; displayFoundAlbums(); } }); } });
            progressDiv.classList.add('hidden');
            resultsDiv.classList.remove('hidden');
            displayFoundAlbums();
            showNotification('🎵 Znaleziono ' + foundAlbumsFromScan.length + ' albumów!');
            return;
        }
        var file = files[index];
        readID3Tags(file, function(tags) {
            if (tags && tags.artist && tags.album) {
                var key = tags.artist.toLowerCase() + '-' + tags.album.toLowerCase();
                if (!albumsMap[key]) { albumsMap[key] = { artist: tags.artist, title: tags.album, year: tags.year || null, genre: tags.genre ? mapGenre(tags.genre) : 'other', coverUrl: tags.picture || null, tracks: [] }; }
                albumsMap[key].tracks.push({ title: tags.title || file.name.replace(/\.[^/.]+$/, ''), fileUrl: URL.createObjectURL(file), fileName: file.name });
            }
            processed++;
            progressFill.style.width = Math.round((processed / total) * 100) + '%';
            progressText.textContent = 'Skanowanie... ' + processed + '/' + total;
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

function readID3Tags(file, callback) {
    if (typeof jsmediatags === 'undefined') { callback(null); return; }
    jsmediatags.read(file, {
        onSuccess: function(tag) {
            var t = tag.tags;
            var pic = null;
            if (t.picture) { try { var d = t.picture.data; var b = ''; for (var i = 0; i < d.length; i++) b += String.fromCharCode(d[i]); pic = 'data:' + t.picture.format + ';base64,' + btoa(b); } catch(e) {} }
            callback({ title: t.title, artist: t.artist, album: t.album, year: t.year, genre: t.genre, picture: pic });
        },
        onError: function() { callback(null); }
    });
}

function mapGenre(g) {
    var l = g.toLowerCase();
    if (l.indexOf('rock') !== -1) return 'rock';
    if (l.indexOf('pop') !== -1) return 'pop';
    if (l.indexOf('metal') !== -1) return 'metal';
    if (l.indexOf('jazz') !== -1) return 'jazz';
    if (l.indexOf('classical') !== -1) return 'classical';
    if (l.indexOf('electronic') !== -1) return 'electronic';
    if (l.indexOf('hip') !== -1) return 'hip-hop';
    return 'other';
}

function addAllFoundAlbums() {
    var boxes = document.querySelectorAll('#foundAlbums input[type="checkbox"]');
    var added = 0;
    for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].checked && foundAlbumsFromScan[i]) {
            var a = foundAlbumsFromScan[i];
            addAlbum({ artist: a.artist, title: a.title, year: a.year, genre: a.genre, format: 'digital', rating: 3, coverUrl: a.coverUrl, tracks: a.tracks, notes: a.tracks.length + ' utworów' });
            added++;
        }
    }
    closeMp3Modal();
    showNotification('🎉 Dodano ' + added + ' albumów!');
}

// ==========================================
// 🎵 ODTWARZACZ
// ==========================================

function initAudioPlayer() {
    audioPlayer.element = document.getElementById('audioElement');
    if (audioPlayer.element) {
        audioPlayer.element.addEventListener('timeupdate', updateProgress);
        audioPlayer.element.addEventListener('ended', nextTrack);
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
        return; 
    }
    var track = album.tracks[trackIndex];
    
    if (!track.fileUrl) { 
        window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(album.artist + ' ' + track.title), '_blank'); 
        return; 
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
    
    showNotification('🎵 ' + track.title, 'info');
}

function togglePlay() {
    if (!audioPlayer.element || !audioPlayer.element.src) return;
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

function nextTrack() {
    if (!audioPlayer.currentAlbum || !audioPlayer.playlist.length) return;
    var next = audioPlayer.currentTrackIndex + 1;
    if (next >= audioPlayer.playlist.length) next = 0;
    playTrack(audioPlayer.currentAlbum.id, next);
}

function prevTrack() {
    if (!audioPlayer.currentAlbum || !audioPlayer.playlist.length) return;
    var prev = audioPlayer.currentTrackIndex - 1;
    if (prev < 0) prev = audioPlayer.playlist.length - 1;
    playTrack(audioPlayer.currentAlbum.id, prev);
}

function updateProgress() {
    if (!audioPlayer.element || !audioPlayer.element.duration) return;
    var pct = (audioPlayer.element.currentTime / audioPlayer.element.duration) * 100;
    var progressEl = document.getElementById('progressBar');
    if (progressEl) progressEl.value = pct;
    var currentEl = document.getElementById('currentTime');
    if (currentEl) currentEl.textContent = formatTime(audioPlayer.element.currentTime);
}

function seekTo(pct) { 
    if (audioPlayer.element && audioPlayer.element.duration) {
        audioPlayer.element.currentTime = (pct / 100) * audioPlayer.element.duration; 
    }
}

function setVolume(v) { 
    if (audioPlayer.element) audioPlayer.element.volume = v / 100; 
}

function closeAudioPlayer() { 
    if (audioPlayer.element) { 
        audioPlayer.element.pause(); 
        audioPlayer.element.src = ''; 
    } 
    audioPlayer.isPlaying = false; 
    document.getElementById('audioPlayerBar').classList.add('hidden'); 
}

function playAlbum(id) {
    var album = albums.find(function(a) { return a.id === id; });
    if (!album) return;
    closeRandomModal(); 
    closeDetailsModal();
    var q = encodeURIComponent(album.artist + ' ' + album.title + ' full album');
    var modal = document.getElementById('playerModal');
    document.getElementById('playerContent').innerHTML = '<div class="player-container"><h3>' + escapeHtml(album.title) + '</h3><p class="artist">' + escapeHtml(album.artist) + '</p><iframe width="100%" height="350" src="https://www.youtube.com/embed?listType=search&list=' + q + '" frameborder="0" allowfullscreen></iframe><div class="player-links"><a href="https://open.spotify.com/search/' + q + '" target="_blank" class="link-spotify">🎵 Spotify</a><a href="https://www.youtube.com/results?search_query=' + q + '" target="_blank" class="link-youtube">▶️ YouTube</a></div></div>';
    modal.classList.add('active');
}

function closePlayerModal() { document.getElementById('playerModal').classList.remove('active'); }

function closePlayer() { 
    var m = document.getElementById('miniPlayer'); 
    if (m) m.classList.add('hidden'); 
    closePlayerModal(); 
}

function openSpotify(id) { 
    var a = albums.find(function(x) { return x.id === id; }); 
    if (a) window.open('https://open.spotify.com/search/' + encodeURIComponent(a.artist + ' ' + a.title), '_blank'); 
}

function openYouTube(id) { 
    var a = albums.find(function(x) { return x.id === id; }); 
    if (a) window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(a.artist + ' ' + a.title), '_blank'); 
}

// ==========================================
// 📊 STATYSTYKI
// ==========================================

function showStats() {
    var modal = document.getElementById('statsModal');
    var content = document.getElementById('statsContent');
    if (!Array.isArray(albums) || albums.length === 0) { content.innerHTML = '<p style="text-align:center;padding:40px;">Brak danych</p>'; modal.classList.add('active'); return; }
    var t = albums.length;
    var artists = {}; albums.forEach(function(a) { artists[a.artist.toLowerCase()] = true; });
    var avg = 0; albums.forEach(function(a) { avg += (a.rating || 0); }); avg = (avg / t).toFixed(1);
    var favs = albums.filter(function(a) { return a.favorite; }).length;
    var genres = {}; albums.forEach(function(a) { genres[a.genre] = (genres[a.genre] || 0) + 1; });
    var sorted = Object.entries(genres).sort(function(a, b) { return b[1] - a[1]; });
    var max = sorted[0] ? sorted[0][1] : 1;
    var html = '<div class="stats-grid"><div class="stats-card"><div class="number">' + t + '</div><div class="label">Albumów</div></div><div class="stats-card"><div class="number">' + Object.keys(artists).length + '</div><div class="label">Artystów</div></div><div class="stats-card"><div class="number">' + avg + '</div><div class="label">Śr. ocena</div></div><div class="stats-card"><div class="number">' + favs + '</div><div class="label">Ulubionych</div></div></div><div class="chart-section"><h3>🎸 Gatunki</h3>';
    sorted.slice(0, 6).forEach(function(i) { html += '<div class="chart-bar"><span class="label">' + getGenreName(i[0]) + '</span><div class="bar-container"><div class="bar" style="width:' + ((i[1]/max)*100) + '%">' + i[1] + '</div></div></div>'; });
    html += '</div>';
    content.innerHTML = html;
    modal.classList.add('active');
}

function closeStatsModal() { document.getElementById('statsModal').classList.remove('active'); }

function updateStats() {
    if (!Array.isArray(albums)) return;
    var t = albums.length;
    var el1 = document.getElementById('totalAlbums'); if (el1) el1.textContent = t;
    var artists = {}; albums.forEach(function(a) { artists[a.artist.toLowerCase()] = true; });
    var el2 = document.getElementById('totalArtists'); if (el2) el2.textContent = Object.keys(artists).length;
    var avg = 0; if (t > 0) { albums.forEach(function(a) { avg += (a.rating || 0); }); avg = (avg / t).toFixed(1); }
    var el3 = document.getElementById('avgRating'); if (el3) el3.textContent = avg;
    var el4 = document.getElementById('totalFavorites'); if (el4) el4.textContent = albums.filter(function(a) { return a.favorite; }).length;
    var el5 = document.getElementById('totalWishlist'); if (el5) el5.textContent = albums.filter(function(a) { return a.wishlist; }).length;
}

// ==========================================
// 🖨️ DRUKOWANIE KOLEKCJI
// ==========================================

function printCollection() {
    var printWindow = window.open('', '_blank');
    
    // Grupuj albumy według artysty
    var byArtist = {};
    albums.forEach(function(a) {
        var artist = a.artist || 'Nieznany';
        if (!byArtist[artist]) byArtist[artist] = [];
        byArtist[artist].push(a);
    });
    
    var sortedArtists = Object.keys(byArtist).sort();
    
    var wishlistAlbums = albums.filter(function(a) { return a.wishlist; });
    var ownedAlbums = albums.filter(function(a) { return !a.wishlist; });
    
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Moja Kolekcja Muzyki</title><style>';
    html += 'body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;}';
    html += 'h1{text-align:center;color:#1a1a2e;border-bottom:3px solid #4ade80;padding-bottom:10px;}';
    html += 'h2{color:#4ade80;margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:5px;}';
    html += 'h3{color:#666;margin-top:20px;}';
    html += '.stats{display:flex;justify-content:center;gap:30px;margin:20px 0;padding:15px;background:#f5f5f5;border-radius:10px;}';
    html += '.stat{text-align:center;}.stat-num{font-size:24px;font-weight:bold;color:#4ade80;}.stat-label{font-size:12px;color:#666;}';
    html += '.album{display:flex;gap:15px;padding:10px;border-bottom:1px solid #eee;page-break-inside:avoid;}';
    html += '.album img{width:60px;height:60px;object-fit:cover;border-radius:5px;}';
    html += '.album-info{flex:1;}.album-title{font-weight:bold;}.album-meta{font-size:12px;color:#666;}';
    html += '.stars{color:#fbbf24;}';
    html += '.wishlist-section{background:#fff3cd;padding:15px;border-radius:10px;margin-top:20px;}';
    html += '.no-cover{width:60px;height:60px;background:#ddd;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:24px;}';
    html += '@media print{body{padding:0;}.stats{background:#f5f5f5 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}}';
    html += '</style></head><body>';
    
    html += '<h1>🎵 Moja Kolekcja Muzyki</h1>';
    html += '<p style="text-align:center;color:#666;">Wydrukowano: ' + new Date().toLocaleDateString('pl-PL') + '</p>';
    
    // Statystyki
    html += '<div class="stats">';
    html += '<div class="stat"><div class="stat-num">' + ownedAlbums.length + '</div><div class="stat-label">Albumów</div></div>';
    html += '<div class="stat"><div class="stat-num">' + Object.keys(byArtist).length + '</div><div class="stat-label">Artystów</div></div>';
    html += '<div class="stat"><div class="stat-num">' + albums.filter(function(a){return a.favorite;}).length + '</div><div class="stat-label">Ulubionych</div></div>';
    html += '<div class="stat"><div class="stat-num">' + wishlistAlbums.length + '</div><div class="stat-label">Na liście życzeń</div></div>';
    html += '</div>';
    
    // Lista życzeń
    if (wishlistAlbums.length > 0) {
        html += '<div class="wishlist-section"><h2>📋 Lista życzeń (' + wishlistAlbums.length + ')</h2>';
        wishlistAlbums.forEach(function(a) {
            html += '<div class="album">';
            html += a.coverUrl ? '<img src="' + a.coverUrl + '">' : '<div class="no-cover">🎵</div>';
            html += '<div class="album-info">';
            html += '<div class="album-title">' + escapeHtml(a.title) + '</div>';
            html += '<div class="album-meta">' + escapeHtml(a.artist) + (a.year ? ' • ' + a.year : '') + '</div>';
            html += '</div></div>';
        });
        html += '</div>';
    }
    
    // Kolekcja według artystów
    html += '<h2>📀 Kolekcja (' + ownedAlbums.length + ' albumów)</h2>';
    
    sortedArtists.forEach(function(artist) {
        var artistAlbums = byArtist[artist].filter(function(a) { return !a.wishlist; });
        if (artistAlbums.length === 0) return;
        
        html += '<h3>' + escapeHtml(artist) + ' (' + artistAlbums.length + ')</h3>';
        
        artistAlbums.sort(function(a, b) { return (a.year || 0) - (b.year || 0); });
        
        artistAlbums.forEach(function(a) {
            html += '<div class="album">';
            html += a.coverUrl ? '<img src="' + a.coverUrl + '">' : '<div class="no-cover">🎵</div>';
            html += '<div class="album-info">';
            html += '<div class="album-title">' + escapeHtml(a.title) + ' <span class="stars">' + getStars(a.rating || 3) + '</span></div>';
            html += '<div class="album-meta">';
            html += (a.year ? a.year + ' • ' : '') + getGenreName(a.genre) + ' • ' + getFormatName(a.format);
            if (a.favorite) html += ' • ❤️';
            html += '</div>';
            html += '</div></div>';
        });
    });
    
    html += '<p style="text-align:center;margin-top:40px;color:#999;font-size:12px;">Wygenerowano przez Kolekcja Muzyki App</p>';
    html += '</body></html>';
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(function() {
        printWindow.print();
    }, 500);
    
    showNotification('🖨️ Otwarto okno drukowania!', 'info');
}

// ==========================================
// 🎨 RENDEROWANIE
// ==========================================

function renderAlbums() {
    console.log('🎨 renderAlbums wywołane, albums.length:', albums ? albums.length : 'undefined');
    if (!Array.isArray(albums)) albums = [];
    var search = (document.getElementById('searchInput') || {}).value || '';
    search = search.toLowerCase();
    var genre = (document.getElementById('filterGenre') || {}).value || 'all';
    var format = (document.getElementById('filterFormat') || {}).value || 'all';
    var sort = (document.getElementById('sortBy') || {}).value || 'newest';
    var favOnly = (document.getElementById('showFavoritesOnly') || {}).checked || false;
    var wishlistOnly = (document.getElementById('showWishlistOnly') || {}).checked || false;

    var filtered = albums.filter(function(a) {
        return (a.artist.toLowerCase().indexOf(search) !== -1 || a.title.toLowerCase().indexOf(search) !== -1) &&
               (genre === 'all' || a.genre === genre) &&
               (format === 'all' || a.format === format) &&
               (!favOnly || a.favorite) &&
               (!wishlistOnly || a.wishlist);
    });

    filtered.sort(function(a, b) {
        switch (sort) {
            case 'newest': return (b.dateAdded || 0) - (a.dateAdded || 0);
            case 'artist': return a.artist.localeCompare(b.artist);
            case 'title': return a.title.localeCompare(b.title);
            case 'rating': return (b.rating || 0) - (a.rating || 0);
            case 'year': return (b.year || 0) - (a.year || 0);
            case 'favorites': return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
            case 'wishlist': return (b.wishlist ? 1 : 0) - (a.wishlist ? 1 : 0);
            default: return 0;
        }
    });

    var countEl = document.getElementById('albumCount');
    if (countEl) countEl.textContent = '(' + filtered.length + ')';
    var list = document.getElementById('albumsList');
    console.log('🎨 albumsList znaleziony:', !!list, 'filtered.length:', filtered.length);
    if (!list) { console.error('❌ Nie znaleziono #albumsList!'); return; }
    if (filtered.length === 0) { 
        list.innerHTML = '<p class="empty-message">🎵 Brak albumów</p>'; 
    } else { 
        var html = ''; 
        filtered.forEach(function(a) { html += createAlbumCard(a); }); 
        console.log('🎨 HTML length:', html.length);
        list.innerHTML = html; 
    }
    list.className = currentView === 'grid' ? 'albums-grid' : 'albums-list';
    updateStats();
}

function createAlbumCard(a) {
    var cover = a.coverUrl ? '<img src="' + a.coverUrl + '" onerror="this.parentElement.innerHTML=\'🎵\'">' : '🎵';
    var tracks = a.tracks ? ' • ' + a.tracks.length + ' utw.' : '';
    var wishlistBadge = a.wishlist ? '<span class="wishlist-badge">📋 Lista życzeń</span>' : '';
    var wishlistBtn = a.wishlist ? '✅' : '📋';
    return '<div class="album-card' + (a.wishlist ? ' wishlist-item' : '') + '"><div class="album-cover" onclick="showDetails(\'' + a.id + '\')">' + cover + wishlistBadge + '</div><div class="album-info"><div class="album-header"><span class="album-artist">' + escapeHtml(a.artist) + '</span><div class="album-header-btns"><button class="album-wishlist" onclick="toggleWishlist(\'' + a.id + '\')" title="Lista życzeń">' + wishlistBtn + '</button><button class="album-favorite" onclick="toggleFavorite(\'' + a.id + '\')">' + (a.favorite ? '❤️' : '🤍') + '</button></div></div><h3 class="album-title" onclick="showDetails(\'' + a.id + '\')">' + escapeHtml(a.title) + '</h3><div class="album-meta">' + (a.year ? '<span>📅 ' + a.year + '</span>' : '') + '<span>' + getGenreName(a.genre) + tracks + '</span></div><div class="album-rating">' + getStars(a.rating || 3) + '</div><div class="album-actions"><button class="btn-play" onclick="playAlbum(\'' + a.id + '\')">▶️</button><button class="btn-edit" onclick="openEditModal(\'' + a.id + '\')">✏️</button><button class="btn-delete" onclick="deleteAlbum(\'' + a.id + '\')">🗑️</button></div></div></div>';
}

// ==========================================
// 👁️ SZCZEGÓŁY Z TEKSTAMI
// ==========================================

 function showDetails(id) {
    var a = albums.find(function(x) { return x.id === id; });
    if (!a) return;
    
    var tracks = '';
    if (a.tracks && a.tracks.length > 0) {
        tracks = '<div style="margin-top:20px;border-top:1px solid rgba(255,255,255,0.1);padding-top:20px;">' +
            '<h3>🎵 Utwory (' + a.tracks.length + ')</h3>' +
            '<div style="display:flex;flex-direction:column;gap:5px;margin-top:10px;">';
        
        a.tracks.forEach(function(t, i) {
            var trackTitle = t.title || 'Utwór ' + (i + 1);
            var youtubeUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(a.artist + ' ' + trackTitle);
            var geniusUrl = 'https://genius.com/search?q=' + encodeURIComponent(a.artist + ' ' + trackTitle);
            var tekstowoUrl = 'https://www.tekstowo.pl/szukaj,wykonawca,' + encodeURIComponent(a.artist) + ',tytul,' + encodeURIComponent(trackTitle) + '.html';
            
            tracks += '<div style="display:flex;align-items:center;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;gap:10px;">' +
                '<span style="width:30px;color:#888;text-align:center;">' + (i + 1) + '</span>' +
                '<div style="flex:1;">' +
                    '<div style="font-weight:500;">' + escapeHtml(trackTitle) + '</div>' +
                '</div>' +
                '<div style="display:flex;gap:5px;flex-wrap:wrap;">' +
                    (t.fileUrl 
                        ? '<button onclick="playTrack(\'' + a.id + '\',' + i + ')" style="background:#4ade80;border:none;padding:5px 10px;border-radius:15px;cursor:pointer;" title="Odtwórz">▶️</button>' 
                        : '<a href="' + youtubeUrl + '" target="_blank" style="background:#ff0000;border:none;padding:5px 10px;border-radius:15px;cursor:pointer;text-decoration:none;color:#fff;font-size:0.8rem;" title="YouTube">▶️ YT</a>') +
                    '<button onclick="openKaraoke(\'' + a.id + '\',' + i + ')" class="btn-karaoke" title="Karaoke">🎤</button>' +
                    '<a href="' + geniusUrl + '" target="_blank" style="background:#ffff64;border:none;padding:5px 10px;border-radius:15px;cursor:pointer;text-decoration:none;color:#000;" title="Genius">📝</a>' +
                    '<a href="' + tekstowoUrl + '" target="_blank" style="background:#a855f7;border:none;padding:5px 10px;border-radius:15px;cursor:pointer;text-decoration:none;color:#fff;font-size:0.7rem;" title="Tekstowo.pl">PL</a>' +
                '</div>' +
            '</div>';
        });
        
        tracks += '</div></div>';
    }
    
    var youtubeAlbumUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(a.artist + ' ' + a.title + ' full album');
    var spotifyUrl = 'https://open.spotify.com/search/' + encodeURIComponent(a.artist + ' ' + a.title);
    var geniusAlbumUrl = 'https://genius.com/search?q=' + encodeURIComponent(a.artist + ' ' + a.title);
    var tekstowoAlbumUrl = 'https://www.tekstowo.pl/szukaj,wykonawca,' + encodeURIComponent(a.artist) + '.html';
    var azlyricsUrl = 'https://search.azlyrics.com/search.php?q=' + encodeURIComponent(a.artist);
    
    var quickLyrics = '<div style="margin-top:20px;padding:15px;background:rgba(255,255,255,0.05);border-radius:10px;">' +
        '<strong>🔍 Szukaj tekstów:</strong><br><br>' +
        '<a href="' + geniusAlbumUrl + '" target="_blank" style="display:inline-block;background:#ffff64;color:#000;padding:8px 15px;border-radius:20px;text-decoration:none;margin-right:10px;margin-bottom:5px;">📝 Genius</a>' +
        '<a href="' + tekstowoAlbumUrl + '" target="_blank" style="display:inline-block;background:#a855f7;color:#fff;padding:8px 15px;border-radius:20px;text-decoration:none;margin-right:10px;margin-bottom:5px;">🇵🇱 Tekstowo.pl</a>' +
        '<a href="' + azlyricsUrl + '" target="_blank" style="display:inline-block;background:#3b82f6;color:#fff;padding:8px 15px;border-radius:20px;text-decoration:none;margin-bottom:5px;">🌐 AZLyrics</a>' +
    '</div>';
    
    document.getElementById('detailsContent').innerHTML = 
        '<div class="details-header">' +
            (a.coverUrl ? '<img src="' + a.coverUrl + '" class="details-cover">' : '<div class="details-cover" style="font-size:4rem;display:flex;align-items:center;justify-content:center;">🎵</div>') +
            '<div class="details-main">' +
                '<h2>' + escapeHtml(a.title) + '</h2>' +
                '<p class="details-artist">' + escapeHtml(a.artist) + '</p>' +
                '<div>' + getStars(a.rating || 3) + '</div>' +
                '<div style="margin-top:10px;">' +
                    (a.year ? '<span style="background:rgba(255,255,255,0.1);padding:5px 10px;border-radius:15px;margin-right:5px;">📅 ' + a.year + '</span>' : '') +
                    '<span style="background:rgba(255,255,255,0.1);padding:5px 10px;border-radius:15px;">' + getGenreName(a.genre) + '</span>' +
                    (a.tracks ? '<span style="background:rgba(255,255,255,0.1);padding:5px 10px;border-radius:15px;margin-left:5px;">🎵 ' + a.tracks.length + ' utworów</span>' : '') +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">' +
            '<a href="' + youtubeAlbumUrl + '" target="_blank" style="background:#ff0000;color:#fff;padding:10px 20px;border:none;border-radius:20px;cursor:pointer;text-decoration:none;display:inline-block;">▶️ YouTube</a>' +
            '<a href="' + spotifyUrl + '" target="_blank" style="background:#1DB954;color:#fff;padding:10px 20px;border:none;border-radius:20px;cursor:pointer;text-decoration:none;display:inline-block;">🎵 Spotify</a>' +
            '<button onclick="toggleFavorite(\'' + a.id + '\');showDetails(\'' + a.id + '\');" style="background:#fbbf24;color:#000;padding:10px 20px;border:none;border-radius:20px;cursor:pointer;">' + (a.favorite ? '💔 Usuń z ulubionych' : '❤️ Ulubione') + '</button>' +
            '<button onclick="toggleWishlist(\'' + a.id + '\');showDetails(\'' + a.id + '\');" style="background:' + (a.wishlist ? '#22c55e' : '#f59e0b') + ';color:#000;padding:10px 20px;border:none;border-radius:20px;cursor:pointer;">' + (a.wishlist ? '✅ Mam!' : '📋 Wishlist') + '</button>' +
            '<button onclick="openEditModal(\'' + a.id + '\')" style="background:#3b82f6;color:#fff;padding:10px 20px;border:none;border-radius:20px;cursor:pointer;">✏️ Edytuj</button>' +
            '<button onclick="deleteAlbum(\'' + a.id + '\')" style="background:#ef4444;color:#fff;padding:10px 20px;border:none;border-radius:20px;cursor:pointer;">🗑️ Usuń</button>' +
        '</div>' +
        (a.notes ? '<div style="margin-top:20px;padding:15px;background:rgba(255,255,255,0.05);border-radius:10px;">📝 <strong>Notatki:</strong> ' + escapeHtml(a.notes) + '</div>' : '') +
        quickLyrics +
        tracks;
    
    document.getElementById('detailsModal').classList.add('active');
}

function closeDetailsModal() { document.getElementById('detailsModal').classList.remove('active'); }

// ==========================================
// ✏️ EDYCJA
// ==========================================

function openEditModal(id) {
    var a = albums.find(function(x) { return x.id === id; });
    if (!a) return;
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

function closeEditModal() { document.getElementById('editModal').classList.remove('active'); }

// ==========================================
// 📤 EKSPORT
// ==========================================

function exportData() {
    var blob = new Blob([JSON.stringify(albums, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kolekcja-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    showNotification('📤 Wyeksportowano!');
}

function setView(v) {
    currentView = v;
    document.getElementById('gridView').classList.toggle('active', v === 'grid');
    document.getElementById('listView').classList.toggle('active', v === 'list');
    renderAlbums();
}

// ==========================================
// 🚀 INICJALIZACJA
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎵 Inicjalizacja...');
    
    // Inicjalizacja Firebase (jeśli dostępny)
    initFirebase();
    
    initAudioPlayer();

    var albumForm = document.getElementById('albumForm');
    console.log('🎵 albumForm znaleziony:', !!albumForm);
    if (albumForm) {
        albumForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('🎵 Formularz wysłany!');
            var data = {
                artist: document.getElementById('artist').value.trim(),
                title: document.getElementById('title').value.trim(),
                year: parseInt(document.getElementById('year').value) || null,
                genre: document.getElementById('genre').value,
                format: document.getElementById('format').value,
                rating: parseInt(document.getElementById('rating').value),
                coverUrl: document.getElementById('coverUrl').value.trim() || null,
                notes: document.getElementById('notes').value.trim() || null
            };
            console.log('🎵 Dane formularza:', data);
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
    
    var editCoverUrl = document.getElementById('editCoverUrl');
    if (editCoverUrl) editCoverUrl.addEventListener('input', function(e) { document.getElementById('editCoverPreview').innerHTML = e.target.value ? '<img src="' + e.target.value + '">' : ''; });

    var editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateAlbum(document.getElementById('editId').value, {
                artist: document.getElementById('editArtist').value.trim(),
                title: document.getElementById('editTitle').value.trim(),
                year: parseInt(document.getElementById('editYear').value) || null,
                genre: document.getElementById('editGenre').value,
                format: document.getElementById('editFormat').value,
                rating: parseInt(document.getElementById('editRating').value),
                coverUrl: document.getElementById('editCoverUrl').value.trim() || null,
                notes: document.getElementById('editNotes').value.trim() || null
            });
            closeEditModal();
        });
    }

    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', renderAlbums);
    var filterGenre = document.getElementById('filterGenre');
    if (filterGenre) filterGenre.addEventListener('change', renderAlbums);
    var filterFormat = document.getElementById('filterFormat');
    if (filterFormat) filterFormat.addEventListener('change', renderAlbums);
    var sortBy = document.getElementById('sortBy');
    if (sortBy) sortBy.addEventListener('change', renderAlbums);
    var showFavoritesOnly = document.getElementById('showFavoritesOnly');
    if (showFavoritesOnly) showFavoritesOnly.addEventListener('change', renderAlbums);
    var showWishlistOnly = document.getElementById('showWishlistOnly');
    if (showWishlistOnly) showWishlistOnly.addEventListener('change', renderAlbums);

    var importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    var imported = JSON.parse(ev.target.result);
                    if (Array.isArray(imported) && confirm('Importować ' + imported.length + ' albumów?')) {
                        imported.forEach(function(item) { var data = Object.assign({}, item); delete data.id; addAlbum(data); });
                    }
                } catch (err) { showNotification('❌ Błąd importu!', 'error'); }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    var folderInput = document.getElementById('folderInput');
    if (folderInput) {
        folderInput.addEventListener('change', function(e) {
            var files = [];
            for (var i = 0; i < e.target.files.length; i++) { var f = e.target.files[i]; if (f.name.match(/\.(mp3|flac|ogg|m4a|wav)$/i)) files.push(f); }
            if (files.length === 0) { showNotification('⚠️ Brak plików audio!', 'warning'); return; }
            scanAudioFiles(files);
        });
    }

    var filesInput = document.getElementById('filesInput');
    if (filesInput) {
        filesInput.addEventListener('change', function(e) {
            var files = [];
            for (var i = 0; i < e.target.files.length; i++) files.push(e.target.files[i]);
            if (files.length === 0) { showNotification('⚠️ Nie wybrano plików!', 'warning'); return; }
            scanAudioFiles(files);
        });
    }

    loadTheme();
    useFirebase = localStorage.getItem('useFirebase') === 'true';
    
    // Jeśli użytkownik chciał Firebase ale nie jest dostępny, ostrzeż
    if (useFirebase && !isFirebaseAvailable()) {
        console.warn('⚠️ Firebase był zapisany jako preferowany, ale jest niedostępny');
        useFirebase = false;
        localStorage.setItem('useFirebase', 'false');
    }
    
    loadData();
    console.log('🎵 Kolekcja Muzyki v5.0 załadowana!');
});
// ==========================================
// 🎤 KARAOKE - SYNCHRONIZOWANE TEKSTY
// ==========================================

var karaokeState = {
    lyrics: [],
    currentLine: 0,
    intervalId: null,
    isActive: false,
    currentAlbumId: null,
    currentTrackIndex: null
};

// Pobierz tekst z wielu źródeł
function fetchLyrics(artist, title, callback) {
    console.log('🎤 Szukam tekstu:', artist, '-', title);
    
    // Wyczyść artystę z śmieci (np. "! WWW.POLSKIE-MP3.TK !")
    var cleanArtist = artist.replace(/[!@#$%^&*()]+/g, '').replace(/www\.[^\s]+/gi, '').replace(/\s+/g, ' ').trim();
    var cleanTitle = title.replace(/[!@#$%^&*()]+/g, '').replace(/\(\d{4}\)/g, '').replace(/cd\d+/gi, '').replace(/\s+/g, ' ').trim();
    
    console.log('🎤 Wyczyszczone:', cleanArtist, '-', cleanTitle);
    
    // Próba 1: LRCLIB (ma synchronizowane teksty)
    fetchFromLRCLIB(cleanArtist, cleanTitle, function(data) {
        if (data) {
            console.log('🎤 Znaleziono w LRCLIB');
            callback(data);
        } else {
            // Próba 2: lyrics.ovh (proste API, dużo tekstów)
            fetchFromLyricsOvh(cleanArtist, cleanTitle, function(data2) {
                if (data2) {
                    console.log('🎤 Znaleziono w lyrics.ovh');
                    callback(data2);
                } else {
                    console.log('🎤 Nie znaleziono tekstu');
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
            if (!response.ok) throw new Error('Nie znaleziono');
            return response.json();
        })
        .then(function(data) {
            if (data.syncedLyrics) {
                var lines = parseLRC(data.syncedLyrics);
                callback({ synced: true, lines: lines, plain: data.plainLyrics || data.syncedLyrics, source: 'LRCLIB' });
            } else if (data.plainLyrics) {
                callback({ synced: false, lines: [], plain: data.plainLyrics, source: 'LRCLIB' });
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
            if (!response.ok) throw new Error('Nie znaleziono');
            return response.json();
        })
        .then(function(data) {
            if (data.lyrics) {
                callback({ synced: false, lines: [], plain: data.lyrics, source: 'Lyrics.ovh' });
            } else {
                callback(null);
            }
        })
        .catch(function() {
            callback(null);
        });
}

// Parsuj format LRC na tablicę obiektów {time, text}
function parseLRC(lrcText) {
    var lines = [];
    var regex = /\[(\d{2}):(\d{2})[\.\:](\d{2,3})\](.*)/g;
    var match;
    
    while ((match = regex.exec(lrcText)) !== null) {
        var minutes = parseInt(match[1]);
        var seconds = parseInt(match[2]);
        var ms = parseInt(match[3]);
        if (match[3].length === 2) ms *= 10;
        
        var timeInSeconds = minutes * 60 + seconds + ms / 1000;
        var text = match[4].trim();
        
        if (text) {
            lines.push({ time: timeInSeconds, text: text });
        }
    }
    
    return lines.sort(function(a, b) { return a.time - b.time; });
}

// Otwórz modal karaoke
function openKaraoke(albumId, trackIndex) {
    var album = albums.find(function(a) { return a.id === albumId; });
    if (!album || !album.tracks || !album.tracks[trackIndex]) {
        showNotification('⚠️ Nie znaleziono utworu', 'warning');
        return;
    }
    
    karaokeState.currentAlbumId = albumId;
    karaokeState.currentTrackIndex = trackIndex;
    
    var track = album.tracks[trackIndex];
    var trackTitle = track.title || 'Utwór ' + (trackIndex + 1);
    
    // Pokaż modal z ładowaniem
    var modal = document.getElementById('karaokeModal');
    if (!modal) {
        createKaraokeModal();
        modal = document.getElementById('karaokeModal');
    }
    
    document.getElementById('karaokeTitle').textContent = trackTitle;
    document.getElementById('karaokeArtist').textContent = album.artist;
    document.getElementById('karaokeCover').src = album.coverUrl || '';
    document.getElementById('karaokeCover').style.display = album.coverUrl ? 'block' : 'none';
    document.getElementById('karaokeLyrics').innerHTML = '<div class="karaoke-loading">🔍 Szukam tekstu w bazach...</div>';
    document.getElementById('karaokeControls').classList.add('hidden');
    
    modal.classList.add('active');
    
    // Pobierz tekst
    fetchLyrics(album.artist, trackTitle, function(data) {
        if (!data) {
            document.getElementById('karaokeLyrics').innerHTML = 
                '<div class="karaoke-not-found">' +
                    '<p>😔 Nie znaleziono tekstu w bazach online</p>' +
                    '<p style="font-size:0.85rem;color:#888;margin-top:5px;">Polskie piosenki rzadko są w darmowych bazach</p>' +
                    '<div style="margin-top:20px;">' +
                        '<h4 style="margin-bottom:10px;">🔍 Szukaj tekstu:</h4>' +
                        '<a href="https://www.tekstowo.pl/szukaj,wykonawca,' + encodeURIComponent(album.artist) + ',tytul,' + encodeURIComponent(trackTitle) + '.html" target="_blank" class="karaoke-link">🇵🇱 Tekstowo.pl</a>' +
                        '<a href="https://www.teksciory.pl/szukaj?q=' + encodeURIComponent(album.artist + ' ' + trackTitle) + '" target="_blank" class="karaoke-link">🇵🇱 Teksciory.pl</a>' +
                        '<a href="https://genius.com/search?q=' + encodeURIComponent(album.artist + ' ' + trackTitle) + '" target="_blank" class="karaoke-link">📝 Genius</a>' +
                        '<a href="https://www.azlyrics.com/lyrics/' + encodeURIComponent(album.artist.toLowerCase().replace(/\s+/g, '')) + '/' + encodeURIComponent(trackTitle.toLowerCase().replace(/\s+/g, '')) + '.html" target="_blank" class="karaoke-link">🌐 AZLyrics</a>' +
                    '</div>' +
                    '<div style="margin-top:25px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1);">' +
                        '<h4 style="margin-bottom:10px;">📋 Wklej własny tekst:</h4>' +
                        '<p style="font-size:0.8rem;color:#888;margin-bottom:10px;">Skopiuj tekst ze strony i wklej poniżej</p>' +
                        '<textarea id="manualLyricsInput" placeholder="Wklej tekst piosenki tutaj..." style="width:100%;height:150px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px;color:#fff;font-size:0.9rem;resize:vertical;"></textarea>' +
                        '<button onclick="applyManualLyrics()" style="margin-top:10px;padding:10px 20px;background:#4ade80;border:none;border-radius:20px;cursor:pointer;font-weight:bold;">✅ Zastosuj tekst</button>' +
                    '</div>' +
                '</div>';
            return;
        }
        
        var sourceInfo = data.source ? '<p style="text-align:center;font-size:0.75rem;color:#888;margin-bottom:10px;">Źródło: ' + data.source + (data.synced ? ' (synchronizowany)' : '') + '</p>' : '';
        
        karaokeState.lyrics = data.lines;
        karaokeState.currentLine = 0;
        karaokeState.isActive = data.synced;
        
        if (data.synced && data.lines.length > 0) {
            // Synchronizowane karaoke
            document.getElementById('karaokeLyrics').innerHTML = sourceInfo;
            renderKaraokeLyrics(data.lines);
            document.getElementById('karaokeControls').classList.remove('hidden');
            showNotification('🎤 Znaleziono zsynchronizowany tekst!', 'success');
            
            // Automatycznie rozpocznij synchronizację jeśli jest odtwarzanie
            if (audioPlayer.isPlaying && audioPlayer.currentAlbum && audioPlayer.currentAlbum.id === albumId) {
                startKaraokeSync();
            }
        } else {
            // Zwykły tekst
            document.getElementById('karaokeLyrics').innerHTML = 
                sourceInfo +
                '<div class="karaoke-plain">' + 
                    '<pre>' + escapeHtml(data.plain) + '</pre>' +
                '</div>';
            showNotification('📝 Znaleziono tekst (bez synchronizacji)', 'info');
        }
    });
}

// Zastosuj ręcznie wklejony tekst
function applyManualLyrics() {
    var textarea = document.getElementById('manualLyricsInput');
    if (!textarea || !textarea.value.trim()) {
        showNotification('⚠️ Wklej tekst!', 'warning');
        return;
    }
    
    var text = textarea.value.trim();
    
    // Sprawdź czy to format LRC (z timestampami)
    var isLRC = /\[\d{2}:\d{2}[\.:]\d{2,3}\]/.test(text);
    
    if (isLRC) {
        var lines = parseLRC(text);
        if (lines.length > 0) {
            karaokeState.lyrics = lines;
            karaokeState.currentLine = 0;
            karaokeState.isActive = true;
            renderKaraokeLyrics(lines);
            document.getElementById('karaokeControls').classList.remove('hidden');
            showNotification('🎤 Tekst LRC załadowany! Kliknij synchronizuj.', 'success');
            return;
        }
    }
    
    // Zwykły tekst
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
                '<span class="close" onclick="closeKaraokeModal()">&times;</span>' +
                '<div class="karaoke-header">' +
                    '<img id="karaokeCover" src="" alt="" class="karaoke-album-art">' +
                    '<div>' +
                        '<h2 id="karaokeTitle">-</h2>' +
                        '<p id="karaokeArtist" class="karaoke-artist">-</p>' +
                    '</div>' +
                '</div>' +
                '<div id="karaokeLyrics" class="karaoke-lyrics"></div>' +
                '<div id="karaokeControls" class="karaoke-controls hidden">' +
                    '<div id="karaokePlayerStatus" style="margin-bottom:10px;padding:10px;background:rgba(255,0,0,0.2);border-radius:10px;font-size:0.85rem;">' +
                        '⚠️ Aby synchronizacja działała, musisz odtwarzać plik MP3 z tego albumu (przycisk ▶️ przy utworze)' +
                    '</div>' +
                    '<button onclick="startKaraokeSync()" class="btn-karaoke-sync">▶️ Włącz synchronizację</button>' +
                    '<button onclick="manualKaraokeScroll()" class="btn-karaoke-manual" style="margin-left:10px;padding:10px 20px;background:#3b82f6;border:none;border-radius:20px;color:#fff;cursor:pointer;">⏬ Przewijaj ręcznie</button>' +
                    '<p class="karaoke-hint">💡 Kliknij na linijkę tekstu żeby do niej przejść</p>' +
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

// Przejdź do konkretnej linijki (kliknięcie)
function jumpToKaraokeLine(index) {
    karaokeState.currentLine = index;
    highlightKaraokeLine(index);
    
    // Jeśli odtwarzamy audio, przewiń też audio
    if (audioPlayer.element && karaokeState.lyrics[index]) {
        audioPlayer.element.currentTime = karaokeState.lyrics[index].time;
    }
}

// Ręczne przewijanie (bez audio)
var manualScrollActive = false;
function manualKaraokeScroll() {
    manualScrollActive = !manualScrollActive;
    
    if (manualScrollActive) {
        showNotification('⏬ Użyj strzałek ↑↓ lub klikaj na tekst', 'info');
        document.addEventListener('keydown', karaokeKeyHandler);
    } else {
        document.removeEventListener('keydown', karaokeKeyHandler);
        showNotification('⏹️ Ręczne przewijanie wyłączone', 'info');
    }
}

function karaokeKeyHandler(e) {
    if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        var next = Math.min(karaokeState.currentLine + 1, karaokeState.lyrics.length - 1);
        karaokeState.currentLine = next;
        highlightKaraokeLine(next);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = Math.max(karaokeState.currentLine - 1, 0);
        karaokeState.currentLine = prev;
        highlightKaraokeLine(prev);
    }
}

function startKaraokeSync() {
    // Sprawdź czy audio jest dostępne
    if (!audioPlayer.element || !audioPlayer.element.src) {
        document.getElementById('karaokePlayerStatus').innerHTML = 
            '❌ <strong>Nie odtwarzasz żadnego audio!</strong><br>' +
            'Zamknij to okno, kliknij ▶️ przy utworze żeby odtworzyć plik MP3, potem wróć tutaj.';
        document.getElementById('karaokePlayerStatus').style.background = 'rgba(255,0,0,0.3)';
        showNotification('⚠️ Najpierw odtwórz plik MP3!', 'warning');
        return;
    }
    
    if (karaokeState.intervalId) {
        clearInterval(karaokeState.intervalId);
    }
    
    document.getElementById('karaokePlayerStatus').innerHTML = '✅ Synchronizacja aktywna!';
    document.getElementById('karaokePlayerStatus').style.background = 'rgba(74,222,128,0.2)';
    
    karaokeState.intervalId = setInterval(function() {
        if (!audioPlayer.element) return;
        
        var currentTime = audioPlayer.element.currentTime;
        var newLineIndex = -1;
        
        // Znajdź aktualną linijkę
        for (var i = karaokeState.lyrics.length - 1; i >= 0; i--) {
            if (currentTime >= karaokeState.lyrics[i].time) {
                newLineIndex = i;
                break;
            }
        }
        
        if (newLineIndex !== karaokeState.currentLine && newLineIndex >= 0) {
            karaokeState.currentLine = newLineIndex;
            highlightKaraokeLine(newLineIndex);
        }
    }, 100);
    
    showNotification('🎤 Synchronizacja włączona!', 'success');
}

function highlightKaraokeLine(index) {
    var lines = document.querySelectorAll('.karaoke-line');
    lines.forEach(function(line, i) {
        line.classList.remove('active', 'past');
        if (i === index) {
            line.classList.add('active');
            line.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (i < index) {
            line.classList.add('past');
        }
    });
}

function closeKaraokeModal() {
    var modal = document.getElementById('karaokeModal');
    if (modal) modal.classList.remove('active');
    
    if (karaokeState.intervalId) {
        clearInterval(karaokeState.intervalId);
        karaokeState.intervalId = null;
    }
    karaokeState.isActive = false;
    
    // Wyczyść ręczne przewijanie
    manualScrollActive = false;
    document.removeEventListener('keydown', karaokeKeyHandler);
}

// ==========================================
// 📱 PWA - SERVICE WORKER
// ==========================================

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/kolekcjoner-muzyki/sw.js')
            .then(function(registration) {
                console.log('📱 Service Worker zarejestrowany!');
            })
            .catch(function(error) {
                console.log('📱 Service Worker błąd:', error);
            });
    });
}