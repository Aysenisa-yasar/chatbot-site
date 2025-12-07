# app.py
# Bu dosya, YZ modelini çalıştıracak olan Python arka ucudur (Backend).
# Kurulum gereksinimleri: pip install flask scikit-learn numpy requests flask-cors twilio

import os
import time
import requests
import numpy as np
import math # Haversine için matematik fonksiyonları

from flask import Flask, jsonify, request
from sklearn.cluster import KMeans
from flask_cors import CORS 
from threading import Thread
from twilio.rest import Client
import requests.exceptions # Hata kontrolü için eklendi

# --- FLASK UYGULAMASI VE AYARLARI ---
app = Flask(__name__)
CORS(app) 

# Kandilli verilerini çeken üçüncü taraf API
KANDILLI_API = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live'

# --- TWILIO BİLDİRİM SABİTLERİ (KENDİ BİLGİLERİNİZLE DEĞİŞTİRİN!) ---
# Twilio Account SID ve Auth Token'ınızı buraya girin
TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  
TWILIO_AUTH_TOKEN = "your_auth_token_xxxxxxxxxxxxxxxxx" 
# Twilio Onaylı Gönderen WhatsApp Numaranızı buraya girin (Örn: whatsapp:+1415xxxxxxx)
TWILIO_WHATSAPP_NUMBER = "whatsapp:+1415xxxxxxx" 

# --- KULLANICI AYARLARI (GEÇİCİ VERİTABANI YERİNE SÖZLÜK) ---
# user_alerts = {'whatsapp_numarası': {'lat': 41.0, 'lon': 29.0}} formatında tutar
user_alerts = {} 
# Son kontrol edilen büyük depremi tutar (spam'i önlemek için)
last_big_earthquake = {'mag': 0, 'time': 0} 


# --- YARDIMCI FONKSİYONLAR ---

def send_whatsapp_notification(recipient_number, body):
    """ Twilio üzerinden WhatsApp mesajı gönderir. """
    try:
        # Twilio Client başlat
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Twilio için alıcı numara formatı: whatsapp:+905xxxxxxxxx
        whatsapp_number = f"whatsapp:{recipient_number}"
        
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=body,
            to=whatsapp_number
        )
        print(f"✅ WhatsApp Bildirimi başarıyla gönderildi. SID: {message.sid}")
    except Exception as e:
        # Hata kontrolü: Twilio bağlantı veya yetkilendirme hatası
        print(f"HATA: WhatsApp mesajı gönderilemedi. Twilio ayarlarını kontrol edin. Hata: {e}")

