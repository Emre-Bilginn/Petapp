import { SafeAreaView } from 'react-native-safe-area-context';
﻿import axios from 'axios';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useRoute } from '@react-navigation/native';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

const fetchNearbyVeterinarians = async (latitude, longitude) => {
  if (!GOOGLE_API_KEY) {
    throw new Error('missing_api_key');
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=veterinary_care&key=${GOOGLE_API_KEY}`;
  const response = await axios.get(url);
  const results = response.data?.results ?? [];

  return results
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

const fetchRoutePolyline = async (origin, destination) => {
  if (!GOOGLE_API_KEY) {
    throw new Error('missing_api_key');
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_API_KEY}`;
  const response = await axios.get(url);
  const route = response.data?.routes?.[0];
  return route?.overview_polyline?.points ?? null;
};

const decodePolyline = (encoded) => {
  if (!encoded) {
    return [];
  }

  let points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
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

const getDistanceMeters = (origin, destination) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLon = toRad(destination.longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(destination.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

const formatDistance = (meters) => {
  if (meters == null) {
    return 'Mesafe hesaplanamadı';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

const MapScreen = () => {
  const navigationRoute = useRoute();
  const mapRef = useRef(null);
  const pendingFocusRef = useRef(navigationRoute?.params?.focusVet ?? null);

  const [location, setLocation] = useState(null);
  const [veterinarians, setVeterinarians] = useState([]);
  const [selectedVetId, setSelectedVetId] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    if (navigationRoute?.params?.focusVet) {
      pendingFocusRef.current = navigationRoute.params.focusVet;
    }
  }, [navigationRoute?.params?.focusVet]);

  const requestLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setError('Konum izni vermeden yakındaki veterinerleri gösteremiyoruz. Ayarlardan izin verebilirsin.');
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(currentLocation);
    } catch (err) {
      console.error('Konum hatası:', err);
      setError('Konum alınırken bir sorun oluştu. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    let subscription;

    const subscribeToLocation = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 150,
        },
        (pos) => {
          setLocation(pos);
        }
      );
    };

    subscribeToLocation();

    return () => {
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  const loadVeterinarians = useCallback(
    async (coords, { showLoader = true } = {}) => {
      if (!coords) {
        return;
      }

      if (showLoader) {
        setLoading(true);
      }

      setError('');

      try {
        const vets = await fetchNearbyVeterinarians(coords.latitude, coords.longitude);
        const enriched = vets.map((vet) => ({
          ...vet,
          distanceMeters: getDistanceMeters(coords, { latitude: vet.latitude, longitude: vet.longitude }),
        }));
        setVeterinarians(enriched);

        if (!enriched.length) {
          setError('Yakın çevrede veteriner kliniği bulunamadı. Haritayı hareket ettirip tekrar deneyebilirsin.');
        }
      } catch (err) {
        if (err?.message === 'missing_api_key') {
          setError('Google Haritalar API anahtarı bulunamadı. Sistem yöneticinle iletişime geç.');
        } else {
          console.error('Veteriner listesi hatası:', err);
          setError('Veterinerler alınırken bir sorun oluştu. İnternet bağlantını kontrol et.');
        }
      } finally {
        if (showLoader) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!location?.coords || hasFetchedOnce.current) {
      return;
    }

    hasFetchedOnce.current = true;
    loadVeterinarians(location.coords);
  }, [location?.coords, loadVeterinarians]);

  const handleRefresh = useCallback(() => {
    if (!location?.coords) {
      return;
    }
    setRefreshing(true);
    loadVeterinarians(location.coords, { showLoader: false });
  }, [loadVeterinarians, location?.coords]);

  const handleSelectVet = useCallback(
    async (vet, { drawRoute = true } = {}) => {
      if (!vet) {
        return;
      }

      setSelectedVetId(vet.id);

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: vet.latitude,
            longitude: vet.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          450
        );
      }

      if (!drawRoute || !location?.coords) {
        return;
      }

      try {
        const origin = `${location.coords.latitude},${location.coords.longitude}`;
        const destination = `${vet.latitude},${vet.longitude}`;
        const encodedPolyline = await fetchRoutePolyline(origin, destination);
        if (!encodedPolyline) {
          Alert.alert('Yol Tarifi Bulunamadı', 'Google servisleri rota döndüremedi. Bir süre sonra tekrar dene.');
          return;
        }

        const decoded = decodePolyline(encodedPolyline);
        setRouteCoordinates(decoded);
        mapRef.current?.fitToCoordinates(decoded, {
          edgePadding: { top: 120, right: 60, bottom: 360, left: 60 },
          animated: true,
        });
      } catch (err) {
        console.error('Yol tarifi hatası:', err);
        Alert.alert('Hata', 'Yol tarifi alınırken bir sorun oluştu.');
      }
    },
    [location?.coords]
  );

  useEffect(() => {
    if (!location?.coords || !pendingFocusRef.current || !veterinarians.length) {
      return;
    }

    const focusVet = pendingFocusRef.current;
    pendingFocusRef.current = null;

    const match = veterinarians.find((vet) => vet.id === focusVet.id);
    const target =
      match ?? {
        ...focusVet,
        id: focusVet.id ?? `external-${focusVet.latitude}-${focusVet.longitude}`,
        latitude: focusVet.latitude,
        longitude: focusVet.longitude,
      };

    handleSelectVet(target);
  }, [handleSelectVet, location?.coords, veterinarians]);

  const handleOpenInMaps = useCallback((vet) => {
    if (!vet) {
      return;
    }

    const label = encodeURIComponent(vet.name);
    const latLng = `${vet.latitude},${vet.longitude}`;
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${latLng}&q=${label}`,
      android: `geo:${latLng}?q=${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });

    if (!url) {
      return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert('Harita açılamadı', 'Cihazında harita uygulaması bulunamadı.');
    });
  }, []);

  const headerSubtitle = useMemo(() => {
    if (loading && !refreshing) {
      return 'Yakındaki veteriner kliniklerini listeliyoruz...';
    }
    if (error) {
      return error;
    }
    if (veterinarians.length === 0) {
      return 'Yakın çevrede klinik görünmüyor. Haritayı kaydırıp yenilemeyi deneyebilirsin.';
    }
    return `${veterinarians.length} klinik bulundu. Birini seçerek yol tarifi alabilirsin.`;
  }, [error, loading, refreshing, veterinarians.length]);

  const renderVetCard = ({ item }) => {
    const isSelected = item.id === selectedVetId;
    return (
      <View style={[styles.vetCard, isSelected && styles.vetCardSelected]}>
        <View style={styles.vetCardHeader}>
          <Text style={styles.vetName}>{item.name}</Text>
          {item.rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.ratingSuffix}>/5</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.vetAddress}>{item.address}</Text>
        <View style={styles.metaRow}>
          {item.distanceMeters != null ? (
            <Text style={styles.metaText}>{formatDistance(item.distanceMeters)} uzaklıkta</Text>
          ) : null}
          <Text style={styles.metaSeparator}>•</Text>
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
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardActionGhost} onPress={() => handleSelectVet(item, { drawRoute: false })}>
            <Text style={styles.cardActionGhostText}>Haritada Göster</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionPrimary} onPress={() => handleSelectVet(item)}>
            <Text style={styles.cardActionPrimaryText}>Rota Oluştur</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionSecondary} onPress={() => handleOpenInMaps(item)}>
            <Text style={styles.cardActionSecondaryText}>Google Harita</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>Veteriner Bul</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing || loading}>
              <Text style={[styles.refreshText, (refreshing || loading) && styles.refreshTextDisabled]}>
                {refreshing || loading ? 'Yenileniyor...' : 'Yenile'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroSubtitle}>{headerSubtitle}</Text>
        </View>

        <View style={styles.mapWrapper}>
          {loading && !location ? (
            <View style={styles.mapLoader}>
              <ActivityIndicator size="large" color="#0eb37d" />
              <Text style={styles.mapLoaderText}>Harita yükleniyor...</Text>
            </View>
          ) : null}

          {location ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              showsUserLocation
              initialRegion={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {veterinarians.map((vet) => (
                <Marker
                  key={vet.id}
                  coordinate={{ latitude: vet.latitude, longitude: vet.longitude }}
                  title={vet.name}
                  description={vet.address}
                  pinColor={vet.id === selectedVetId ? '#0eb37d' : '#e53935'}
                  onPress={() => handleSelectVet(vet, { drawRoute: false })}
                />
              ))}

              {routeCoordinates ? (
                <Polyline coordinates={routeCoordinates} strokeColor="#0eb37d" strokeWidth={4} />
              ) : null}
            </MapView>
          ) : !loading ? (
            <View style={styles.locationError}>
              <Text style={styles.locationErrorText}>Konum alınamadı. İzinleri kontrol edip tekrar dene.</Text>
            </View>
          ) : null}
        </View>

        <FlatList
          data={veterinarians}
          keyExtractor={(item) => item.id}
          renderItem={renderVetCard}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0eb37d" />}
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Henüz sonuç yok</Text>
                <Text style={styles.emptySubtitle}>
                  Haritayı farklı bir bölgeye kaydırıp "Yenile" tuşuna basarak arama yarıçapını genişletebilirsin.
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default MapScreen;

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
  mapWrapper: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#e7f1f9',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoader: {
    position: 'absolute',
    zIndex: 2,
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  mapLoaderText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  locationError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  locationErrorText: {
    fontSize: 15,
    color: 'rgba(229, 57, 53, 0.9)',
    textAlign: 'center',
  },
  list: {
    flexGrow: 0,
    maxHeight: 360,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 14,
  },
  vetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  vetCardSelected: {
    borderWidth: 2,
    borderColor: 'rgba(14, 179, 125, 0.45)',
  },
  vetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vetName: {
    flex: 1,
    fontSize: 17,
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
    fontSize: 11,
    marginLeft: 4,
    color: 'rgba(11, 106, 162, 0.7)',
  },
  vetAddress: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.75)',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  metaSubText: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.55)',
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
  cardActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  cardActionGhost: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  cardActionGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(6, 24, 40, 0.7)',
  },
  cardActionPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#0eb37d',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  cardActionPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardActionSecondary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(11, 106, 162, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  cardActionSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  emptyState: {
    marginTop: 24,
    padding: 22,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 179, 125, 0.08)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(6, 24, 40, 0.65)',
  },
});
