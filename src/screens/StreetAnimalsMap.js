import { faCat, faDog, faDove, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, storage } from '../../firebaseConfig';
import { CustomButton } from '../components/Index';

const TYPE_OPTIONS = [
  { id: 'dog', label: 'Köpek', icon: faDog },
  { id: 'cat', label: 'Kedi', icon: faCat },
  { id: 'bird', label: 'Kuş', icon: faDove },
  { id: 'other', label: 'Diğer', icon: faExclamationTriangle },
];

// Firestore'a Türkçe yazmak için harita
const TYPE_TR = {
  dog: 'Köpek',
  cat: 'Kedi',
  bird: 'Kuş',
  other: 'Diğer',
};

const DEFAULT_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

// fetch -> blob (XHR fallback)
const uriToBlob = async (uri) => {
  try {
    const res = await fetch(uri);
    return await res.blob();
  } catch {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError('Dosya okunurken bir sorun oluştu.'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  }
};

const StreetAnimalsMap = () => {
  const [animals, setAnimals] = useState([]);
  const [isLoadingAnimals, setIsLoadingAnimals] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [currentCoords, setCurrentCoords] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [imageMeta, setImageMeta] = useState(null); // { mimeType, fileName, ext }
  const [selectedType, setSelectedType] = useState('dog');
  const [conditionInput, setConditionInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // İzin yardımcıları
  const ensureImagePermissions = async (type /* 'camera' | 'library' */) => {
    try {
      if (type === 'camera') {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (cam.status !== 'granted') {
          Alert.alert('İzin gerekli', 'Kamera izni olmadan fotoğraf çekemezsin.');
          return false;
        }
      } else {
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (lib.status !== 'granted') {
          Alert.alert('İzin gerekli', 'Galeriden fotoğraf seçmek için izin vermelisin.');
          return false;
        }
      }
      return true;
    } catch (e) {
      console.warn('Permission error:', e);
      Alert.alert('Hata', 'İzinler kontrol edilirken bir sorun oluştu.');
      return false;
    }
  };

  useEffect(() => {
    const requestLocation = async () => {
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync(); // iOS preflight (opsiyonel)
        const locPerm = await Location.requestForegroundPermissionsAsync();
        if (locPerm.status !== 'granted') {
          setLocationError('Konum izni verilmedi. Harita seni İstanbul çevresinde gösterecek.');
        } else {
          const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude, longitude } = currentLocation.coords;
          setCurrentCoords({ latitude, longitude });
        }
      } catch (error) {
        console.error('Konum alınamadı:', error);
        setLocationError('Konum bilgisi alınırken bir sorun oluştu.');
      }
    };
    requestLocation();
  }, []);

  const fetchAnimals = useCallback(async () => {
    try {
      setIsLoadingAnimals(true);
      const snapshot = await getDocs(collection(db, 'animals'));
      const items = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .filter((item) => item.location && item.location.latitude && item.location.longitude);

      items.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
        const bDate = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
        return bDate - aDate;
      });

      setAnimals(items);
    } catch (error) {
      console.error('Hayvanlar getirilemedi:', error);
      Alert.alert('Hata', 'Bildirimler yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoadingAnimals(false);
    }
  }, []);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  const handlePickImage = async () => {
    const ok = await ensureImagePermissions('library');
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMeta({
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || null,
        ext:
          (asset.fileName && asset.fileName.split('.').pop()?.toLowerCase()) ||
          (asset.mimeType?.split('/').pop()?.toLowerCase()) ||
          'jpg',
      });
      setIsModalVisible(true);
    }
  };

  const handleTakePhoto = async () => {
    const ok = await ensureImagePermissions('camera');
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageMeta({
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || null,
        ext:
          (asset.fileName && asset.fileName.split('.').pop()?.toLowerCase()) ||
          (asset.mimeType?.split('/').pop()?.toLowerCase()) ||
          'jpg',
      });
      setIsModalVisible(true);
    }
  };

  const resetModalState = () => {
    setImageUri(null);
    setImageMeta(null);
    setConditionInput('');
    setDescriptionInput('');
    setSelectedType('dog');
    setIsModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Eksik bilgi', 'Lütfen bir fotoğraf seç.');
      return;
    }
    if (!conditionInput.trim() || !descriptionInput.trim()) {
      Alert.alert('Eksik bilgi', 'Lütfen durum ve açıklama alanlarını doldur.');
      return;
    }

    try {
      setIsSubmitting(true);

      // --- FOTOĞRAF YÜKLE (sadece animals/ altında) ---
      const blob = await uriToBlob(imageUri);
      const ext = (imageMeta?.ext || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
      const contentType = imageMeta?.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
      const filename = `animals/${Date.now()}.${ext}`;
      const imageRef = ref(storage, filename);
      await uploadBytes(imageRef, blob, { contentType });
      const imageUrl = await getDownloadURL(imageRef);

      // --- FIRESTORE KAYDI (Türkçe type) ---
      await addDoc(collection(db, 'animals'), {
        imageUrl,
        condition: conditionInput.trim(),
        description: descriptionInput.trim(),
        type: TYPE_TR[selectedType], // <-- Türkçe yaz
        location: currentCoords ?? DEFAULT_REGION,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Teşekkürler', 'Bildirim ekibimize iletildi.');
      resetModalState();
      fetchAnimals();
    } catch (error) {
      console.error('Upload/Save error payload:', JSON.stringify(error, null, 2));
      Alert.alert('Hata', `Yükleme başarısız: ${error?.code || ''}\n${error?.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const region = useMemo(() => {
    if (currentCoords) {
      return {
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return DEFAULT_REGION;
  }, [currentCoords]);

  // TR & EN tip değerlerini ikonla eşleştir
  const renderMarkerIcon = (typeVal) => {
    const val = (typeVal || '').toString().toLowerCase();

    if (val === 'kedi' || val === 'cat') return <FontAwesomeIcon icon={faCat} size={28} color="#f97316" />;
    if (val === 'kuş' || val === 'kus' || val === 'bird')
      return <FontAwesomeIcon icon={faDove} size={28} color="#14b8a6" />;
    if (val === 'diğer' || val === 'diger' || val === 'other')
      return <FontAwesomeIcon icon={faExclamationTriangle} size={28} color="#e11d48" />;

    // varsayılan: köpek
    return <FontAwesomeIcon icon={faDog} size={28} color="#0ea5e9" />;
  };

  const renderAnimalCard = (animal) => {
    const createdAt = animal.createdAt?.toDate?.() ?? new Date(animal.createdAt ?? Date.now());
    return (
      <View key={animal.id} style={styles.reportCard}>
        <View style={styles.reportHeader}>
          {renderMarkerIcon(animal.type)}
          <View style={styles.reportHeaderInfo}>
            <Text style={styles.reportTitle}>{animal.type?.toUpperCase?.() ?? 'BİLDİRİM'}</Text>
            <Text style={styles.reportMeta}>
              {createdAt.toLocaleString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        <Text style={styles.reportText}>Durum: {animal.condition}</Text>
        <Text style={styles.reportText}>Açıklama: {animal.description}</Text>

        {animal.imageUrl ? <Image source={{ uri: animal.imageUrl }} style={styles.reportImage} /> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Sokak Hayvanı Bildir</Text>
          <Text style={styles.heroSubtitle}>
            Fotoğraf çekerek veya galeriden seçerek sokaktaki canlara dair durumu ekibimize iletebilirsin.
          </Text>
          {locationError ? <Text style={styles.heroWarning}>{locationError}</Text> : null}
        </View>

        <View style={styles.mapWrapper}>
          <MapView style={styles.map} initialRegion={region} region={region} showsUserLocation>
            {animals.map((animal) => (
              <Marker
                key={animal.id}
                coordinate={{ latitude: animal.location.latitude, longitude: animal.location.longitude }}
                title={animal.type}
                description={animal.description}
              >
                {renderMarkerIcon(animal.type)}
              </Marker>
            ))}
          </MapView>
        </View>

        <View style={styles.actionRow}>
          <CustomButton
            buttonText="Galeriden Seç"
            setWidth="48%"
            handleOnPress={handlePickImage}
            buttonColor="#0b6aa2"
            pressedButtonColor="#084d73"
          />
        </View>
        <View style={[styles.actionRow, { marginTop: 10 }]}>
          <CustomButton
            buttonText="Kamera ile Çek"
            setWidth="48%"
            handleOnPress={handleTakePhoto}
            buttonColor="#2fbf71"
            pressedButtonColor="#249760"
          />
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Son Bildirimler</Text>
          <TouchableOpacity onPress={fetchAnimals} disabled={isLoadingAnimals} activeOpacity={0.7}>
            <Text style={[styles.refreshText, isLoadingAnimals && styles.refreshTextDisabled]}>
              {isLoadingAnimals ? 'Yükleniyor...' : 'Yenile'}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoadingAnimals ? (
          <ActivityIndicator size="large" color="#0b6aa2" style={styles.loader} />
        ) : animals.length ? (
          animals.map(renderAnimalCard)
        ) : (
          <Text style={styles.emptyText}>
            Henüz bir bildirim yok. İlk sen paylaşmak istersen üstteki butonları kullanabilirsin.
          </Text>
        )}
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={resetModalState}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hayvanı Bildir</Text>
            <Text style={styles.modalSubtitle}>Durumu kısaca anlat, not ekle ve gönder.</Text>

            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}

            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((option) => {
                const isActive = selectedType === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.typeChip, isActive && styles.typeChipActive]}
                    onPress={() => setSelectedType(option.id)}
                    activeOpacity={0.85}
                  >
                    <FontAwesomeIcon
                      icon={option.icon}
                      size={16}
                      color={isActive ? '#0a8c61' : 'rgba(6, 24, 40, 0.55)'}
                    />
                    <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Hayvanın durumu"
              value={conditionInput}
              onChangeText={setConditionInput}
            />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Kısa açıklama"
              value={descriptionInput}
              onChangeText={setDescriptionInput}
              multiline
            />

            <View style={styles.modalButtons}>
              <CustomButton
                buttonText={isSubmitting ? 'Gönderiliyor...' : 'Paylaş'}
                setWidth="100%"
                handleOnPress={handleSubmit}
                buttonColor="#2fbf71"
                pressedButtonColor="#249760"
                isDisabled={isSubmitting}
              />
              <TouchableOpacity style={styles.modalCancel} onPress={resetModalState} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StreetAnimalsMap;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f9fc' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  heroCard: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#041523' },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: 'rgba(6, 24, 40, 0.65)' },
  heroWarning: { marginTop: 10, fontSize: 13, color: '#e53935' },
  mapWrapper: { marginTop: 20, borderRadius: 24, overflow: 'hidden', height: 320, backgroundColor: '#e0ecf4' },
  map: { flex: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#041523' },
  refreshText: { fontSize: 14, fontWeight: '600', color: '#0b6aa2' },
  refreshTextDisabled: { opacity: 0.5 },
  loader: { marginTop: 20 },
  emptyText: { marginTop: 16, fontSize: 14, color: 'rgba(6, 24, 40, 0.65)', lineHeight: 20 },
  reportCard: {
    marginTop: 16, padding: 18, borderRadius: 20, backgroundColor: '#ffffff',
    shadowColor: '#041523', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 4,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center' },
  reportHeaderInfo: { marginLeft: 14 },
  reportTitle: { fontSize: 16, fontWeight: '700', color: '#041523' },
  reportMeta: { fontSize: 12, color: 'rgba(6, 24, 40, 0.55)', marginTop: 2 },
  reportText: { marginTop: 10, fontSize: 13, color: 'rgba(6, 24, 40, 0.75)', lineHeight: 18 },
  reportImage: { marginTop: 14, width: '100%', height: 160, borderRadius: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4, 21, 35, 0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxWidth: 420, borderRadius: 24, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, backgroundColor: '#ffffff' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#041523' },
  modalSubtitle: { marginTop: 6, fontSize: 13, color: 'rgba(6, 24, 40, 0.65)' },
  previewImage: { marginTop: 18, width: '100%', height: 180, borderRadius: 16 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(6, 24, 40, 0.1)', backgroundColor: '#ffffff',
  },
  typeChipActive: { borderColor: 'rgba(14, 179, 125, 0.45)', backgroundColor: 'rgba(14, 179, 125, 0.12)' },
  typeChipText: { marginLeft: 8, fontSize: 13, color: 'rgba(6, 24, 40, 0.6)' },
  typeChipTextActive: { color: '#0a8c61', fontWeight: '600' },
  input: { marginTop: 16, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(6, 24, 40, 0.05)', fontSize: 14, color: '#041523' },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { marginTop: 24 },
  modalCancel: { marginTop: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: 'rgba(6, 24, 40, 0.6)' },
});
