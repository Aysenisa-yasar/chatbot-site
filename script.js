// script.js dosyasının BAŞLANGICI:
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

// Risk puanına göre marker rengi belirleme fonksiyonu
function getRiskColor(score) {
    if (score >= 7.0) return 'red'; // Yüksek Risk
    if (score >= 4.0) return 'orange'; // Orta Risk
    return 'green'; // Düşük Risk
}

document.addEventListener('DOMContentLoaded', () => {
    // YENİ YZ API ADRESİ (RENDER ÜZERİNDEKİ SİZİN SUNUCUNUZ)
    const apiURL = 'https://chatbot-site-h43d.onrender.com/api/risk'; 
    const listContainer = document.getElementById('earthquake-list');
    const refreshButton = document.getElementById('refreshButton');

    function fetchData() {
        listContainer.innerHTML = '<p>YZ risk analizi verileri yükleniyor...</p>';
        initializeMap(); 

        fetch(apiURL)
            .then(response => {
                // Sunucu uyku modundan uyanırken 503 veya 404 gibi kodlar gelebilir.
                // Bu kodları yakalayıp sadece JSON gövdesini işleyelim.
                if (!response.ok && response.status !== 404 && response.status !== 503 && response.status !== 500) {
                    throw new Error('YZ API bağlantı hatası: Beklenmeyen Kod ' + response.status);
                }
                
                // Response gövdesini okuyabilmek için, hata kodu 404/500 olsa bile gövdeyi okumayı deneyeceğiz
                return response.json();
            })
            .then(data => {
                listContainer.innerHTML = '';
                
                // Render sunucusu çalışmıyorsa veya model hata verdiyse
                if (!data || data.status === 'low_activity' || !data.risk_regions || data.risk_regions.length === 0) {
                    listContainer.innerHTML = '<p>Şu anda yeterli kümeleme verisi yok veya risk düşüktür. (Deprem sayısı < 10)</p>';
                    return;
                }

                let bounds = []; 

                data.risk_regions.forEach(riskRegion => {
                    
                    const { lat, lon, score, density } = riskRegion;
                    bounds.push([lat, lon]);
                    
                    const color = getRiskColor(score);
                    
                    // --- HARİTA İŞLEMLERİ (RİSK MERKEZLERİNİ GÖSTERME) ---
                    const marker = L.circleMarker([lat, lon], {
                        radius: score * 1.5, // Risk puanına göre daire boyutu değişsin
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.6,
                        weight: 2
                    }).addTo(mymap);
                    
                    // Açılır Pencere içeriği
                    const popupContent = `
                        <b>YZ Risk Merkezi #${riskRegion.id + 1}</b><br>
                        Risk Puanı: <b>${score.toFixed(1)} / 10</b><br>
                        Yoğunluk: ${density} deprem
                    `;
                    marker.bindPopup(popupContent).openPopup();
                    // --- HARİTA İŞLEMLERİ SONU ---

                    // --- LİSTE OLUŞTURMA ---
                    const item = document.createElement('div');
                    item.className = 'earthquake-item';
                    let magnitudeClass = (score >= 7.0) ? 'mag-high' : (score >= 4.0 ? 'mag-medium' : 'mag-low');

                    item.innerHTML = `
                        <div class="magnitude-box ${magnitudeClass}">${score.toFixed(1)}</div>
                        <div class="details">
                            <p class="location">Risk Merkezi #${riskRegion.id + 1}: YZ Analizi</p>
                            <p class="info">
                                Risk Puanı: ${score.toFixed(1)} / 10 | 
                                Yoğunluk: ${density} son deprem
                            </p>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
                
                // Harita sınırlarını ayarla
                if (bounds.length > 0) {
                    mymap.fitBounds(bounds, { padding: [50, 50] });
                }
            })
            .catch(error => {
                console.error('Veri çekme hatası:', error);
                // Kullanıcıya sunucu uyku modundaysa ne yapması gerektiğini bildir
                listContainer.innerHTML = `<p>Hata: YZ sunucusuna bağlanılamadı. Lütfen Render sunucusunun uyanması için 30 saniye bekleyip tekrar deneyin. (${error.message})</p>`;
            });
    } 

    refreshButton.addEventListener('click', fetchData);
    fetchData(); 
});
