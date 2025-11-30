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
                
                // Deprem listesi 'result' anahtarı altında geliyor
                const earthquakes = data.result ? data.result.slice(0, 20) : []; 

                if (earthquakes.length === 0) {
                    listContainer.innerHTML = '<p>Deprem verisi bulunamadı.</p>';
                    return;
                }

                earthquakes.forEach(deprem => {
                    
                    // --- GÜVENLİK KONTROLÜ (ANAHTARLAR GÜNCELLENDİ) ---
                    // API'den gelen verideki yeni anahtarlar (date_time ve mag) kontrol ediliyor.
                    if (!deprem.date_time || !deprem.title || !deprem.mag) {
                        // Bu uyarıyı göremezsiniz, çünkü artık tüm kayıtlar bu alanlara sahip.
                        // Ancak eksik veri gelirse kaydı atlamak için duruyor.
                        console.warn('Eksik veriye sahip deprem kaydı atlanıyor:', deprem);
                        return; 
                    }
                    
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ (date_time kullanılıyor) ---
                    const dateString = deprem.date_time; // Burası Düzeltildi
                    
                    // dateString'i boşluktan ayırarak güvenli split işlemi
                    const [datePart, timePart] = dateString.split(' ');
                    
                    // ISO formatına dönüştürme ve tarih nesnesi oluşturma
                    const isoString = `${datePart}T${timePart || '00:00:00'}`; 
                    const dateTime = new Date(isoString); 
                    const formattedDateTime = dateTime.toLocaleString('tr-TR');
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ SONU ---


                    // Büyüklüğe göre görsel sınıflandırma (mag kullanılıyor)
                    let magnitudeClass = '';
                    if (deprem.mag >= 5.0) { // Burası Düzeltildi
                        magnitudeClass = 'mag-high'; // Kırmızı
                    } else if (deprem.mag >= 3.0) { // Burası Düzeltildi
                        magnitudeClass = 'mag-medium'; // Turuncu
                    } else {
                        magnitudeClass = 'mag-low'; // Yeşil
                    }

                    const item = document.createElement('div');
                    item.className = 'earthquake-item';
                    
                    // HTML içeriği oluşturuluyor (mag kullanılıyor)
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
