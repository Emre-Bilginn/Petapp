# 🐾 PetApp

PetApp, **React Native + Expo** ile geliştirilmiş; evcil hayvan sahiplerinin günlük ihtiyaçlarını, sağlık kontrollerini ve bakım süreçlerini tek yerden yönetmesini amaçlayan bir mobil uygulamadır.

---

## 🚀 Özellikler

- 🔑 **Kullanıcı Giriş & Kayıt**
  - Firebase Authentication ile e-posta/şifre girişi
  - Kullanıcı ve veteriner rollerine uygun akışlar
- 👤 **Profil Yönetimi**
  - Kullanıcı bilgileri (isim, e-posta, fotoğraf)
  - Birden fazla evcil hayvan profili ekleme/çıkarma
- 💉 **Aşı Takvimi**
  - Aşı geçmişi ve yaklaşan aşılar
  - Bildirim/hatırlatma sistemi
- 🍖 **Beslenme Önerileri**
  - Tür ve yaşa göre planlar
- 🧬 **Makine Öğrenmesi ile Hastalık Tahmini**
  - Fotoğraftan olası hastalık sınıflandırması
  - Mobil için **TorchScript** model entegrasyonu
- 🗺️ **Veteriner Bulma**
  - Google Maps/Places ile yakın veterinerler
  - Yol tarifi ve iletişim bilgileri
- 📅 **Randevu Sistemi**
  - Uygun saatleri görüntüleme ve randevu oluşturma
- 📸 **Kayıp Hayvan İlanları**
  - Fotoğraf + konum ile ilan paylaşımı
- 🐕 **Sokak Hayvanı Bildirimi**
  - Konum bazlı paylaşım
- 📈 **Gelişim Takibi**
  - Boy, kilo, yaş kayıtları ve zaman serisi
- 💬 **Topluluk Sohbeti**
  - 1-1 veya grup sohbetleri
- ❤️ **Bağış & Sahiplendirme**
  - Bağış paylaşımı ve sahiplendirme ilanları

---

## 📦 Kurulum

> Gereksinimler: Node.js (LTS), Git, Expo CLI (opsiyonel), Android Studio/iOS Xcode (emülatör/simülatör için)

1. Depoyu klonla ve bağımlılıkları yükle:
   ```bash
   git clone <SENIN_REPO_URLIN>
   cd PetApp
   npm install
   ```

2. Ortam değişkenlerini ayarla (örnek `.env`):
   ```bash
   EXPO_PUBLIC_API_KEY=YOUR_API_KEY
   EXPO_PUBLIC_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
   EXPO_PUBLIC_PROJECT_ID=YOUR_PROJECT_ID
   EXPO_PUBLIC_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
   EXPO_PUBLIC_MESSAGING_SENDER_ID=YOUR_SENDER_ID
   EXPO_PUBLIC_APP_ID=YOUR_APP_ID
   EXPO_PUBLIC_GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
   ```

3. Uygulamayı başlat:
   ```bash
   npx expo start
   ```

4. Çalıştırma seçenekleri:
   - 📱 Expo Go uygulamasıyla QR kodu okut
   - 🤖 Android emülatöründe aç
   - 🍏 iOS simülatöründe çalıştır
   - 🌍 Web tarayıcıda test et

---

## 🛠️ Kullanılan Teknolojiler

- **React Native & Expo** — mobil uygulama çatısı
- **Firebase Authentication / Firestore / Storage** — kimlik, veri ve medya yönetimi
- **Google Maps Platform (Maps, Places, Directions)** — harita ve yer servisleri
- **Python & PyTorch (TorchScript)** — ML modeli eğitimi ve mobilde çalıştırma
- **Scikit-learn** — eğitim/test yardımcıları
- **Redux** — global state yönetimi

---

## 📂 Proje Yapısı

```bash
src/
 ├─ components/       # Ortak bileşenler
 ├─ navigation/       # Navigasyon
 ├─ redux/            # Global state yönetimi
 └─ screens/          # Ekranlar

assets/               # Görseller, ikonlar
.env                  # Ortam değişkenleri
App.js                # Giriş noktası
firebaseConfig.js     # Firebase ayarları
package.json          # Proje bağımlılıkları
.gitignore            # GitHub'a dahil edilmeyecekler
README.md             # Proje açıklaması
```

---

## 🔒 Güvenlik Notları

- API anahtarlarını **koda gömme**; `.env` / Expo config kullan.
- Depoya `node_modules`, `.expo`, `dist`, `*.keystore`, `*.p12` gibi dosyaları **yükleme**.

---

## 📬 İletişim

👤 **Geliştirici:** Emre Bilgin  

- GitHub: [@Emre-Bilginn](https://github.com/Emre-Bilginn)  
- LinkedIn: [linkedin.com/in/emrebilgin](https://www.linkedin.com/in/emre-bilgin-506143222)  
- E-posta: emrebilgin2003@gmail.com 

Projeyle ilgili sorularınız veya katkı önerileriniz için e-posta yoluyla bana ulaşabilirsiniz.

---

## 📄 Lisans

Bu proje **kişisel portföy ve öğrenme amaçlıdır**. Herhangi bir açık lisans eklenmemiştir.
