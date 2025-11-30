# Bu dosya, YZ modelini çalıştıracak olan Python arka ucudur (Backend).
# Kurulum gereksinimleri: pip install flask scikit-learn numpy requests flask-cors

import os
import time
from flask import Flask, jsonify
from sklearn.cluster import KMeans
import requests
import numpy as np
from flask_cors import CORS 

# --- FLASK UYGULAMASI VE AYARLARI ---
app = Flask(__name__)
# Sizin Vercel sitenizin bu API'ye erişebilmesi için CORS zorunludur.
CORS(app) 

# Kandilli verilerini çeken üçüncü taraf API
KANDILLI_API = 'https://api.orhanaydogdu.com.tr/deprem/kandilli/live'

def calculate_clustering_risk(earthquakes):
    """
    K-Means kümeleme algoritması kullanarak deprem yoğunluk merkezlerini (Risk Bölgeleri) tespit eder.
    
    earthquakes: Kandilli API'den gelen son deprem kayıtları listesi
    return: Küme merkezleri ve risk skorlarını içeren JSON
    """
    
    coords = []
    # Kümeleme için sadece enlem ve boylam verilerini hazırla
    for eq in earthquakes:
        # Hata kontrolü: Depremin coğrafi verisi var mı?
        if eq.get('geojson') and eq['geojson'].get('coordinates'):
            lon, lat = eq['geojson']['coordinates']
            # Depremin büyüklüğünü de analize dahil edebiliriz (3. boyut)
            mag = eq.get('mag', 0) 
            coords.append([lon, lat, mag])
    
    # Kümeleme için en az 10 kayda ihtiyacımız var, aksi halde düşük aktivite bildir
    if len(coords) < 10: 
        return {"status": "low_activity", "risk_regions": []}

    X = np.array(coords)
    
    # Kaç risk merkezi arayacağımızı belirleriz (Örn: 5 en yoğun küme)
    NUM_CLUSTERS = min(5, len(coords) // 2)
    
    # YZ Modeli: K-Means ile kümeleme yap
    try:
        # n_init=10: Modelin 10 farklı başlangıç noktası denemesini sağlar (daha iyi sonuç)
        kmeans = KMeans(n_clusters=NUM_CLUSTERS, random_state=42, n_init=10)
        kmeans.fit(X)
    except ValueError as e:
        print(f"K-Means Hatası: {e}")
        return {"status": "error", "message": "Kümeleme modelinde bir hata oluştu."}

    risk_regions = []
    
    # Her küme merkezini analiz et
    for i, center in enumerate(kmeans.cluster_centers_):
        # Kümedeki tüm depremleri bul
        cluster_points = X[kmeans.labels_ == i]
        
        # Risk Skoru Hesaplama (YZ Çıktısı): Kümedeki depremlerin ortalama büyüklüğünü ve yoğunluğunu kullan
        avg_mag = np.mean(cluster_points[:, 2]) # Üçüncü sütun büyüklük (mag)
        density_factor = len(cluster_points) / len(earthquakes) # Küme yoğunluğu
        
        # Basit Risk Formülü: Ortalama büyüklük * Yoğunluk faktörü ile 0-10 arası bir skor elde et
        risk_score = min(10, round(avg_mag * 2 + density_factor * 10, 1)) 
        
        risk_regions.append({
            "id": i,
            "lon": center[0],
            "lat": center[1],
            "score": risk_score, # YZ tarafından belirlenen risk puanı
            "density": len(cluster_points) # Kümedeki deprem sayısı
        })

    return {"status": "success", "risk_regions": risk_regions}


@app.route('/api/risk', methods=['GET'])
def get_risk_analysis():
    """
    Ön uçtan gelen isteklere YZ analiz sonuçlarını döndüren ana API uç noktası.
    """
    
    print("Risk analizi isteği alındı...")
    start_time = time.time()
    
    # 1. Kandilli verisini çek
    try:
        response = requests.get(KANDILLI_API, timeout=10)
        response.raise_for_status() 
        earthquake_data = response.json().get('result', [])
    except Exception as e:
        print(f"HATA: Kandilli verisi çekilemedi: {e}")
        return jsonify({"error": f"Veri kaynağına erişilemedi: {e}"}), 500

    # 2. YZ analizini çalıştır
    risk_data = calculate_clustering_risk(earthquake_data)
    
    end_time = time.time()
    print(f"Analiz süresi: {end_time - start_time:.2f} saniye")
    
    # 3. Sonuçları ön uca JSON olarak gönder
    return jsonify(risk_data)

if __name__ == '__main__':
    # Yerel geliştirme için 5000 portunu kullan
    # Heroku/Render için dinamik port kullanır
    port = int(os.environ.get('PORT', 5000))
    print(f"Flask Sunucusu Başlatıldı: http://127.0.0.1:{port}/api/risk")
    app.run(host='0.0.0.0', port=port)
