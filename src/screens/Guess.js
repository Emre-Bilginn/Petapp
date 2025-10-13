import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EXPLANATIONS_TR = {
  dermatitis:
    'Model bulguları cilt iltihabına (dermatit) işaret ediyor olabilir. Kaşıntı, kızarıklık ve pullanma görülebilir.',
  fungal_infections:
    'Mantar enfeksiyonu şüphesi var. Bulaşı riski nedeniyle kısa sürede bir veterinerden randevu almanızı öneririz.',
  healthy:
    'Görüntüde belirgin bir anormallik saptanmadı. Yine de düzenli kontroller aksatılmamalıdır.',
  hypersensitivity:
    'Alerjik bir durum (hipersensitivite) olabilir. Polen, gıda veya dış etkenlere duyarlılık söz konusu olabilir.',
  demodicosis:
    'Demodikozis (uyuz) şüphesi var. Deri altında yaşayan akarların neden olduğu ciddi bir durum olabilir.',
  ringworm:
    'Halkalı mantar (ringworm) şüphesi var. Bulaşıcı olabilir; evdeki diğer canlılar için önlem alın.',
};

const LABEL_MAP_TR = {
  dermatitis: 'Dermatit',
  fungal_infections: 'Mantar Enfeksiyonu',
  healthy: 'Sağlıklı',
  hypersensitivity: 'Aşırı Duyarlılık',
  demodicosis: 'Demodikozis (Uyuz)',
  ringworm: 'Ringworm (Halkalı Mantar)',
};

