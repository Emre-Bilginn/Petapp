import { faCat, faDog, faDove, faExclamationTriangle, faImage, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, storage } from '../../firebaseConfig';
import { CustomButton } from '../components/Index';

const TYPE_OPTIONS = [
  { id: 'dog', label: 'Köpek', icon: faDog },
  { id: 'cat', label: 'Kedi', icon: faCat },
  { id: 'bird', label: 'Kuş', icon: faDove },
  { id: 'other', label: 'Diğer', icon: faExclamationTriangle },
];

const TYPE_TR = {
  dog: 'Köpek',
  cat: 'Kedi',
  bird: 'Kuş',
  other: 'Diğer',
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

const AddLostPetScreen = ({ navigation }) => {
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('dog');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [imageUri, setImageUri] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const isValid = useMemo(
    () => petName.trim() && description.trim() && contact.trim() && imageUri,
    [petName, description, contact, imageUri]
  );

  const handlePickImage = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeriden fotoğraf seçmek için izin vermelisin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const resetForm = () => {
    setPetName('');
    setPetType('dog');
    setDescription('');
    setContact('');
    setImageUri(null);
    setUploadPct(0);
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('Eksik bilgi', 'Lütfen hayvan adı, açıklama, iletişim ve fotoğrafı ekleyin.');
      return;
    }
    try {
      setIsSubmitting(true);

      // 1) Storage’a yükle
      const blob = await uriToBlob(imageUri);
      const filename = `lostPets/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const imageRef = ref(storage, filename);

      const task = uploadBytesResumable(imageRef, blob, { contentType: 'image/jpeg' });
      task.on('state_changed', (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setUploadPct(pct);
      });
      await task;
      const downloadURL = await getDownloadURL(imageRef);

      // 2) Firestore’a ilanı yaz
      const user = auth.currentUser;
      await addDoc(collection(db, 'lost_pets'), {
        petName: petName.trim(),
        petType: TYPE_TR[petType], // Türkçe
        description: description.trim(),
        contact: contact.trim(),
        imageUrl: downloadURL,
        status: 'Kayıp',
        createdAt: serverTimestamp(),
        ownerId: user?.uid ?? null,
        ownerEmail: user?.email ?? null,
      });

      Alert.alert('Başarılı', 'İlan başarıyla oluşturuldu.');
      resetForm();
      navigation.goBack();
    } catch (err) {
      console.error('LostPet submit error:', err);
      Alert.alert('Hata', err?.message || 'İlan oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>Kayıp Hayvan İlanı</Text>
          <Text style={styles.headerSubtitle}>Bilgileri gir ve galeriden bir fotoğraf seç.</Text>

          {/* Tür chip'leri */}
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((t) => {
              const active = petType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setPetType(t.id)}
                  activeOpacity={0.85}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <FontAwesomeIcon icon={t.icon} size={16} color={active ? '#0a8c61' : 'rgba(6,24,40,0.55)'} />
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Hayvan Adı *</Text>
            <TextInput
              value={petName}
              onChangeText={setPetName}
              placeholder="Örn: Pamuk"
              style={styles.input}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Açıklama *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Örn: Siyah beyaz tekir, mavi tasma, son görülme Üsküdar Meydan."
              style={[styles.input, styles.multiline]}
              multiline
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>İletişim Bilgisi *</Text>
            <TextInput
              value={contact}
              onChangeText={setContact}
              placeholder="Telefon veya e-posta"
              style={styles.input}
              keyboardType="default"
              autoCapitalize="none"
            />
          </View>

          {/* Fotoğraf */}
          <View style={styles.photoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesomeIcon icon={faImage} size={18} color="#0b6aa2" />
              <Text style={styles.photoTitle}>İlan Fotoğrafı *</Text>
            </View>

            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <Text style={styles.photoHint}>Galeriden bir fotoğraf seç.</Text>
            )}

            <View style={styles.photoActions}>
              <CustomButton
                buttonText="Galeriden Seç"
                setWidth="100%"
                buttonColor="#0b6aa2"
                pressedButtonColor="#084d73"
                handleOnPress={handlePickImage}
              />
            </View>

            {isSubmitting ? (
              <Text style={styles.progressText}>Yükleniyor: %{uploadPct}</Text>
            ) : null}
          </View>

          {/* Gönder */}
          <View style={{ marginTop: 18 }}>
            <CustomButton
              buttonText={isSubmitting ? 'Kaydediliyor…' : 'İlanı Ekle'}
              setWidth="100%"
              isDisabled={!isValid || isSubmitting}
              buttonColor="#0a8c61"
              pressedButtonColor="#08734f"
              handleOnPress={handleSubmit}
              leftIcon={<FontAwesomeIcon icon={faPaperPlane} size={14} color="#fff" />}
            />
            {!isValid && (
              <Text style={styles.validationHint}>
                * Zorunlu alanlar: Hayvan adı, açıklama, iletişim ve fotoğraf.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddLostPetScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f9fc' },
  container: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTitle: { marginTop: 16, fontSize: 22, fontWeight: '700', color: '#041523' },
  headerSubtitle: { marginTop: 6, fontSize: 13, color: 'rgba(6,24,40,0.65)' },

  // gap KALDIRILDI, margin kullanıldı
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(6,24,40,0.1)',
    backgroundColor: '#ffffff',
    marginRight: 10,   // <-- gap yerine
    marginBottom: 10,  // <-- gap yerine
  },
  typeChipActive: { borderColor: 'rgba(14,179,125,0.45)', backgroundColor: 'rgba(14,179,125,0.12)' },
  typeChipText: { marginLeft: 8, fontSize: 13, color: 'rgba(6,24,40,0.6)' },
  typeChipTextActive: { color: '#0a8c61', fontWeight: '600' },

  formGroup: { marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(6,24,40,0.75)', marginBottom: 8 },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(6,24,40,0.05)',
    fontSize: 14,
    color: '#041523',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },

  photoCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  photoTitle: { marginLeft: 8, fontSize: 14, fontWeight: '700', color: '#0b6aa2' },
  photoHint: { marginTop: 8, fontSize: 13, color: 'rgba(6,24,40,0.6)' },
  previewImage: { marginTop: 12, width: '100%', height: 180, borderRadius: 12 },

  photoActions: { marginTop: 12 },
  progressText: { marginTop: 8, fontSize: 12, color: 'rgba(6,24,40,0.6)' },

  validationHint: { marginTop: 8, fontSize: 12, color: '#e53935' },
});
