import { SafeAreaView } from 'react-native-safe-area-context';
﻿import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { db } from '../../firebaseConfig';
import { CustomButton, CustomTextInput } from '../components/Index';

const screenWidth = Dimensions.get('window').width;

const GRAPH_FILTERS = [
  { id: 'both', label: 'Kilo + Boy' },
  { id: 'weight', label: 'Kilo' },
  { id: 'height', label: 'Boy' },
];

const PetGrowthTracker = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [pets, setPets] = useState([]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [isFetchingPets, setIsFetchingPets] = useState(false);
  const [isFetchingMeasurements, setIsFetchingMeasurements] = useState(false);
  const [petError, setPetError] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [graphFilter, setGraphFilter] = useState('both');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const loadPets = async () => {
      try {
        setIsFetchingPets(true);
        const petsQuery = query(
          collection(db, 'Pets'),
          where('ownerId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(petsQuery);
        const petItems = snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
        petItems.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() ?? new Date(a.createdAt ?? 0);
          const bDate = b.createdAt?.toDate?.() ?? new Date(b.createdAt ?? 0);
          return aDate - bDate;
        });
        setPets(petItems);
        setPetError('');
        if (petItems.length && !selectedPetId) {
          setSelectedPetId(petItems[0].id);
        }
      } catch (error) {
        console.error('Evcil hayvanlar yüklenemedi:', error);
        Alert.alert('Hata', 'Evcil hayvan bilgileri alınamadı. Lütfen tekrar dene.');
      } finally {
        setIsFetchingPets(false);
      }
    };

    loadPets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!selectedPetId) {
      setMeasurements([]);
      return;
    }

    const loadMeasurements = async () => {
      try {
        setIsFetchingMeasurements(true);
        const measurementsQuery = query(
          collection(db, 'PetGrowthHistory'),
          where('petId', '==', selectedPetId)
        );
        const snapshot = await getDocs(measurementsQuery);
        const entries = snapshot.docs.map((docItem) => {
          const data = docItem.data();
          const recordedAt = data.recordedAt?.toDate?.() ?? new Date(data.recordedAt ?? Date.now());
          return {
            id: docItem.id,
            weight: typeof data.weight === 'number' ? data.weight : null,
            height: typeof data.height === 'number' ? data.height : null,
            note: data.note ?? '',
            recordedAt,
          };
        });
        entries.sort((a, b) => a.recordedAt - b.recordedAt);
        setMeasurements(entries);
      } catch (error) {
        console.error('Ölçümler alınamadı:', error);
        Alert.alert('Hata', 'Ölçüm geçmişi alınamadı. Daha sonra tekrar dene.');
      } finally {
        setIsFetchingMeasurements(false);
      }
    };

    loadMeasurements();
  }, [selectedPetId]);

  const selectedPet = useMemo(() => pets.find((pet) => pet.id === selectedPetId) ?? null, [pets, selectedPetId]);

  const parsedWeight = useMemo(() => {
    const normalized = weightInput.replace(',', '.');
    const floatValue = parseFloat(normalized);
    return Number.isFinite(floatValue) ? Math.round(floatValue * 10) / 10 : null;
  }, [weightInput]);

  const parsedHeight = useMemo(() => {
    const normalized = heightInput.replace(',', '.');
    const floatValue = parseFloat(normalized);
    return Number.isFinite(floatValue) ? Math.round(floatValue * 10) / 10 : null;
  }, [heightInput]);

  const handleSelectPet = (petId) => {
    setSelectedPetId(petId);
    setFormError('');
    setWeightInput('');
    setHeightInput('');
    setNoteInput('');
  };

  const handleAddMeasurement = async () => {
    if (!selectedPet) {
      setFormError('Önce bir evcil hayvan seçmelisin.');
      return;
    }

    if (parsedWeight === null && parsedHeight === null) {
      setFormError('Kilo veya boy bilgisinden en az birini gir.');
      return;
    }

    if (!currentUser) {
      Alert.alert('Hata', 'Veri ekleyebilmek için giriş yapmalısın.');
      return;
    }

    try {
      setFormError('');
      const recordedAt = new Date();
      const payload = {
        petId: selectedPet.id,
        ownerId: currentUser.uid,
        weight: parsedWeight,
        height: parsedHeight,
        note: noteInput.trim() ? noteInput.trim() : null,
        recordedAt: Timestamp.fromDate(recordedAt),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'PetGrowthHistory'), payload);
      const newMeasurement = {
        id: docRef.id,
        weight: payload.weight,
        height: payload.height,
        note: payload.note ?? '',
        recordedAt,
      };

      setMeasurements((prev) => [...prev, newMeasurement]);
      setWeightInput('');
      setHeightInput('');
      setNoteInput('');
    } catch (error) {
      console.error('Ölçüm kaydedilemedi:', error);
      Alert.alert('Hata', 'Ölçüm kaydedilirken bir sorun oluştu. Lütfen tekrar dene.');
    }
  };

  const chartData = useMemo(() => {
    if (!measurements.length) {
      return null;
    }

    const trimmed = measurements.slice(-8);
    const labels = trimmed.map((item) => item.recordedAt.toLocaleDateString('tr-TR', {
      month: 'short',
      day: 'numeric',
    }));

    const datasets = [];

    if (graphFilter === 'both' || graphFilter === 'weight') {
      datasets.push({
        data: trimmed.map((item) => (typeof item.weight === 'number' ? item.weight : null)),
        color: () => '#0b6aa2',
        strokeWidth: 3,
        withDots: true,
      });
    }

    if (graphFilter === 'both' || graphFilter === 'height') {
      datasets.push({
        data: trimmed.map((item) => (typeof item.height === 'number' ? item.height : null)),
        color: () => '#0eb37d',
        strokeWidth: 3,
        withDots: true,
      });
    }

    return datasets.length
      ? {
          labels,
          datasets,
        }
      : null;
  }, [measurements, graphFilter]);

  const latestMeasurement = useMemo(() => {
    if (!measurements.length) {
      return null;
    }
    return measurements[measurements.length - 1];
  }, [measurements]);

  const renderPetChip = (pet) => {
    const isActive = pet.id === selectedPetId;
    return (
      <TouchableOpacity
        key={pet.id}
        style={[styles.petChip, isActive && styles.petChipActive]}
        onPress={() => handleSelectPet(pet.id)}
        activeOpacity={0.85}
      >
        <Text style={[styles.petChipText, isActive && styles.petChipTextActive]}>{pet.name}</Text>
        {pet.type ? <Text style={styles.petChipMeta}>{pet.type}</Text> : null}
      </TouchableOpacity>
    );
  };

  const renderMeasurementRow = (measurement) => {
    return (
      <View key={measurement.id ?? measurement.recordedAt.toISOString()} style={styles.measurementRow}>
        <View style={styles.measurementLeft}>
          <Text style={styles.measurementDate}>
            {measurement.recordedAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.measurementTime}>
            {measurement.recordedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.measurementRight}>
          {typeof measurement.weight === 'number' ? (
            <Text style={styles.measurementValue}>{measurement.weight} kg</Text>
          ) : null}
          {typeof measurement.height === 'number' ? (
            <Text style={styles.measurementValueSecondary}>{measurement.height} cm</Text>
          ) : null}
          {measurement.note ? <Text style={styles.measurementNote}>{measurement.note}</Text> : null}
        </View>
      </View>
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.safeAreaCentered}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
        <Text style={styles.centeredTitle}>Giriş yapmalısın</Text>
        <Text style={styles.centeredSubtitle}>Büyüme takibini kullanmak için hesap bilgilerinle giriş yap.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Gelişim Takibi</Text>
          <Text style={styles.heroSubtitle}>
            Kilo ve boy ölçümlerini düzenli girerek dostunun gelişimini izleyebilir, çizelge üzerinden ilerlemeyi takip edebilirsin.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Evcil Hayvanın</Text>
          {isFetchingPets ? (
            <ActivityIndicator size="small" color="#0eb37d" style={styles.loader} />
          ) : null}
          {pets.length ? (
            <View style={styles.petChipRow}>{pets.map(renderPetChip)}</View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Henüz kayıtlı evcil hayvan bulunamadı</Text>
              <Text style={styles.emptySubtitle}>Profil ekranından yeni dostunu ekleyip gelişimini izleyebilirsin.</Text>
              <CustomButton
                buttonText="Profilde Hayvan Ekle"
                setWidth="100%"
                handleOnPress={() => navigation.navigate('Profile')}
                buttonColor="#0b6aa2"
                pressedButtonColor="#084d73"
              />
            </View>
          )}
        </View>

        {selectedPet ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ölçüm Ekle ({selectedPet.name})</Text>
              <View style={styles.inputRow}>
                <CustomTextInput
                  title="Kilo (kg)"
                  isSecureText={false}
                  keyboardType="decimal-pad"
                  handleOnChangeText={setWeightInput}
                  handleValue={weightInput}
                  handlePlaceHolder="Örn. 4.2"
                  containerStyle={styles.measureInput}
                />
                <CustomTextInput
                  title="Boy (cm)"
                  isSecureText={false}
                  keyboardType="decimal-pad"
                  handleOnChangeText={setHeightInput}
                  handleValue={heightInput}
                  handlePlaceHolder="Opsiyonel"
                  containerStyle={styles.measureInput}
                />
              </View>
              <CustomTextInput
                title="Not"
                isSecureText={false}
                handleOnChangeText={setNoteInput}
                handleValue={noteInput}
                handlePlaceHolder="Örn. Veteriner kontrolü sonrası"
                helperText="İsteğe bağlı olarak kısa bir not ekleyebilirsin."
                containerStyle={styles.noteInput}
              />
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              <CustomButton
                buttonText="Ölçümü Kaydet"
                setWidth="100%"
                handleOnPress={handleAddMeasurement}
                buttonColor="#0eb37d"
                pressedButtonColor="#0a8c61"
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>İlerleme Grafiği</Text>
                <View style={styles.filterRow}>
                  {GRAPH_FILTERS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.filterChip, graphFilter === item.id && styles.filterChipActive]}
                      onPress={() => setGraphFilter(item.id)}
                    >
                      <Text style={[styles.filterChipText, graphFilter === item.id && styles.filterChipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {isFetchingMeasurements ? (
                <ActivityIndicator size="small" color="#0b6aa2" style={styles.loader} />
              ) : null}
              {chartData ? (
                <LineChart
                  data={chartData}
                  width={screenWidth - 60}
                  height={240}
                  bezier
                  withInnerLines
                  verticalLabelRotation={0}
                  chartConfig={{
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(11, 106, 162, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(6, 24, 40, ${opacity})`,
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#ffffff',
                    },
                  }}
                  style={styles.chart}
                />
              ) : (
                <Text style={styles.noDataText}>Grafik oluşturmak için en az bir ölçüm eklemelisin.</Text>
              )}
              {latestMeasurement ? (
                <View style={styles.latestBox}>
                  <Text style={styles.latestTitle}>Son Ölçüm</Text>
                  <Text style={styles.latestValue}>
                    {latestMeasurement.weight != null ? `${latestMeasurement.weight} kg` : '-'}
                    {latestMeasurement.height != null ? ` • ${latestMeasurement.height} cm` : ''}
                  </Text>
                  <Text style={styles.latestMeta}>
                    {latestMeasurement.recordedAt.toLocaleString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ölçüm Geçmişi</Text>
              {measurements.length ? (
                <View>{measurements
                  .slice()
                  .reverse()
                  .map(renderMeasurementRow)}</View>
              ) : (
                <Text style={styles.noDataText}>Henüz kayıtlı ölçüm bulunmuyor.</Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PetGrowthTracker;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  safeAreaCentered: {
    flex: 1,
    backgroundColor: '#f6f9fc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  centeredTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#041523',
    marginBottom: 8,
  },
  centeredSubtitle: {
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.7)',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroCard: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#041523',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  card: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  loader: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
  },
  petChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  petChip: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.12)',
    backgroundColor: '#ffffff',
  },
  petChipActive: {
    borderColor: 'rgba(14, 179, 125, 0.45)',
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
  },
  petChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#041523',
  },
  petChipTextActive: {
    color: '#0a8c61',
  },
  petChipMeta: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.6)',
  },
  emptyState: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(11, 106, 162, 0.08)',
    padding: 18,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#041523',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  measureInput: {
    flex: 1,
  },
  noteInput: {
    marginTop: 12,
    marginBottom: 16,
  },
  errorText: {
    marginBottom: 12,
    fontSize: 12,
    color: '#e53935',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.12)',
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    borderColor: 'rgba(11, 106, 162, 0.45)',
    backgroundColor: 'rgba(11, 106, 162, 0.12)',
  },
  filterChipText: {
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  filterChipTextActive: {
    color: '#0b6aa2',
    fontWeight: '600',
  },
  chart: {
    marginTop: 18,
    borderRadius: 16,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  latestBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
  },
  latestTitle: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  latestValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: '#0a8c61',
  },
  latestMeta: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 24, 40, 0.08)',
  },
  measurementLeft: {
    maxWidth: '45%',
  },
  measurementRight: {
    alignItems: 'flex-end',
    maxWidth: '55%',
  },
  measurementDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#041523',
  },
  measurementTime: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.6)',
  },
  measurementValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0b6aa2',
  },
  measurementValueSecondary: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.7)',
  },
  measurementNote: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.6)',
    textAlign: 'right',
  },
});
