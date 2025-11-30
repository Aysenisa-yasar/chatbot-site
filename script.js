document.addEventListener('DOMContentLoaded', () => {
    // Kullanılan API Adresi (AFAD/Kandilli verilerini çeken servis)
    const apiURL = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live';
    const listContainer = document.getElementById('earthquake-list');
    const refreshButton = document.getElementById('refreshButton');

    function fetchData() {
        listContainer.innerHTML = '<p>Güncel deprem verileri yükleniyor...</p>';
        
        fetch(apiURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('API bağlantı hatası: Kaynak erişilemiyor.');
                }
                return response.json();
            })
            .then(data => {
                listContainer.innerHTML = ''; // Önceki içeriği temizle
                
                // Yeni API'de deprem listesi 'result' anahtarı altında geliyor
                const earthquakes = data.result ? data.result.slice(0, 20) : []; 

                if (earthquakes.length === 0) {
                    listContainer.innerHTML = '<p>Deprem verisi bulunamadı.</p>';
                    return;
                }

                earthquakes.forEach(deprem => {
                    
                    // --- GÜVENLİK KONTROLÜ İYİLEŞTİRİLDİ (Hata Çözümü) ---
                    // Eğer kritik alanlar (date, title, magnitude) eksikse bu kaydı atla.
                    if (!deprem.date || !deprem.title || !deprem.magnitude) {
                        console.warn('Eksik veriye sahip deprem kaydı atlanıyor:', deprem);
                        return; 
                    }
                    
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ (Güvenli Ayrıştırma) ---
                    const dateString = deprem.date; 
                    
                    // dateString'in var olduğunu kontrol ederek güvenli split işlemi
                    const [datePart, timePart] = dateString.split(' ');
                    
                    // ISO formatına dönüştürme ve tarih nesnesi oluşturma
                    const isoString = `${datePart}T${timePart || '00:00:00'}`; 
                    const dateTime = new Date(isoString); 
                    const formattedDateTime = dateTime.toLocaleString('tr-TR');
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ SONU ---


                    // Büyüklüğe göre görsel sınıflandırma
                    let magnitudeClass = '';
                    if (deprem.magnitude >= 5.0) {
                        magnitudeClass = 'mag-high'; // Kırmızı
                    } else if (deprem.magnitude >= 3.0) {
                        magnitudeClass = 'mag-medium'; // Turuncu
                    } else {
                        magnitudeClass = 'mag-low'; // Yeşil
                    }

                    const item = document.createElement('div');
                    item.className = 'earthquake-item';
                    
                    // HTML içeriği oluşturuluyor
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

    // Yenile butonuna tıklama olayını ekle
    refreshButton.addEventListener('click', fetchData);

    // Sayfa ilk yüklendiğinde verileri çek
    fetchData(); 
});
