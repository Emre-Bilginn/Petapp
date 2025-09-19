// src/screens/VeterinarianList.js
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as Location from 'expo-location';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebaseConfig';

// .env'den oku (Expo'da EXPO_PUBLIC_* değişkenleri process.env ile gelir)
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

const VeterinarianList = () => {
  const [veterinarians, setVeterinarians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Konum izni verilmedi!');
        Alert.alert('İzin Gerekli', 'Yakındaki veterinerleri bulmak için konum izni vermelisiniz.');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      fetchVeterinarians(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  const fetchVeterinarians = async (lat, lon) => {
    try {
      if (!GOOGLE_API_KEY) {
        throw new Error('Google API anahtarı bulunamadı. EXPO_PUBLIC_GOOGLE_API_KEY env değerini kontrol et.');
      }

      // Google Places API'den veterinerleri çek
      const url =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${lat},${lon}&radius=5000&type=veterinary_care&key=${GOOGLE_API_KEY}`;

      const response = await axios.get(url);

      if (response.data?.results?.length > 0) {
        const fetchedVets = response.data.results.map((vet) => ({
          id: vet.place_id,
          name: vet.name || 'Bilinmiyor',
          location: vet.vicinity || 'Adres bilgisi yok',
          rating: vet.rating ?? 'Puan yok',
          openNow:
            vet.opening_hours?.open_now === true
              ? 'Açık'
              : vet.opening_hours?.open_now === false
              ? 'Kapalı'
              : 'Bilinmiyor',
        }));

        // Firestore'daki Vets koleksiyonunu da çek
        const vetsSnapshot = await getDocs(collection(db, 'Vets'));
        const firestoreVets = vetsSnapshot.docs.map((doc) => doc.data());

        // İsim eşleşmesiyle UID iliştir
        const combinedVets = fetchedVets.map((vet) => {
          const matched = firestoreVets.find(
            (fv) => fv?.vetName?.toLowerCase?.() === vet.name.toLowerCase()
          );
          return { ...vet, uid: matched?.uid ?? 'noaccount' };
        });

        setVeterinarians(combinedVets);
      } else {
        setErrorMsg('Yakınlarda veteriner bulunamadı.');
      }
    } catch (error) {
      console.error('Veterinerler yüklenirken hata:', error?.message || error);
      setErrorMsg('Veriler alınırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : (
        <FlatList
          data={veterinarians}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('VetAppointment', {
                  vet: { name: item.name, uid: item.uid },
                })
              }
              style={styles.card}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text>📍 {item.location}</Text>
              <Text>⭐ {item.rating}</Text>
              <Text>🕒 {item.openNow}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: 'red', textAlign: 'center', fontSize: 16, marginTop: 20 },
  card: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  name: { fontSize: 18, fontWeight: 'bold' },
});

export default VeterinarianList;