const normalizeLabel = (raw) =>
  (raw || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const DiseasePredictor = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Alert.alert(
      'Bilgilendirme',
      'Bu özellik yalnızca ön değerlendirme sunar. Kesin tanı için mutlaka veteriner hekime danışın.',
      [{ text: 'Anladım' }]
    );
  }, []);

  const ensureImagePermissions = async (type /* 'camera' | 'library' */) => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Kamera izni olmadan fotoğraf çekemezsin.');
          return false;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermelisin.');
          return false;
        }
      }
      return true;
    } catch {
      Alert.alert('Hata', 'İzinler kontrol edilirken bir sorun oluştu.');
      return false;
    }
  };

  const pickImageFromGallery = async () => {
    const ok = await ensureImagePermissions('library');
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
      aspect: [1, 1],
      exif: false,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
      setPrediction('');
    }
  };

  const pickImageFromCamera = async () => {
    const ok = await ensureImagePermissions('camera');
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
      aspect: [1, 1],
      exif: false,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
      setPrediction('');
    }
  };

  const predictDisease = async () => {
    if (!imageUri) return;

    setLoading(true);
    setPrediction('');

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch('https://petapp-api-m52k.onrender.com/predict', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(t);

      if (!res.ok) {
        throw new Error(`Sunucu hatası: ${res.status}`);
      }

      const data = await res.json();
      const cls = normalizeLabel(data.class);
      setPrediction(cls || '');
    } catch (e) {
      const msg =
        e.name === 'AbortError'
          ? 'Sunucu geç yanıtladı. Daha sonra tekrar deneyin.'
          : 'Tahmin yapılırken bir hata oluştu.';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  const prettyLabel = useMemo(() => {
    const n = normalizeLabel(prediction);
    return LABEL_MAP_TR[n] || (prediction ? prediction : '');
  }, [prediction]);

  const explanation = useMemo(() => {
    const n = normalizeLabel(prediction);
    return EXPLANATIONS_TR[n] || (prediction ? 'Bu tahmin için açıklama bulunamadı.' : '');
  }, [prediction]);

  const resetAll = () => {
    setImageUri(null);
    setPrediction('');
    setLoading(false);
  };

  const goToVet = () => {
    if (navigation?.navigate) {
      try {
        navigation.navigate('Clinics'); // uygulamanda varsa “Clinics” ekranına gider
        return;
      } catch {}
    }
    Alert.alert(
      'Veteriner Önerisi',
      'Yakındaki veterinerleri görmek için uygulamadaki ilgili sayfayı kullanabilir veya güvendiğiniz bir klinikten randevu alabilirsiniz.'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <View style={styles.container}>
        <Text style={styles.header}>Hızlı Hastalık Tahmini (Görüntü)</Text>
        <Text style={styles.subheader}>
          Bir fotoğraf yükleyin; model olası sağlık durumunu tahmin etmeye çalışsın. Bu sonuç tıbbi tanı değildir.
        </Text>

        {/* Görsel seçimi */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btn, styles.primaryBtn, loading && styles.disabled]}
            onPress={pickImageFromGallery}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>Galeriden Fotoğraf Seç</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn, loading && styles.disabled]}
            onPress={pickImageFromCamera}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryBtnText}>Kameradan Çek</Text>
          </TouchableOpacity>
        </View>

        {/* Önizleme */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={[styles.preview, styles.previewFallback]}>
            <Text style={styles.previewHint}>Lütfen bir fotoğraf seçin veya çekin</Text>
          </View>
        )}

        {/* Tahmin Aksiyonları */}
        <View style={{ width: '100%', marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.btn, styles.predictBtn, (!imageUri || loading) && styles.disabled]}
            onPress={predictDisease}
            disabled={!imageUri || loading}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>
              {loading ? 'Analiz Ediliyor…' : 'Tahmin Yap'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Yükleniyor */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0b6aa2" />
            <Text style={styles.loadingText}>Lütfen bekleyin…</Text>
          </View>
        ) : null}

        {/* Sonuç + Büyük Aksiyonlar */}
        {!!prediction && !loading ? (
          <>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Model Tahmini</Text>
                <View
                  style={[
                    styles.badge,
                    normalizeLabel(prediction) === 'healthy' ? styles.badgeOk : styles.badgeWarn,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      normalizeLabel(prediction) === 'healthy' ? styles.badgeTextOk : styles.badgeTextWarn,
                    ]}
                  >
                    {prettyLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.explanation}>{explanation}</Text>
              <Text style={styles.disclaimer}>
                Bu yalnızca ön bir değerlendirmedir. Lütfen veteriner hekime başvurun.
              </Text>
            </View>

            {/* Alt aksiyonlar: daha belirgin + açıklamalı */}
            <View style={styles.bottomActions}>
              <View style={styles.actionBlock}>
                <TouchableOpacity
                  style={[styles.bigBtn, styles.bigBtnPrimary]}
                  activeOpacity={0.9}
                  onPress={predictDisease}
                >
                  <Text style={styles.bigBtnText}>Tekrar Tahmin</Text>
                </TouchableOpacity>
                <Text style={styles.actionCaption}>Aynı fotoğrafı yeniden değerlendir.</Text>
              </View>

              <View style={styles.actionBlock}>
                <TouchableOpacity
                  style={[styles.bigBtn, styles.bigBtnAlt]}
                  activeOpacity={0.9}
                  onPress={pickImageFromGallery}
                >
                  <Text style={styles.bigBtnAltText}>Farklı Fotoğraf Seç</Text>
                </TouchableOpacity>
                <Text style={styles.actionCaption}>Başka bir görüntüyle dene.</Text>
              </View>

              <View style={styles.actionBlock}>
                <TouchableOpacity
                  style={[styles.bigBtn, styles.bigBtnWarn]}
                  activeOpacity={0.9}
                  onPress={goToVet}
                >
                  <Text style={styles.bigBtnText}>Veterinere Danış</Text>
                </TouchableOpacity>
                <Text style={styles.actionCaption}>
                  En doğru değerlendirme için uzman görüşü al.
                </Text>
              </View>
            </View>

            {/* Sıfırla */}
            <TouchableOpacity
              style={[styles.btn, styles.resetBtn]}
              onPress={resetAll}
              activeOpacity={0.9}
            >
              <Text style={styles.resetBtnText}>Seçimi Temizle</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default DiseasePredictor;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f9fc' },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' },

  header: { marginTop: 16, fontSize: 20, fontWeight: '700', color: '#041523' },
  subheader: { marginTop: 6, fontSize: 12, color: 'rgba(6,24,40,0.65)', textAlign: 'center' },

  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 14,
  },

  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#0b6aa2',
    marginRight: 8,
  },
  secondaryBtn: {
    backgroundColor: '#e2e8f0',
    marginLeft: 8,
  },
  predictBtn: {
    backgroundColor: '#0a8c61',
  },
  resetBtn: {
    backgroundColor: '#e2e8f0',
    marginTop: 12,
  },

  btnText: { color: '#fff', fontWeight: '700' },
  secondaryBtnText: { color: '#041523', fontWeight: '700' },
  resetBtnText: { color: '#041523', fontWeight: '700' },

  disabled: { opacity: 0.6 },

  preview: {
    marginTop: 16,
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: '#eef3f7',
  },
  previewFallback: { alignItems: 'center', justifyContent: 'center' },
  previewHint: { color: 'rgba(6,24,40,0.55)' },

  loadingBox: { marginTop: 12, alignItems: 'center' },
  loadingText: { marginTop: 6, color: 'rgba(6,24,40,0.65)' },

  resultCard: {
    width: '100%',
    marginTop: 14,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#041523' },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeOk: { backgroundColor: 'rgba(14,179,125,0.12)' },
  badgeWarn: { backgroundColor: 'rgba(225, 29, 72, 0.12)' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextOk: { color: '#0a8c61' },
  badgeTextWarn: { color: '#e11d48' },

  explanation: { marginTop: 8, fontSize: 13, color: 'rgba(6,24,40,0.85)', lineHeight: 20 },
  disclaimer: { marginTop: 10, fontSize: 11, color: 'rgba(6,24,40,0.6)' },

  // Alt büyük aksiyonlar
  bottomActions: {
    marginTop: 14,
    width: '100%',
  },
  actionBlock: {
    marginBottom: 10,
  },
  bigBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  bigBtnPrimary: {
    backgroundColor: '#0b6aa2',
  },
  bigBtnAlt: {
    backgroundColor: '#e2e8f0',
  },
  bigBtnWarn: {
    backgroundColor: '#e11d48',
  },
  bigBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  bigBtnAltText: {
    color: '#041523',
    fontWeight: '700',
  },
  actionCaption: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(6,24,40,0.6)',
    textAlign: 'center',
  },
});
