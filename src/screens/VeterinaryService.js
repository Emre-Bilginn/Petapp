import { EXPO_PUBLIC_GOOGLE_API_KEY } from '@env'; // <-- .env'den oku
import axios from 'axios';

const fetchNearbyVeterinarians = async (latitude, longitude) => {
  const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  try {
    const response = await axios.get(url, {
      params: {
        location: `${latitude},${longitude}`,
        radius: 5000,
        type: 'veterinary_care',
        key: EXPO_PUBLIC_GOOGLE_API_KEY,
      },
    });
    return response.data.results;
  } catch (error) {
    if (error.response) {
      console.log('Hata Yanıtı:', error.response.data);
      console.log('Durum Kodu:', error.response.status);
    } else if (error.request) {
      console.log('İstek Gönderildi Ama Yanıt Alınamadı:', error.request);
    } else {
      console.log('Hata:', error.message);
    }
    return [];
  }
};

export default fetchNearbyVeterinarians;
