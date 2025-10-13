import { SafeAreaView } from 'react-native-safe-area-context';
﻿import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import * as Location from 'expo-location';
import { collection, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

const fetchNearbyVeterinarians = async (latitude, longitude) => {
  if (!GOOGLE_API_KEY) {
    throw new Error('missing_api_key');
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=veterinary_care&key=${GOOGLE_API_KEY}`;
  const response = await axios.get(url);

  return (response.data?.results ?? [])
    .filter((vet) => vet?.geometry?.location)
    .map((vet) => ({
      id: vet.place_id ?? `${vet.name}-${vet.vicinity}`,
      name: vet.name ?? 'İsimsiz Klinik',
      address: vet.vicinity ?? 'Adres bilgisi paylaşılmamış',
      latitude: vet.geometry.location.lat,
      longitude: vet.geometry.location.lng,
      rating: typeof vet.rating === 'number' ? vet.rating : null,
      userRatingsTotal: vet.user_ratings_total ?? 0,
      openNow: vet.opening_hours?.open_now,
    }));
};

const toRadians = (value) => (value * Math.PI) / 180;

const getDistanceMeters = (origin, destination) => {
  const earthRadius = 6371000;
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const formatDistance = (meters) => {
  if (meters == null) {
    return 'Mesafe bilinmiyor';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

const VeterinarianList = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const selectionMode = route.params?.selectionMode ?? null;
  const returnTo = route.params?.returnTo ?? 'Asi';
  const formState = route.params?.formState ?? null;
  const isSelectionMode = Boolean(selectionMode);

  const [location, setLocation] = useState(null);
  const [veterinarians, setVeterinarians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const requestLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setError('Konum izni verilmedi. Yakındaki klinikleri gösterebilmemiz için izin vermelisin.');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(currentLocation);
    } catch (err) {
      console.error('Konum hatası:', err);
      setError('Konum alınırken bir sorun oluştu. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const loadVeterinarians = useCallback(
    async ({ showLoader = true } = {}) => {
      if (!location?.coords) {
        return;
      }

      if (showLoader) {
        setLoading(true);
      }
      setError('');

      try {
        const googleVets = await fetchNearbyVeterinarians(location.coords.latitude, location.coords.longitude);

        let firestoreVets = [];
        try {
          const snapshot = await getDocs(collection(db, 'Vets'));
          firestoreVets = snapshot.docs.map((doc) => doc.data());
        } catch (firestoreError) {
          console.warn('Vets koleksiyonu okunamadı:', firestoreError);
        }
        const firestoreIndex = new Map(
          firestoreVets
            .filter((item) => item?.vetName)
            .map((item) => [item.vetName.toLowerCase(), item])
        );

        const enriched = googleVets.map((vet) => {
          const key = vet.name?.toLowerCase?.();
          const firestoreMatch = key ? firestoreIndex.get(key) : null;
          return {
            ...vet,
            uid: firestoreMatch?.uid ?? 'noaccount',
            distanceMeters: getDistanceMeters(location.coords, {
              latitude: vet.latitude,
              longitude: vet.longitude,
            }),
          };
        });

        setVeterinarians(enriched);
        if (!enriched.length) {
          setError('Yakın çevrede veteriner kliniği bulunamadı.');
        }
      } catch (err) {
        if (err?.message === 'missing_api_key') {
          setError('Google Haritalar API anahtarı bulunamadı. Sistem yöneticinle iletişime geç.');
        } else {
          console.error('Veteriner listesi hatası:', err);
          setError('Veriler alınırken bir sorun oluştu. İnternet bağlantını kontrol et.');
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [location?.coords]
  );

  useEffect(() => {
    if (location?.coords) {
      loadVeterinarians({ showLoader: true });
    }
  }, [location?.coords, loadVeterinarians]);

  const handleRefresh = useCallback(() => {
    if (!location?.coords) {
      Alert.alert('Konum Bekleniyor', 'Listeleri yenilemek için önce konum verisi alınmalı.');
      return;
    }
    setRefreshing(true);
    loadVeterinarians({ showLoader: false });
  }, [loadVeterinarians, location?.coords]);

  const handleBookAppointment = useCallback(
    (vet) => {
      navigation.navigate('VetAppointment', {
        vet: { name: vet.name, uid: vet.uid },
      });
    },
    [navigation]
  );

  const handleOpenMap = useCallback(
    (vet) => {
      navigation.navigate('Map', {
        focusVet: {
          id: vet.id,
          uid: vet.uid,
          name: vet.name,
          latitude: vet.latitude,
          longitude: vet.longitude,
          address: vet.address,
        },
      });
    },
    [navigation]
  );

  const handleSelectClinic = useCallback(
    (vet) => {
      const targetParams = {
        selectedClinic: {
          id: vet.id,
          uid: vet.uid,
          name: vet.name,
          address: vet.address,
          latitude: vet.latitude,
          longitude: vet.longitude,
          distanceMeters: vet.distanceMeters,
          openNow: vet.openNow,
        },
        formState,
      };

      navigation.navigate({
        name: returnTo,
        params: targetParams,
        merge: true,
      });
    },
    [formState, navigation, returnTo]
  );

  const subtitle = useMemo(() => {
    if (loading && !refreshing) {
      return 'Yakındaki klinikleri listeliyoruz...';
    }
    if (error) {
      return error;
    }
    if (!veterinarians.length) {
      return isSelectionMode
        ? 'Seçim yapabileceğin klinik bulunamadı. Haritayı kullanarak farklı bölgeleri inceleyebilirsin.'
        : 'Yakın çevrede sonuç bulunamadı. Haritayı kullanarak farklı bölgeleri inceleyebilirsin.';
    }
    if (isSelectionMode) {
      return `${veterinarians.length} klinik listelendi. Randevu için birini seç.`;
    }
    return `${veterinarians.length} klinik bulundu. Randevu almak istediğin kliniği seç.`;
  }, [error, loading, refreshing, veterinarians.length, isSelectionMode]);

  const listEmptyComponent = !loading && !error ? (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Henüz sonuç yok</Text>
      <Text style={styles.emptySubtitle}>
        Konumunu doğruladıktan sonra "Yenile" tuşuna basarak aramayı tekrar deneyebilirsin.
      </Text>
    </View>
  ) : null;

  const renderVet = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        {item.rating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.ratingSuffix}>/5</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.address}>{item.address}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatDistance(item.distanceMeters)}</Text>
        <Text style={styles.metaSeparator}> - </Text>
        <Text
          style={[
            styles.metaText,
            item.openNow === true && styles.metaOpen,
            item.openNow === false && styles.metaClosed,
          ]}
        >
          {item.openNow === true ? 'Şu an açık' : item.openNow === false ? 'Şu an kapalı' : 'Açık/kapalı bilgisi yok'}
        </Text>
      </View>
      {item.userRatingsTotal ? (
        <Text style={styles.metaSubText}>{item.userRatingsTotal} kullanıcı yorumu</Text>
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionSecondary} onPress={() => handleOpenMap(item)}>
          <Text style={styles.actionSecondaryText}>Haritada Gör</Text>
        </TouchableOpacity>
        {isSelectionMode ? (
          <TouchableOpacity style={styles.actionPrimary} onPress={() => handleSelectClinic(item)}>
            <Text style={styles.actionPrimaryText}>Bu Kliniği Seç</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionPrimary}
            onPress={() => handleBookAppointment(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.actionPrimaryText}>Randevu Al</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>{isSelectionMode ? 'Klinik Seç' : 'Veteriner Randevu Al'}</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing || loading}>
              <Text style={[styles.refreshText, (refreshing || loading) && styles.refreshTextDisabled]}>
                {refreshing || loading ? 'Yenileniyor...' : 'Yenile'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroSubtitle}>{subtitle}</Text>
        </View>

        {loading && !veterinarians.length ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0eb37d" />
          </View>
        ) : null}

        <FlatList
          data={veterinarians}
          keyExtractor={(item) => item.id}
          renderItem={renderVet}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0eb37d" />}
          ListEmptyComponent={listEmptyComponent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  container: {
    flex: 1,
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#041523',
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(6, 24, 40, 0.7)',
  },
  refreshButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0eb37d',
  },
  refreshTextDisabled: {
    opacity: 0.5,
  },
  loaderContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#041523',
    marginRight: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 106, 162, 0.12)',
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b6aa2',
  },
  ratingSuffix: {
    marginLeft: 4,
    fontSize: 11,
    color: 'rgba(11, 106, 162, 0.7)',
  },
  address: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(6, 24, 40, 0.75)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  metaSeparator: {
    marginHorizontal: 8,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.4)',
  },
  metaOpen: {
    color: '#0eb37d',
    fontWeight: '600',
  },
  metaClosed: {
    color: '#e53935',
    fontWeight: '600',
  },
  metaSubText: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.55)',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  actionSecondary: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(6, 24, 40, 0.7)',
  },
  actionPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#0eb37d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionPrimaryDisabled: {
    backgroundColor: 'rgba(6, 24, 40, 0.12)',
  },
  actionPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyState: {
    marginTop: 32,
    padding: 22,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 179, 125, 0.08)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(6, 24, 40, 0.65)',
  },
});

export default VeterinarianList;

