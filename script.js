document.addEventListener('DOMContentLoaded', () => {
    // YENİ VE ÇALIŞAN API ADRESİ
    const apiURL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';
    const listContainer = document.getElementById('earthquake-list');
    const refreshButton = document.getElementById('refreshButton');

    function fetchData() {
        listContainer.innerHTML = '<p>Güncel deprem verileri yeni kaynaktan yükleniyor...</p>';
        
        fetch(apiURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('API bağlantı hatası: Yeni kaynak erişilemiyor.');
                }
                return response.json();
            })
            .then(data => {
                listContainer.innerHTML = ''; // Temizle
                
                // Yeni API'de deprem listesi 'result' anahtarı altında geliyor
                const earthquakes = data.result ? data.result.slice(0, 20) : []; 

                if (earthquakes.length === 0) {
                    listContainer.innerHTML = '<p>Yeni kaynaktan deprem verisi bulunamadı.</p>';
                    return;
                }

                earthquakes.forEach(deprem => {
                    const item = document.createElement('div');
                    item.className = 'earthquake-item';
                    
                    // Veri isimleri yeni API'ye göre güncellendi: mag -> magnitude, tarih -> date vb.
                    let magnitudeClass = '';
                    if (deprem.magnitude >= 5.0) {
                        magnitudeClass = 'mag-high';
                    } else if (deprem.magnitude >= 3.0) {
                        magnitudeClass = 'mag-medium';
                    } else {
                        magnitudeClass = 'mag-low';
                    }
                    
                    // Tarih ve saat bilgisini birleştirme
                    const dateTime = new Date(deprem.date);
                    const formattedDateTime = dateTime.toLocaleString('tr-TR');


                    item.innerHTML = `
                        <div class="magnitude-box ${magnitudeClass}">${deprem.magnitude}</div>
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
            })
            .catch(error => {
                console.error('Veri çekme hatası:', error);
                listContainer.innerHTML = '<p>Deprem verileri çekilirken ciddi bir hata oluştu. Lütfen konsolu kontrol edin.</p>';
            });
    }

    refreshButton.addEventListener('click', fetchData);
    fetchData(); // Sayfa yüklendiğinde verileri çek
});
