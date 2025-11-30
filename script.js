document.addEventListener('DOMContentLoaded', () => {
    const apiURL = 'https://turkiyedepremapi.herokuapp.com/api';
    const listContainer = document.getElementById('earthquake-list');
    const refreshButton = document.getElementById('refreshButton');

    function fetchData() {
        listContainer.innerHTML = '<p>Güncel deprem verileri yükleniyor...</p>';
        
        fetch(apiURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('API bağlantı hatası.');
                }
                return response.json();
            })
            .then(data => {
                listContainer.innerHTML = ''; // Önceki içeriği temizle
                
                // Sadece son 20 depremi gösterelim
                const earthquakes = data.slice(0, 20); 

                if (earthquakes.length === 0) {
                    listContainer.innerHTML = '<p>Son deprem verisi bulunamadı.</p>';
                    return;
                }

                earthquakes.forEach(deprem => {
                    const item = document.createElement('div');
                    item.className = 'earthquake-item';
                    
                    // Deprem büyüklüğüne göre sınıf atayarak basit bir görsel uyarı sistemi kuralım
                    let magnitudeClass = '';
                    if (deprem.mag >= 5.0) {
                        magnitudeClass = 'mag-high'; // Kırmızı (Yüksek risk/Uyarı)
                    } else if (deprem.mag >= 3.0) {
                        magnitudeClass = 'mag-medium'; // Turuncu (Orta)
                    } else {
                        magnitudeClass = 'mag-low'; // Sarı (Düşük)
                    }

                    item.innerHTML = `
                        <div class="magnitude-box ${magnitudeClass}">${deprem.mag}</div>
                        <div class="details">
                            <p class="location">Konum: <strong>${deprem.lokasyon}</strong></p>
                            <p class="info">
                                Zaman: ${deprem.date} ${deprem.hour} | 
                                Derinlik: ${deprem.derinlik} km
                            </p>
                        </div>
                    `;
                    listContainer.appendChild(item);
                });
            })
            .catch(error => {
                console.error('Veri çekme hatası:', error);
                listContainer.innerHTML = '<p>Deprem verileri çekilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>';
            });
    }

    // Yenile butonuna tıklama olayını ekle
    refreshButton.addEventListener('click', fetchData);

    // Sayfa ilk yüklendiğinde verileri çek
    fetchData();
});
