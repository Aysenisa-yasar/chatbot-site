// script.js dosyanızın BAŞLANGICI:

let mymap = null; // Harita değişkeni tanımla

function initializeMap() {
    // Harita zaten kurulduysa eski haritayı sil (Yenileme için)
    if (mymap !== null && mymap._container) {
        mymap.remove();
        mymap = null;
    }
    
    // Haritayı kur ve Türkiye'nin merkezine odakla (Zoom seviyesi 6)
    mymap = L.map('mapid').setView([39.9, 35.8], 6); 

    // OpenStreetMap katmanını ekle
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(mymap);
}

document.addEventListener('DOMContentLoaded', () => {
    const apiURL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';
    const listContainer = document.getElementById('earthquake-list');
    const refreshButton = document.getElementById('refreshButton');

    function fetchData() {
        listContainer.innerHTML = '<p>Güncel deprem verileri yükleniyor...</p>';
        
        // Haritayı her yeni veri çekişinde sıfırla
        initializeMap(); 

        fetch(apiURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('API bağlantı hatası: Kaynak erişilemiyor.');
                }
                return response.json();
            })
            .then(data => {
                listContainer.innerHTML = ''; 
                const earthquakes = data.result ? data.result.slice(0, 20) : []; 

                if (earthquakes.length === 0) {
                    listContainer.innerHTML = '<p>Deprem verisi bulunamadı.</p>';
                    return;
                }

                let bounds = []; // Harita sınırlarını otomatik ayarlamak için

                earthquakes.forEach(deprem => {
                    
                    // --- GÜVENLİK VE ANAHTAR KONTROLÜ ---
                    if (!deprem.date_time || !deprem.title || !deprem.mag || !deprem.geojson || !deprem.geojson.coordinates) {
                        console.warn('Eksik coğrafi veya zaman verisine sahip deprem kaydı atlanıyor:', deprem);
                        return; 
                    }
                    
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ ---
                    const dateString = deprem.date_time; 
                    const [datePart, timePart] = dateString.split(' ');
                    const isoString = `${datePart}T${timePart || '00:00:00'}`; 
                    const dateTime = new Date(isoString); 
                    const formattedDateTime = dateTime.toLocaleString('tr-TR');
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ SONU ---

                    // --- HARİTA İŞLEMLERİ ---
                    const [lon, lat] = deprem.geojson.coordinates;
                    bounds.push([lat, lon]);

                    // Marker (İşaretçi) oluşturma ve haritaya ekleme
                    const marker = L.marker([lat, lon]).addTo(mymap);
                    
                    // Açılır Pencere içeriği
                    const popupContent = `
                        <b>${deprem.title}</b><br>
                        Büyüklük: M ${deprem.mag}<br>
                        Derinlik: ${deprem.depth} km<br>
                        Zaman: ${formattedDateTime}
                    `;
                    marker.bindPopup(popupContent);
                    // --- HARİTA İŞLEMLERİ SONU ---

                    // --- LİSTE OLUŞTURMA ---
                    let magnitudeClass = '';
                    if (deprem.mag >= 5.0) {
                        magnitudeClass = 'mag-high';
                    } else if (deprem.mag >= 3.0) {
                        magnitudeClass = 'mag-medium';
                    } else {
                        magnitudeClass = 'mag-low';
                    }

                    const item = document.createElement('div');
                    item.className = 'earthquake-item';
                    
                    item.innerHTML = `
                        <div class="magnitude-box ${magnitudeClass}">${deprem.mag}</div>
                        <div class="details">
                            <p class="location">Konum: <strong>${deprem.title}</strong></p>
                            <p class="info">
                                Zaman: ${formattedDateTime} | 
                                Derinlik: ${deprem.depth} km
                            </p>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
                
                // Harita sınırlarını, tüm markerları içerecek şekilde ayarla
                if (bounds.length > 0) {
                    mymap.fitBounds(bounds, { padding: [50, 50] });
                }
            })
            .catch(error => {
                console.error('Veri çekme hatası:', error);
                listContainer.innerHTML = '<p>Deprem verileri çekilirken ciddi bir hata oluştu. Lütfen konsolu kontrol edin.</p>';
            });
    } 

    refreshButton.addEventListener('click', fetchData);
    
    // Sayfa yüklendiğinde hem haritayı başlat hem de verileri çek
    fetchData(); 
});
// script.js dosyasının SONU.
