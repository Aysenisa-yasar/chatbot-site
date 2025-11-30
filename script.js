// script.js dosyanızın en üstüne, fetchData fonksiyonundan önce ekleyin:
let mymap = null; // Harita değişkeni tanımla

function initializeMap() {
    // Harita zaten kurulduysa eski haritayı sil (Yenileme için gerekli)
    if (mymap !== null) {
        mymap.remove();
    }
    
    // Haritayı kur ve Türkiye'nin merkezine odakla
    mymap = L.map('mapid').setView([39.9, 35.8], 6); 

    // OpenStreetMap katmanını ekle
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(mymap);
}

// fetchData fonksiyonu içindeki değişiklikler:

// ... fetch.then(data => { kısmından sonra ...
    
    // Haritayı her veri çekişinde sıfırla
    initializeMap(); 

    earthquakes.forEach(deprem => {
        // Kontrol: geojson.coordinates alanı var mı?
        if (!deprem.geojson || !deprem.geojson.coordinates || deprem.geojson.coordinates.length < 2) {
            return; 
        }

        // Boylam (Longitude) ve Enlem (Latitude) ayırma
        const [lon, lat] = deprem.geojson.coordinates;
        
        // Marker (İşaretçi) oluşturma
        const marker = L.marker([lat, lon]).addTo(mymap);
        
        // Açılır Pencere içeriği
        const popupContent = `
            <b>${deprem.title}</b><br>
            Büyüklük: M ${deprem.mag}<br>
            Derinlik: ${deprem.depth} km<br>
            Zaman: ${new Date(deprem.date_time).toLocaleString('tr-TR')}
        `;
        
        marker.bindPopup(popupContent);

        // ... listenin oluşturulduğu HTML kodları ...
    });
// ...
