import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig'; // Firebase yapılandırmanıza göre ayarlayın

const AddLostPetScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
  
    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!name || !description || !contact || !image) {
      alert('Lütfen tüm alanları doldurun!');
      return;
    }
    
    try {
      const user = auth.currentUser; // Firebase 9+ ile auth.currentUser kullanıyoruz
      const userId = user ? user.uid : null;  // Kullanıcının UID'sini alıyoruz
  
      await addDoc(collection(db, 'lost_pets'), {
        name,
        description,
        contact,
        image,
        createdAt: new Date(),
        ownerId: userId,  // İlan sahibinin ID'sini kaydediyoruz
      });
  
      alert('İlan başarıyla eklendi!');
      navigation.goBack();
    } catch (error) {
      alert('Bir hata oluştu: ' + error.message);
    }
  };
  

  return (
    <View style={{ padding: 40 }}>
      <Text>Hayvan Adı:</Text>
      <TextInput value={name} onChangeText={setName} style={{ borderWidth: 1, marginBottom: 10 }} />
      
      <Text>Açıklama:</Text>
      <TextInput value={description} onChangeText={setDescription} style={{ borderWidth: 1, marginBottom: 10 }} />
      
      <Text>İletişim:</Text>
      <TextInput value={contact} onChangeText={setContact} style={{ borderWidth: 1, marginBottom: 10 }} />
      
      <TouchableOpacity onPress={pickImage} style={{ marginVertical: 10 }}>
        <Text>Fotoğraf Seç</Text>
      </TouchableOpacity>
      {image && <Image source={{ uri: image }} style={{ width: 100, height: 100 }} />}
      
      <Button title='İlanı Ekle' onPress={handleSubmit} />
    </View>
  );
};

export default AddLostPetScreen;
