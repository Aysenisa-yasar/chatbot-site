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
                    
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ BAŞLANGIÇ ---
                    // API'den gelen tarihi ve saati ayırıyoruz (Örn: "2025-11-30 19:45:00")
                    const dateString = deprem.date; 
                    const [datePart, timePart] = dateString.split(' ');
                    
                    // Tarayıcının Date nesnesine uyumlu ISO formatına dönüştürüyoruz (T harfi ekliyoruz)
                    const isoString = `${datePart}T${timePart}`;
                    
                    // Yeni bir Date nesnesi oluşturuyoruz ve Türkçe formatta yerel zamanı alıyoruz
                    const dateTime = new Date(isoString); 
                    const formattedDateTime = dateTime.toLocaleString('tr-TR');
                    // --- ZAMAN BİLGİSİ DÜZENLEMESİ SONU ---


                    // Büyüklüğe
