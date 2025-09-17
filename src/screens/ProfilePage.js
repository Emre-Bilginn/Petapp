import React, { useState, useEffect } from 'react';
import { View, Text, Button, Image, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, addDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();
  const storage = getStorage();
  const navigation = useNavigation();
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState(user?.photoURL || null);
  const [pets, setPets] = useState([]);
  const [newPet, setNewPet] = useState({ name: '', age: '' });
  const [selectedType, setSelectedType] = useState('');
  const [isAddingPet, setIsAddingPet] = useState(false);

  // Kullanıcı verisini Firestore'dan çekme
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userDoc = doc(db, 'Users', user.uid);
      const userSnap = await getDoc(userDoc);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setName(userData.name || user.displayName);
        setEmail(userData.email || user.email);
      }
    };

    const fetchPets = async () => {
      if (!user) return;
      const q = query(collection(db, 'Pets'), where('ownerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const petsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPets(petsList);
    };

    fetchUserData();
    fetchPets();
  }, [user, db]);

  // Profil resmini değiştirme ve Firebase'e yükleme
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 4],
      quality: 1,
    });
  
    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setProfileImage(selectedImage.uri);
  
      try {
        // Resmi Firebase Storage'a yükleme
        const imageRef = ref(storage, `profileImages/${user.uid}`);
        const response = await fetch(selectedImage.uri);
        const blob = await response.blob();
        await uploadBytes(imageRef, blob);
  
        // Resmin URL'sini almak
        const downloadURL = await getDownloadURL(imageRef);
  
        // Firestore'da profil fotoğrafını güncelleme
        const userDoc = doc(db, 'Users', user.uid);
        await updateDoc(userDoc, {
          photoURL: downloadURL,
        });
  
        // Firebase Authentication profilini güncelleme
        await user.updateProfile({
          photoURL: downloadURL,
        });
  
        Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi!');
      } catch (error) {
        Alert.alert('Hata', 'Profil fotoğrafı yüklenirken hata oluştu.');
        console.error(error);
      }
    }
  };
  

  // Evcil hayvan ekleme
  const handleAddPet = async () => {
    if (!newPet.name || !selectedType || !newPet.age) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      await addDoc(collection(db, 'Pets'), {
        name: newPet.name,
        type: selectedType,
        age: newPet.age,
        ownerId: user.uid,
      });

      Alert.alert('Başarılı', 'Evcil hayvan başarıyla eklendi!');
      setPets([...pets, { id: Date.now().toString(), ...newPet, type: selectedType }]);
      setNewPet({ name: '', age: '' });
      setSelectedType('');
      setIsAddingPet(false);
    } catch (error) {
      Alert.alert('Hata', 'Evcil hayvan eklenirken hata oluştu.');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profil Resmi */}
      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
        <Image
          source={profileImage ? { uri: profileImage } : require('../../assets/images/default-avatar.png')}
          style={styles.profileImage}
        />
      </TouchableOpacity>

      {/* Kullanıcı Bilgileri */}
      <Text style={styles.nameText}>{name || 'Kullanıcı Adı bulunamadı'}</Text>
      <Text style={styles.emailText}>{email || 'E-posta bulunamadı'}</Text>

      {/* Evcil Hayvanlar */}
      <Text style={styles.sectionTitle}>Evcil Hayvanlarım</Text>

      {pets.length > 0 ? (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.petItem}>
              <Text style={styles.petText}>{item.name} - {item.type} - {item.age} yaşında</Text>
            </View>
          )}
          scrollEnabled={false}
        />
      ) : (
        <Text style={styles.noPetsText}>Henüz evcil hayvan eklemediniz.</Text>
      )}

      {/* Evcil Hayvan Ekleme Formu */}
      {isAddingPet ? (
        <View style={styles.petForm}>
          <TextInput
            placeholder="Evcil Hayvan Adı"
            value={newPet.name}
            onChangeText={(text) => setNewPet({ ...newPet, name: text })}
            style={styles.inputField}
          />

          <Picker
            selectedValue={selectedType}
            onValueChange={(itemValue) => setSelectedType(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Hayvan Türü Seçiniz" value="" />
            <Picker.Item label="Köpek" value="Köpek" />
            <Picker.Item label="Kedi" value="Kedi" />
            <Picker.Item label="Kuş" value="Kuş" />
            <Picker.Item label="Balık" value="Balık" />
          </Picker>

          <TextInput
            placeholder="Yaş"
            value={newPet.age}
            onChangeText={(text) => setNewPet({ ...newPet, age: text })}
            keyboardType="numeric"
            style={styles.inputField}
          />

          <Button title="Kaydet" onPress={handleAddPet} color="#4CAF50" />
        </View>
      ) : (
        <Button title="Evcil Hayvan Ekle" onPress={() => setIsAddingPet(true)} color="#4CAF50" />
      )}

      <View style={styles.buttonContainer}>
        <Button title="Şifre Değiştir" onPress={() => navigation.navigate('PasswordResetScreen')} color="#2196F3" />
      </View>
      <View style={styles.buttonContainer2}>
        <Button title="Hesabı Sil" color="red" onPress={() => navigation.navigate('AccountSettingsScreen')} />
      </View>
      
    </ScrollView>
  );
};

// Stiller
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  noPetsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emailText: {
    textAlign: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 10,
    color: '#333',
  },
  petForm: {
    marginTop: 10,
  },
  inputField: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    padding: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  picker: {
    height: 50,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 10,
  },
  buttonContainer2: {
    marginBottom: 40,
  }
});

export default ProfileScreen;
