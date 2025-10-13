import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getAuth, updateProfile } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';

// --- Permissions
const requestLibraryPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('İzin gerekli', 'Profil fotoğrafını güncellemek için galeri izni vermen gerekiyor.');
    return false;
  }
  return true;
};

const resolveMediaTypes = () => {
  if (ImagePicker.MediaType?.photo) return [ImagePicker.MediaType.photo];
  return undefined;
};

// --- fetch -> blob (XHR fallback)
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

// --- Eski foto silme (path ile)
const tryDeleteOldPhoto = async (storage, oldPath) => {
  if (!oldPath) return;
  try {
    await deleteObject(ref(storage, oldPath));
  } catch (err) {
    console.warn('Eski profil foto silinemedi:', err?.message || err);
  }
};

const ProfilePage = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  const storage = getStorage();
  const navigation = useNavigation();

  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState(user?.photoURL || null);

  // Silme için mevcut referanslar
  const [serverPhotoURL, setServerPhotoURL] = useState(user?.photoURL || null);
  const [serverPhotoPath, setServerPhotoPath] = useState(null);

  const [pets, setPets] = useState([]);
  const [isPetModalVisible, setPetModalVisible] = useState(false);
  const [newPet, setNewPet] = useState({ name: '', age: '', type: 'Kedi' });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const displayInitial = useMemo(() => {
    const source = name || email;
    return source ? source.charAt(0).toUpperCase() : 'P';
  }, [name, email]);

  // --- Kullanıcı verileri + liste
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userDocRef = doc(db, 'Users', user.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || user.displayName || '');
          setEmail(data.email || user.email || '');

          const photoURL = data.photoURL || user.photoURL || null;
          const photoPath = data.photoPath || null;

          setProfileImage(photoURL);
          setServerPhotoURL(photoURL);
          setServerPhotoPath(photoPath);
        } else {
          setProfileImage(user.photoURL || null);
          setServerPhotoURL(user.photoURL || null);
          setServerPhotoPath(null);
        }
      } catch (e) {
        console.warn('Kullanıcı verisi okunamadı:', e?.message || e);
      }
    };

    const fetchPets = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'Pets'), where('ownerId', '==', user.uid));
        const qs = await getDocs(q);
        setPets(qs.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('Evcil listesi alınamadı:', e?.message || e);
      }
    };

    fetchUserData();
    fetchPets();
  }, [db, user]);

  // --- Foto seç & yükle
  const pickImage = async () => {
    if (!(await requestLibraryPermission()) || !user) return;

    const previousImage = profileImage;
    let newPath = null;
    let downloadURL = null;

    try {
      const mediaTypes = resolveMediaTypes();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return;

      const selected = result.assets?.[0];
      if (!selected?.uri) {
        Alert.alert('Hata', 'Seçilen görsel okunamadı.');
        return;
      }

      setIsUploadingPhoto(true);
      setProfileImage(selected.uri); // optimistic

      // 1) Storage’a yükle
      try {
        newPath = `profileImages/${user.uid}/${Date.now()}.jpg`;
        const blob = await uriToBlob(selected.uri);
        const imageRef = ref(storage, newPath);
        await uploadBytes(imageRef, blob, { contentType: selected.mimeType || 'image/jpeg' });
        blob.close?.();
        downloadURL = await getDownloadURL(imageRef);
      } catch (e) {
        console.error('Yükleme hatası:', e);
        Alert.alert('Hata', 'Fotoğraf Storage’a yüklenemedi.');
        throw e;
      }

      // 2) Auth güncelle
      try {
        await updateProfile(user, { photoURL: downloadURL });
      } catch (e) {
        console.error('Auth güncelleme hatası:', e);
        Alert.alert('Hata', 'Profil (Auth) güncellenemedi.');
        throw e;
      }

      // 3) Firestore güncelle
      try {
        await setDoc(
          doc(db, 'Users', user.uid),
          { photoURL: downloadURL, photoPath: newPath, name, email },
          { merge: true }
        );
      } catch (e) {
        console.error('Firestore güncelleme hatası:', e);
        Alert.alert('Hata', 'Profil (Firestore) güncellenemedi.');
        throw e;
      }

      // 4) Eski fotoğrafı sil (eski path varsa)
      try {
        if (serverPhotoPath && serverPhotoPath !== newPath) {
          await tryDeleteOldPhoto(storage, serverPhotoPath);
        }
      } catch (e) {
        // Silme başarısız olsa bile akışı bozmayalım
        console.warn('Eski foto silme uyarısı:', e?.message || e);
      }

      // 5) State’i güncelle
      setProfileImage(downloadURL);
      setServerPhotoURL(downloadURL);
      setServerPhotoPath(newPath);

      Alert.alert('Profil güncellendi', 'Yeni profil fotoğrafın kaydedildi.');
    } catch (error) {
      // optimistic preview geri al
      setProfileImage(previousImage);
      console.error('Profil fotoğrafı yüklenirken hata (genel):', error);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // --- Pet Modal kontrol
  const togglePetModal = () => {
    setPetModalVisible((prev) => !prev);
    setNewPet({ name: '', age: '', type: 'Kedi' });
  };

  const handleAddPet = async () => {
    const trimmedName = newPet.name.trim();
    const trimmedAge = newPet.age.trim();

    if (!trimmedName || !trimmedAge || !newPet.type) {
      Alert.alert('Eksik bilgi', 'Tüm alanları doldurduğundan emin ol.');
      return;
    }
    if (!auth.currentUser) {
      Alert.alert('Hata', 'Lütfen tekrar giriş yapmayı dene.');
      return;
    }

    try {
      const payload = {
        name: trimmedName,
        age: trimmedAge,
        type: newPet.type,
        ownerId: auth.currentUser.uid,
        createdAt: new Date(),
      };
      const petDoc = await addDoc(collection(db, 'Pets'), payload);
      setPets((prev) => [...prev, { id: petDoc.id, ...payload }]);
      togglePetModal();
      Alert.alert('Harika!', `${trimmedName} için kayıt oluşturuldu.`);
    } catch (error) {
      console.error('Evcil hayvan ekleme hatası:', error);
      Alert.alert('Hata', 'Evcil hayvan eklenirken bir sorun oldu.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={pickImage}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Profil fotoğrafını değiştir"
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>{displayInitial}</Text>
            )}
            <View style={[styles.cameraBadge, isUploadingPhoto && styles.cameraBadgeDisabled]}>
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <FeatherIcon name="camera" size={14} color="#ffffff" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{name || 'İsimsiz Profil'}</Text>
          <Text style={styles.profileEmail}>{email}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('PasswordResetScreen', { mode: 'change' })}
            >
              <FeatherIcon name="lock" size={16} color="#0b6aa2" />
              <Text style={styles.actionButtonText}>Şifre değiştir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('AccountSettingsScreen')}
            >
              <FeatherIcon name="shield" size={16} color="#0b6aa2" />
              <Text style={styles.actionButtonText}>Güvenlik ayarları</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Evcil Dostlar</Text>
            <TouchableOpacity style={styles.addButton} onPress={togglePetModal}>
              <FeatherIcon name="plus" size={16} color="#ffffff" />
              <Text style={styles.addButtonText}>Yeni Ekle</Text>
            </TouchableOpacity>
          </View>

          {pets.length > 0 ? (
            <View style={styles.petList}>
              {pets.map((pet) => (
                <View key={pet.id} style={styles.petCard}>
                  <View style={styles.petIconWrapper}>
                    <Text style={styles.petIcon}>
                      {pet.type === 'Köpek' ? '🐶' : pet.type === 'Kedi' ? '🐱' : pet.type === 'Kuş' ? '🦜' : '🐾'}
                    </Text>
                  </View>
                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petMeta}>{pet.type} • {pet.age} yaşında</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.petAction}
                    onPress={() => Alert.alert('Yakında', 'Düzenleme özelliği üzerinde çalışıyoruz.')}
                  >
                    <FeatherIcon name="edit-2" size={16} color="#0b6aa2" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Henüz kayıt yok</Text>
              <Text style={styles.emptySubtitle}>Evcil dostlarının sağlık kayıtlarını burada tutabilirsin.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={isPetModalVisible} onRequestClose={togglePetModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Evcil dost ekle</Text>
            <Text style={styles.modalSubtitle}>Takip listende yer alacak yeni bir kayıt oluştur.</Text>

            <TextInput
              value={newPet.name}
              onChangeText={(text) => setNewPet((prev) => ({ ...prev, name: text }))}
              placeholder="Evcil hayvanın adı"
              style={styles.input}
            />

            <Picker
              selectedValue={newPet.type}
              onValueChange={(value) => setNewPet((prev) => ({ ...prev, type: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Kedi" value="Kedi" />
              <Picker.Item label="Köpek" value="Köpek" />
              <Picker.Item label="Kuş" value="Kuş" />
              <Picker.Item label="Balık" value="Balık" />
              <Picker.Item label="Diğer" value="Diğer" />
            </Picker>

            <TextInput
              value={newPet.age}
              onChangeText={(text) => setNewPet((prev) => ({ ...prev, age: text }))}
              placeholder="Yaş"
              keyboardType="number-pad"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButtonGhost} onPress={togglePetModal}>
                <Text style={styles.modalButtonGhostText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleAddPet}>
                <Text style={styles.modalButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isUploadingPhoto ? (
        <View style={styles.uploadOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#0eb37d" />
          <Text style={styles.uploadOverlayText}>Fotoğraf yükleniyor...</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

export default ProfilePage;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f9fc' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  profileCard: {
    marginTop: 16,
    padding: 24,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 48, fontWeight: '700', color: '#0eb37d' },
  cameraBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#0eb37d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadgeDisabled: { opacity: 0.4 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#041523' },
  profileEmail: { marginTop: 4, fontSize: 15, color: 'rgba(6, 24, 40, 0.6)' },
  actionRow: { flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-between' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 106, 162, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  actionButtonText: { marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#0b6aa2' },
  section: { marginTop: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#041523' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0eb37d', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  addButtonText: { marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#ffffff' },
  petList: { gap: 12 },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  petIconWrapper: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(11, 106, 162, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  petIcon: { fontSize: 24 },
  petInfo: { flex: 1 },
  petName: { fontSize: 16, fontWeight: '700', color: '#041523' },
  petMeta: { marginTop: 4, fontSize: 13, color: 'rgba(6, 24, 40, 0.6)' },
  petAction: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, borderRadius: 24, backgroundColor: 'rgba(14, 179, 125, 0.08)' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#041523' },
  emptySubtitle: { marginTop: 8, fontSize: 14, color: 'rgba(6, 24, 40, 0.65)', textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4, 21, 35, 0.55)', alignItems: 'center', justifyContent: 'flex-end' },
  modalCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#041523' },
  modalSubtitle: { marginTop: 6, fontSize: 14, color: 'rgba(6, 24, 40, 0.6)' },
  input: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(6, 24, 40, 0.04)', fontSize: 15, color: '#041523' },
  picker: { marginTop: 16, borderRadius: 14, backgroundColor: 'rgba(6, 24, 40, 0.04)' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  modalButtonGhost: { flex: 1, marginRight: 12, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(6, 24, 40, 0.1)', alignItems: 'center' },
  modalButtonGhostText: { fontSize: 15, fontWeight: '600', color: 'rgba(6, 24, 40, 0.7)' },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#0eb37d', alignItems: 'center' },
  modalButtonText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4, 21, 35, 0.35)' },
  uploadOverlayText: { marginTop: 16, fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
