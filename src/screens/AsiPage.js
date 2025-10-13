import { SafeAreaView } from 'react-native-safe-area-context';
﻿import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { CustomButton, CustomTextInput } from '../components/Index';

const AVAILABLE_HOURS = [9, 10, 11, 13, 14, 15, 16, 17];

const VaccinationSchedule = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const [petName, setPetName] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  });
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (route.params?.selectedClinic) {
      setSelectedClinic(route.params.selectedClinic);
      navigation.setParams?.({ selectedClinic: undefined });
    }
  }, [route.params?.selectedClinic, navigation]);

  useEffect(() => {
    const formState = route.params?.formState;
    if (formState) {
      if (typeof formState.petName === 'string') {
        setPetName(formState.petName);
      }
      if (typeof formState.vaccineName === 'string') {
        setVaccineName(formState.vaccineName);
      }
      if (formState.selectedDate) {
        const parsed = new Date(formState.selectedDate);
        if (!Number.isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      }
      navigation.setParams?.({ formState: undefined });
    }
  }, [route.params?.formState, navigation]);

  const timeSlots = useMemo(() => {
    return AVAILABLE_HOURS.flatMap((hour) =>
      [0, 20, 40].map((minute) => ({
        hour,
        minute,
        label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      }))
    );
  }, []);

  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString('tr-TR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDate]);

  const formattedTime = useMemo(() => {
    return selectedDate.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [selectedDate]);

  const validate = () => {
    const nextErrors = {};

    if (!petName.trim()) {
      nextErrors.petName = 'Evcil hayvanının adını yazmalısın.';
    }

    if (!vaccineName.trim()) {
      nextErrors.vaccineName = 'Aşı adını yazmalısın.';
    }

    if (!selectedClinic) {
      nextErrors.clinic = 'Randevuyu kaydetmek için klinik seçmelisin.';
    }

    if (!selectedDate) {
      nextErrors.date = 'Tarih ve saat seçmelisin.';
    }

    return nextErrors;
  };

  const handleSaveVaccination = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert('Hata', 'Aşı takvimini kaydetmek için giriş yapmalısın.');
      return;
    }

    try {
      setIsSaving(true);

      await addDoc(collection(db, 'VaccinationSchedules'), {
        userId: user.uid,
        appointmentDate: selectedDate,
        petName: petName.trim(),
        vaccineName: vaccineName.trim(),
        clinicId: selectedClinic?.uid ?? selectedClinic?.id ?? 'noaccount',
        clinicName: selectedClinic?.name ?? null,
        clinicAddress: selectedClinic?.address ?? null,
        clinicLocation: selectedClinic
          ? { latitude: selectedClinic.latitude, longitude: selectedClinic.longitude }
          : null,
        createdAt: new Date(),
      });

      Alert.alert('Başarılı', 'Aşı randevusu kaydedildi. Hatırlatma listene eklendi.');
      setPetName('');
      setVaccineName('');
      const now = new Date();
      now.setMinutes(0, 0, 0);
      setSelectedDate(now);
      setSelectedClinic(null);
      setErrors({});
    } catch (error) {
      console.error('Aşı kaydetme hatası:', error);
      Alert.alert('Hata', 'Aşı bilgileri kaydedilirken bir sorun oluştu. Lütfen tekrar dene.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (event, dateValue) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (!dateValue) {
      return;
    }

    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
      return next;
    });
  };

  const handleSelectSlot = (slot) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setHours(slot.hour, slot.minute, 0, 0);
      return next;
    });
    setShowTimeModal(false);
  };

  const handleSelectClinicPress = () => {
    navigation.navigate('VeterinarianList', {
      selectionMode: 'vaccination',
      returnTo: route.name ?? 'Asi',
      formState: {
        petName,
        vaccineName,
        selectedDate: selectedDate.toISOString(),
      },
    });
  };

  const handleOpenClinicOnMap = () => {
    if (!selectedClinic) {
      return;
    }
    navigation.navigate('Map', {
      focusVet: {
        id: selectedClinic.id,
        uid: selectedClinic.uid,
        name: selectedClinic.name,
        latitude: selectedClinic.latitude,
        longitude: selectedClinic.longitude,
        address: selectedClinic.address,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Aşı Takvimi</Text>
            <Text style={styles.heroSubtitle}>
              Evcil dostunun aşı tarihlerini planla, yaklaşan randevuları kaçırma. Tarih, saat ve kliniği seçip kaydetmen yeterli.
            </Text>
          </View>

          <View style={styles.formCard}>
            <CustomTextInput
              title="Evcil Hayvan Adı"
              isSecureText={false}
              handleOnChangeText={setPetName}
              handleValue={petName}
              handlePlaceHolder="Örn. Pamuk"
              helperText="Birden fazla hayvanın varsa her biri için ayrı kayıt ekleyebilirsin."
              error={errors.petName}
              containerStyle={styles.inputWrapper}
            />

            <CustomTextInput
              title="Aşı Adı"
              isSecureText={false}
              handleOnChangeText={setVaccineName}
              handleValue={vaccineName}
              handlePlaceHolder="Örn. Karma, Kuduz"
              helperText="Veterinerinin önerdiği aşı programını takip et."
              error={errors.vaccineName}
              containerStyle={styles.inputWrapper}
            />

            <Text style={styles.sectionLabel}>Klinik</Text>
            {selectedClinic ? (
              <View style={styles.clinicCard}>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>{selectedClinic.name}</Text>
                  {selectedClinic.address ? (
                    <Text style={styles.clinicAddress}>{selectedClinic.address}</Text>
                  ) : null}
                </View>
                <View style={styles.clinicActions}>
                  <TouchableOpacity style={styles.clinicActionButton} onPress={handleOpenClinicOnMap}>
                    <Text style={styles.clinicActionText}>Haritada Aç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.clinicActionButton, styles.clinicActionWarning]}
                    onPress={() => setSelectedClinic(null)}
                  >
                    <Text style={[styles.clinicActionText, styles.clinicActionWarningText]}>Seçimi Temizle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.clinicSelect} activeOpacity={0.8} onPress={handleSelectClinicPress}>
                <Text style={styles.clinicSelectTitle}>Klinik Seç</Text>
                <Text style={styles.clinicSelectSubtitle}>Yakındaki kliniklerden birini listeden seç.</Text>
              </TouchableOpacity>
            )}
            {errors.clinic ? <Text style={styles.errorText}>{errors.clinic}</Text> : null}

            <Text style={[styles.sectionLabel, styles.sectionSpacing]}>Tarih ve Saat</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateChip} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateChipLabel}>Tarih Seç</Text>
                <Text style={styles.dateChipValue}>{formattedDate}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateChip} onPress={() => setShowTimeModal(true)}>
                <Text style={styles.dateChipLabel}>Saat Seç</Text>
                <Text style={styles.dateChipValue}>{formattedTime}</Text>
              </TouchableOpacity>
            </View>
            {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Randevu Özeti</Text>
              <Text style={styles.summaryText}>{petName || 'Evcil hayvan adı henüz girilmedi.'}</Text>
              <Text style={styles.summaryText}>{vaccineName || 'Aşı adı henüz girilmedi.'}</Text>
              <Text style={styles.summaryText}>{selectedClinic ? selectedClinic.name : 'Klinik seçilmedi.'}</Text>
              <Text style={styles.summaryText}>{`${formattedDate} - ${formattedTime}`}</Text>
            </View>

            <CustomButton
              buttonText={isSaving ? 'Kaydediliyor...' : 'Aşı Bilgilerini Kaydet'}
              setWidth="100%"
              handleOnPress={handleSaveVaccination}
              buttonColor="#0eb37d"
              pressedButtonColor="#0a8c61"
              isDisabled={isSaving}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('AppointmentScreen')}
              style={styles.secondaryLink}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryLinkText}>Randevularımı görüntüle</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      ) : null}

      <Modal visible={showTimeModal} transparent animationType="fade" onRequestClose={() => setShowTimeModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saat Seç</Text>
              <Text style={styles.modalSubtitle}>Klinik çalışma saatleri içerisinden uygun zamanı seç.</Text>
            </View>
            <FlatList
              data={timeSlots}
              keyExtractor={(item) => `${item.hour}-${item.minute}`}
              numColumns={3}
              contentContainerStyle={styles.timeGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.timeSlot,
                    selectedDate.getHours() === item.hour && selectedDate.getMinutes() === item.minute && styles.timeSlotActive,
                  ]}
                  onPress={() => handleSelectSlot(item)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      selectedDate.getHours() === item.hour && selectedDate.getMinutes() === item.minute && styles.timeSlotTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <CustomButton
              buttonText="Kapat"
              setWidth="100%"
              handleOnPress={() => setShowTimeModal(false)}
              buttonColor="#cbd5e1"
              pressedButtonColor="#94a3b8"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default VaccinationSchedule;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
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
  formCard: {
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
  inputWrapper: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#041523',
  },
  sectionSpacing: {
    marginTop: 26,
    marginBottom: 12,
  },
  clinicCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(11, 106, 162, 0.08)',
    padding: 16,
    marginTop: 12,
  },
  clinicInfo: {
    marginBottom: 12,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
  },
  clinicAddress: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  clinicActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  clinicActionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clinicActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  clinicActionWarning: {
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.25)',
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
  },
  clinicActionWarningText: {
    color: '#c62828',
  },
  clinicSelect: {
    marginTop: 12,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
  },
  clinicSelectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a8c61',
  },
  clinicSelectSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.7)',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateChip: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(11, 106, 162, 0.08)',
  },
  dateChipLabel: {
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.65)',
    marginBottom: 6,
  },
  dateChipValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    color: '#e53935',
  },
  summaryBox: {
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
    padding: 18,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a8c61',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.75)',
    marginBottom: 4,
  },
  secondaryLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  secondaryLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 21, 35, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#041523',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  timeGrid: {
    paddingBottom: 20,
  },
  timeSlot: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(6, 24, 40, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotActive: {
    backgroundColor: 'rgba(14, 179, 125, 0.18)',
    borderWidth: 1,
    borderColor: '#0eb37d',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(6, 24, 40, 0.7)',
  },
  timeSlotTextActive: {
    color: '#0a8c61',
  },
});


