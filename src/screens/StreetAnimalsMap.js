import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, TextInput, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDog, faCat, faHorse } from '@fortawesome/free-solid-svg-icons';

const StreetAnimalsMap = () => {
  const [animals, setAnimals] = useState([]);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Konum izni verilmedi');
        return;
      }
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
    })();
  }, []);

  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'animals'));
        const animalData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnimals(animalData);
      } catch (error) {
        console.error('Hata:', error);
      }
    };
    fetchAnimals();
  }, []);

  const getAnimalIcon = (type) => {
    switch (type) {
      case 'Köpek': return faDog;
      case 'Kedi': return faCat;
      case 'At': return faHorse;
      default: return faDog;
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeriye erişmek için izni vermelisiniz.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setModalVisible(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamerayı kullanmak için izni vermelisiniz.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setModalVisible(true);
    }
  };

  const uploadToFirebase = async () => {
    if (!imageUri || !condition || !description || !type) {
      Alert.alert('Hata', 'Lütfen tüm bilgileri girin.');
      return;
    }

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = `animals/${Date.now()}.jpg`;
      const imageRef = ref(storage, filename);

      await uploadBytes(imageRef, blob);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, 'animals'), {
        imageUrl,
        condition,
        description,
        type,
        location: location ? { latitude: location.latitude, longitude: location.longitude } : null,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Başarılı', 'Fotoğraf ve bilgiler başarıyla yüklendi!');
      setModalVisible(false);
      setCondition('');
      setDescription('');
      setType('');
      setImageUri(null);
    } catch (error) {
      console.error('❌ Hata:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir sorun oluştu.');
    }
  };

  return (
    <View style={styles.container}>
      {errorMsg ? <Text>{errorMsg}</Text> : null}
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
        >
          {animals.map(animal => (
            <Marker
              key={animal.id}
              coordinate={{
                latitude: animal.location.latitude,
                longitude: animal.location.longitude,
              }}
              title={animal.type}
              description={`${animal.condition} - ${animal.description}`}
            >
              <FontAwesomeIcon icon={getAnimalIcon(animal.type)} size={30} color="orange" />
            </Marker>
          ))}
        </MapView>
      ) : (
        <Text>Konum alınıyor...</Text>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.buttonText}>📂 Galeriden Seç</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
          <Text style={styles.buttonText}>📸 Kamera ile Çek</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hayvan Bilgilerini Girin</Text>

            <TextInput style={styles.input} placeholder="Hayvanın Durumu" value={condition} onChangeText={setCondition} />
            <TextInput style={styles.input} placeholder="Açıklama" value={description} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Tür (Kedi, Köpek vb.)" value={type} onChangeText={setType} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={uploadToFirebase}>
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '60%' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  uploadButton: { backgroundColor: '#FF5733', padding: 10, borderRadius: 5, alignItems: 'center', width: '45%' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: { width: '100%', borderBottomWidth: 1, borderColor: '#ccc', marginVertical: 10, padding: 8 },
  modalButtons: { flexDirection: 'row', marginTop: 15 },
  saveButton: { backgroundColor: '#28A745', padding: 10, borderRadius: 5, marginRight: 10 },
  cancelButton: { backgroundColor: '#DC3545', padding: 10, borderRadius: 5 },
});

export default StreetAnimalsMap;
