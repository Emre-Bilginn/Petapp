import React, { useEffect, useState } from 'react';
import { View, Button, Image, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const DiseasePredictor = () => {
  const [image, setImage] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);

  // Sayfa yüklendiğinde kullanıcıyı bilgilendirme
  useEffect(() => {
    Alert.alert(
      'Bilgilendirme',
      'Bu uygulama yalnızca kısa süreli fikir vermeyi amaçlar. Kesin tanı için veteriner hekime danışmanız gerekmektedir.',
      [{ text: 'Anladım' }]
    );
  }, []);

  const explanationMap = {
    Dermatitis: 'Evcil hayvanınızda cilt iltihabı (dermatit) tespit edildi. Kaşıntı, kızarıklık ve pullanma olabilir.',
    Fungal_infections: 'Mantar enfeksiyonu belirtileri tespit edildi. Veteriner kontrolü gerekebilir.',
    Healthy: 'Evcil hayvanınız sağlıklı görünüyor. Düzenli kontroller önerilir.',
    Hypersensitivity: 'Alerjik bir durum olabilir. Polen, gıda ya da dış etkenlere duyarlılık söz konusu olabilir.',
    demodicosis: 'Demodikozis (uyuz) tespit edildi. Deri altında yaşayan akarların neden olduğu ciddi bir durumdur.',
    ringworm: 'Halkalı mantar enfeksiyonu (ringworm) tespit edildi. Bulaşıcı olabilir, dikkatli olunmalıdır.',
  };

  const normalizePrediction = (raw) => raw?.trim();

  const pickImageFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Galeri erişimi reddedildi.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setPrediction('');
    }
  };

  const pickImageFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Kamera izni reddedildi.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setPrediction('');
    }
  };

  const predictDisease = async () => {
    if (!image) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('image', {
      uri: image,
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    try {
      const response = await fetch('https://petapp-api-m52k.onrender.com/predict', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      setPrediction(data.class);
    } catch (error) {
      alert('Tahmin yapılırken hata oluştu.');
    }

    setLoading(false);
  };

  const normalized = normalizePrediction(prediction);
  const explanation = explanationMap[normalized] || 'Bu tahmin için açıklama bulunamadı.';

  return (
    <View style={styles.container}>
      <Button title="Galeriden Fotoğraf Seç" onPress={pickImageFromGallery} />
      <View style={{ height: 10 }} />
      <Button title="Kameradan Fotoğraf Çek" onPress={pickImageFromCamera} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      {image && <Button title="Hastalık Tahmini Yap" onPress={predictDisease} />}
      {loading && <ActivityIndicator size="large" color="blue" />}
      {prediction ? (
        <>
          <Text style={styles.result}>Tahmin: {prediction}</Text>
          <Text style={styles.explanation}>{explanation}</Text>
        </>
      ) : null}
    </View>
  );
};

export default DiseasePredictor;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 250,
    height: 250,
    marginTop: 20,
    marginBottom: 10,
  },
  result: {
    fontSize: 18,
    marginTop: 10,
    fontWeight: 'bold',
  },
  explanation: {
    fontSize: 16,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 12,
    color: '#555',
  },
});
