// ⬇️ DEĞİŞEN TEK SATIR: @env import yerine process.env kullanıyoruz
const EXPO_PUBLIC_GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

import axios from 'axios';
import * as Location from 'expo-location'; // expo-location modülünü import ettik
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';

// API'den veterinerleri alacak fonksiyon
const fetchNearbyVeterinarians = async (latitude, longitude) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=veterinary_care&key=${EXPO_PUBLIC_GOOGLE_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    console.log('API Yanıtı:', response.data.results); // API yanıtını kontrol et

    if (response.data.results && response.data.results.length > 0) {
      // Gelen veriyi formatlayarak işaretçileri ayarlıyoruz
      return response.data.results.map((vet) => ({
        name: vet.name,
        vicinity: vet.vicinity,
        latitude: vet.geometry.location.lat,
        longitude: vet.geometry.location.lng,
      }));
    } else {
      console.log('Veterinerler bulunamadı.');
      return []; // Eğer veri yoksa, boş bir dizi döndür
    }
  } catch (error) {
    if (error.response) {
      console.log("Hata Yanıtı:", error.response.data);
      console.log("Durum Kodu:", error.response.status);
    } else if (error.request) {
      console.log("İstek Gönderildi Ama Yanıt Alınamadı:", error.request);
    } else {
      console.log("Hata:", error.message);
    }
  }
};

// Directions API ile yol tarifi alacak fonksiyon
const fetchDirections = async (origin, destination) => {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${EXPO_PUBLIC_GOOGLE_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    console.log('Yol Tarifi Yanıtı:', response.data);
    if (response.data.routes && response.data.routes.length > 0) {
      return response.data.routes[0].overview_polyline.points; // Polyline verisi
    } else {
      console.log('Yol tarifi bulunamadı.');
      return null;
    }
  } catch (error) {
    console.log("Yol Tarifi Hatası:", error);
    return null;
  }
};

const MapScreen = () => {
  const [location, setLocation] = useState(null); // Kullanıcının mevcut konumu
  const [veterinarians, setVeterinarians] = useState([]); // Veteriner verileri
  const [errorMsg, setErrorMsg] = useState(null);
  const [route, setRoute] = useState(null); // Yol tarifi verisi

  useEffect(() => {
    (async () => {
      // Konum izni isteme
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Konum izni verilmedi');
        return;
      }

      // Konum verisini alma
      let initialLocation = await Location.getCurrentPositionAsync({});
      console.log('Konum:', initialLocation); // Konumu konsola yazdır
      setLocation(initialLocation);

      // Konum izlemeyi başlatma
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // her 1 saniyede bir konum güncellemesi
        },
        (newLocation) => {
          console.log('Yeni Konum:', newLocation); // Yeni konumu konsola yazdır
          setLocation(newLocation); // Her yeni konumda state'i güncelle
        }
      );
    })();
  }, []);

  useEffect(() => {
    const fetchVeterinariansData = async () => {
      if (location) {
        const data = await fetchNearbyVeterinarians(
          location.coords.latitude,
          location.coords.longitude
        );
        console.log('Veterinerler:', data); // Veriyi konsola yazdır
        setVeterinarians(data); // Veteriner verilerini state'e ekliyoruz
      }
    };

    if (location) {
      fetchVeterinariansData();
    }
  }, [location]);

  const handleGetDirections = async (vet) => {
    if (location) {
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const destination = `${vet.latitude},${vet.longitude}`;
      const polyline = await fetchDirections(origin, destination);
      if (polyline) {
        setRoute(polyline);
      }
    }
  };

  let text = 'Yükleniyor...';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = `Konum: \n${location.coords.latitude}, ${location.coords.longitude}`;
  }

  return (
    <View style={styles.container}>
      <Text>{text}</Text>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          region={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {/* Mevcut Konum İçin Circle */}
          <Circle
            center={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            radius={50} // Dairenin yarıçapı (örneğin 50 metre)
            fillColor="rgba(0, 0, 255, 0.2)" // Dairenin rengi
            strokeColor="blue" // Çevre çizgisi rengi
            strokeWidth={2} // Çevre çizgisi kalınlığı
          />

          {/* Veteriner İşaretçileri */}
          {veterinarians.map((vet, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: vet.latitude,
                longitude: vet.longitude,
              }}
              title={vet.name}
              description={vet.vicinity}
              pinColor="red" // Farklı renk ile işaretçi gösterebiliriz
              onPress={() => handleGetDirections(vet)} // Veterinere tıklanınca yol tarifi al
            />
          ))}

          {/* Yol Tarifi Çizme */}
          {route && (
            <Polyline
              coordinates={decodePolyline(route)} // Polyline verisini decode ederek çiziyoruz
              strokeColor="green"
              strokeWidth={4}
            />
          )}
        </MapView>
      )}
    </View>
  );
};

// Polyline verisini çözümleyen fonksiyon
const decodePolyline = (encoded) => {
  let points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let byte;
    let shift = 0;
    let result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '95%', // Yüksekliği %100 yaparak ekranın tamamını kaplamasını sağlıyoruz
  },
});

export default MapScreen;
