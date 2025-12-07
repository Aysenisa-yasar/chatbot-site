// script.js
let mymap = null; 

function initializeMap() {
    if (mymap !== null && mymap._container) {
        mymap.remove();
        mymap = null;
    }
    
    mymap = L.map('mapid').setView([39.9, 35.8], 6); 

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(mymap);
}

function getRiskColor(score) {
    if (score >= 7.0) return 'red'; 
    if (score >= 4.0) return 'orange'; 
    return 'green'; 
}

document.addEventListener('DOMContentLoaded', () => {
    const apiURL = 'https://chatbot-site-h43d.onrender.com/api/risk'; 
    const listContainer = document.getElementById('earthquake-list');
    const refreshButton = document.getElementById('refreshButton');
    
    const getLocationButton = document.getElementById('getLocationButton');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const locationStatus = document.getElementById('locationStatus');
    const numberInput = document.getElementById('numberInput'); 

    let userCoords = null; 

    function fetchData() {
        listContainer.innerHTML = '<p>YZ risk analizi verileri yükleniyor...</p>';
        initializeMap(); 

        fetch(apiURL)
            .then(response => {
                if (!response.ok && response.status !== 404 && response.status !== 503 && response.status !== 500) {
                    throw new Error('YZ API bağlantı hatası: Beklenmeyen Kod ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                listContainer.innerHTML = '';
                
                if (!data || data.status === 'low_activity' || !data.risk_regions || data.risk_regions.length === 0) {
                    listContainer.innerHTML = '<p>Şu anda yeterli kümeleme verisi yok veya risk düşüktür. (Deprem sayısı < 10)</p>';
                    return;
                }

                let bounds = []; 
                data.risk_regions.forEach(riskRegion => {
                    
                    const { lat, lon, score, density } = riskRegion;
                    bounds.push([lat, lon]);
                    
                    const color = getRiskColor(score);
                    
                    const marker = L.circleMarker([lat, lon], {
                        radius: score * 1.5, 
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.6,
                        weight: 2
                    }).addTo(mymap);
                    
                    const popupContent = `
                        <b>YZ Risk Merkezi #${riskRegion.id + 1}</b><br>
                        Risk Puanı: <b>${score.toFixed(1)} / 10</b><br>
                        Yoğunluk: ${density} deprem
                    `;
                    marker.bindPopup(popupContent).openPopup();

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
                
                if (bounds.length > 0) {
                    mymap.fitBounds(bounds, { padding: [50, 50] });
                }
            })
            .catch(error => {
                console.error('Veri çekme hatası:', error);
                listContainer.innerHTML = `<p>Hata: YZ sunucusuna bağlanılamadı. Lütfen Render sunucusunun uyanması için 30 saniye bekleyip tekrar deneyin. (${error.message})</p>`;
            });
    } 

    // 1. Konum Alma Fonksiyonu
    getLocationButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
            locationStatus.textContent = 'Hata: Tarayıcınız konum servisini desteklemiyor.';
            return;
        }

        locationStatus.textContent = 'Konumunuz tespit ediliyor...';

        navigator.geolocation.getCurrentPosition(position => {
            userCoords = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            locationStatus.innerHTML = `✅ Konum Tespit Edildi!<br>Enlem: ${userCoords.lat.toFixed(4)}, Boylam: ${userCoords.lon.toFixed(4)}`;
        }, error => {
            locationStatus.textContent = `Hata: Konum izni verilmedi veya hata oluştu. (${error.message})`;
            userCoords = null;
        });
    });

    // 2. Ayarları Kaydetme (Backend'e POST) Fonksiyonu
    saveSettingsButton.addEventListener('click', () => {
        const number = numberInput.value; 
        
        if (!userCoords) {
            alert('Lütfen önce "Konumumu Otomatik Belirle" butonuna basarak konumunuzu tespit edin.');
            return;
        }
        if (!number || !number.startsWith('+')) { 
            alert('Lütfen geçerli bir telefon numarası (ülke kodu ile, Örn: +905xxxxxxxx) girin.');
            return;
        }
        
        fetch('/api/set-alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lat: userCoords.lat,
                lon: userCoords.lon,
                number: number 
            }),
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                alert('✅ Bildirim ayarlarınız başarıyla kaydedildi! WhatsApp üzerinden uyarı alacaksınız.');
                locationStatus.innerHTML += `<br>🔔 Bildirimler **${number}** numarasına aktif edildi.`;
            } else {
                alert('Hata: Ayarlar kaydedilirken sunucuda bir sorun oluştu. ' + result.message);
            }
        })
        .catch(error => {
            alert('Ağ Hatası: Sunucuya bağlanılamadı. Bildirim ayarları kaydedilemedi.');
        });
    });


    refreshButton.addEventListener('click', fetchData);
    fetchData(); 
});