def haversine(lat1, lon1, lat2, lon2):
    """ İki nokta arasındaki mesafeyi kilometre cinsinden hesaplar. """
    R = 6371 # Dünya'nın ortalama yarıçapı km
    
    # Radyan cinsine dönüştürme
    lat1_rad = np.radians(lat1)
    lon1_rad = np.radians(lon1)
    lat2_rad = np.radians(lat2)
    lon2_rad = np.radians(lon2)
    
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    # Haversine formülü
    a = np.sin(dlat / 2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    
    distance = R * c
    return distance

def calculate_clustering_risk(earthquakes):
    """ K-Means kümeleme algoritması kullanarak risk bölgelerini tespit eder. (Orijinal YZ Kodunuz) """
    
    coords = []
    for eq in earthquakes:
        if eq.get('geojson') and eq['geojson'].get('coordinates'):
            lon, lat = eq['geojson']['coordinates']
            mag = eq.get('mag', 0) 
            coords.append([lon, lat, mag])
    
    # Hata Kontrolü: Kümeleme için yeterli veri olmaması
    if len(coords) < 10: 
        return {"status": "low_activity", "risk_regions": []}

    X = np.array(coords)
    # Hata Kontrolü: Küme sayısı minimum veri sayısının yarısından fazla olamaz
    NUM_CLUSTERS = min(5, len(coords) // 2)
    
    try:
        # YZ Modeli: K-Means ile kümeleme yap
        kmeans = KMeans(n_clusters=NUM_CLUSTERS, random_state=42, n_init=10)
        kmeans.fit(X)
    except ValueError as e:
        print(f"K-Means Hatası: {e}")
        return {"status": "error", "message": "Kümeleme modelinde bir hata oluştu."}

    risk_regions = []
    
    for i, center in enumerate(kmeans.cluster_centers_):
        cluster_points = X[kmeans.labels_ == i]
        avg_mag = np.mean(cluster_points[:, 2])
        density_factor = len(cluster_points) / len(earthquakes) 
        
        # Basit Risk Formülü: Ortalama büyüklük * Yoğunluk faktörü ile 0-10 arası bir skor elde et
        risk_score = min(10, round(avg_mag * 2 + density_factor * 10, 1))
        
        risk_regions.append({
            "id": i,
            "lon": center[0],
            "lat": center[1],
            "score": risk_score,
            "density": len(cluster_points)
        })

    return {"status": "success", "risk_regions": risk_regions}


# --- API UÇ NOKTALARI ---

@app.route('/api/risk', methods=['GET'])
def get_risk_analysis():
    """ Ön uçtan gelen isteklere YZ analiz sonuçlarını döndürür. """
    
    print("Risk analizi isteği alındı...")
    start_time = time.time()
    
    # Hata Kontrolü: Kandilli API'sına erişim
    try:
        response = requests.get(KANDILLI_API, timeout=10)
        response.raise_for_status() 
        earthquake_data = response.json().get('result', [])
    except requests.exceptions.RequestException as e:
        print(f"HATA: Kandilli verisi çekilemedi: {e}")
        return jsonify({"error": f"Veri kaynağına erişilemedi. Lütfen Kandilli API'sını kontrol edin."}), 500

    # YZ analizini çalıştır
    risk_data = calculate_clustering_risk(earthquake_data)
    
    end_time = time.time()
    print(f"Analiz süresi: {end_time - start_time:.2f} saniye")
    
    # Sonuçları ön uca JSON olarak gönder
    return jsonify(risk_data)

@app.route('/api/set-alert', methods=['POST'])
def set_alert_settings():
    """ Kullanıcının konumunu ve bildirim telefon numarasını kaydeder. """
    data = request.get_json()
    lat = data.get('lat')
    lon = data.get('lon')
    number = data.get('number') # WhatsApp Numarası
    
    # Hata Kontrolü: Eksik veri
    if not lat or not lon or not number:
        return jsonify({"status": "error", "message": "Eksik konum veya telefon numarası bilgisi."}), 400
    
    # Numara formatı kontrolü (Basit)
    if not number.startswith('+'):
        return jsonify({"status": "error", "message": "Telefon numarası ülke kodu ile (+XX) başlamalıdır."}), 400
        
    # Geçici sözlüğe kaydet
    user_alerts[number] = {'lat': lat, 'lon': lon}
    print(f"Yeni WhatsApp Bildirim Ayarı Kaydedildi: {number} @ ({lat:.2f}, {lon:.2f})")
    return jsonify({"status": "success", "message": "Bildirim ayarlarınız kaydedildi."})


# --- ARKA PLAN BİLDİRİM KONTROLÜ ---

def check_for_big_earthquakes():
    """ Arka planda sürekli çalışır, M >= 5.0 deprem olup olmadığını kontrol eder. """
    global last_big_earthquake
    
    while True:
        time.sleep(60) # Her 60 saniyede bir kontrol et

        # Hata Kontrolü: API bağlantısı
        try:
            response = requests.get(KANDILLI_API, timeout=5)
            response.raise_for_status() 
            earthquakes = response.json().get('result', [])
        except requests.exceptions.RequestException:
            # Sessiz hata yönetimi: API ulaşılamazsa program çökmez, bekler.
            continue

        for eq in earthquakes:
            mag = eq.get('mag', 0)
            
            # 5.0 ve üzeri büyüklük ve son 30 dakikada kontrol edilmemiş olma koşulu
            if mag >= 5.0 and time.time() - last_big_earthquake['time'] > 1800:
                
                if eq.get('geojson') and eq['geojson'].get('coordinates'):
                    lon_eq, lat_eq = eq['geojson']['coordinates']
                    
                    print(f"!!! YENİ BÜYÜK DEPREM TESPİT EDİLDİ: M{mag} @ ({lat_eq:.2f}, {lon_eq:.2f})")
                    last_big_earthquake = {'mag': mag, 'time': time.time()}

                    # Kayıtlı kullanıcıları gez
                    for number, coords in user_alerts.items():
                        distance = haversine(coords['lat'], coords['lon'], lat_eq, lon_eq)
                        
                        # Kullanıcının konumuna 150 km'den yakın mı?
                        if distance < 150:
                            deprem_time_str = f"{eq.get('date')} {eq.get('time')}"
                            
                            # WhatsApp mesaj içeriği
                            body = f"🚨 ACİL DEPREM UYARISI 🚨\n"
                            body += f"Büyüklük: M{mag:.1f}\n"
                            body += f"Yer: {eq.get('location', 'Bilinmiyor')}\n"
                            body += f"Saat: {deprem_time_str}\n"
                            body += f"Mesafe: {distance:.1f} km (Konumunuza yakın)\n"
                            body += f"Lütfen güvende kalın!"
                            
                            send_whatsapp_notification(number, body)

# Arka plan iş parçacığını başlat
alert_thread = Thread(target=check_for_big_earthquakes)
alert_thread.daemon = True 
alert_thread.start()


if __name__ == '__main__':
    # Yerel geliştirme veya dinamik port ataması
    port = int(os.environ.get('PORT', 5000))
    print(f"Flask Sunucusu Başlatıldı: http://127.0.0.1:{port}/api/risk")
    app.run(host='0.0.0.0', port=port)
