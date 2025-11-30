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
                    
                    // --- GÜVENLİK KONTROLÜ: Tarih alanı eksikse kaydı atla (Hata Çözümü) ---
                    if (!deprem.date || !deprem.title || !deprem.depth) {
                        console.warn('Bir deprem kaydı eksik veri içeriyor, atlanıyor.', deprem);
                        return; // Eksik verili kaydı atla
                    }
                    
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ ---
                    const dateString = deprem.date; 
                    // Tarihi ve saati ayırıyoruz
                    const [datePart, timePart] = dateString.split(' ');
                    
                    // Tarayıcı uyumluluğu için ISO formatına dönüştürüyoruz (T ekliyoruz)
                    // timePart yoksa (nadiren), '00:00:00' varsayımı eklenmiştir.
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
