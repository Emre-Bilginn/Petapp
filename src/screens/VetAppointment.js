import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ensureDirectChat } from './ChatService';
import { db } from '../../firebaseConfig';
import { CustomButton, CustomTextInput } from '../components/Index';

const TIME_SLOTS = [9, 10, 11, 13, 14, 15, 16, 17].flatMap((hour) => [
  { hour, minute: 0 },
  { hour, minute: 20 },
  { hour, minute: 40 },
]);

const formatDateLabel = (date) =>
  date?.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) ?? '';

const formatTimeLabel = (date) =>
  date?.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) ?? '';

const VetAppointment = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const auth = getAuth();

  const vet = route.params?.vet ?? null;

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [userAppointments, setUserAppointments] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const vetDisplayName = vet?.name ?? 'Veteriner';
  const vetSubtitle = vet?.address ?? vet?.vicinity ?? 'Klinik detayları henüz eklenmedi.';
  const vetKey = useMemo(() => {
    if (vet?.uid) {
      return `uid:${vet.uid}`;
    }
    if (vet?.name) {
      return `name:${vet.name.trim().toLowerCase()}`;
    }
    return null;
  }, [vet?.uid, vet?.name]);

  const selectedDayKey = useMemo(() => {
    if (!selectedDate) {
      return null;
    }
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  const timeKeySet = useMemo(() => new Set(blockedSlots), [blockedSlots]);

  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    const now = new Date();
    const past = [];
    const upcoming = [];

    userAppointments.forEach((item) => {
      const target = item.date < now ? past : upcoming;
      target.push(item);
    });

    past.sort((a, b) => b.date - a.date);
    upcoming.sort((a, b) => a.date - b.date);

    return { pastAppointments: past, upcomingAppointments: upcoming };
  }, [userAppointments]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthUser(currentUser);
    });
    return unsubscribe;
  }, [auth]);

  const loadSlotsAndAppointments = useCallback(async () => {
    if (!vetKey) {
      setBlockedSlots([]);
      setUserAppointments([]);
      return;
    }

    try {
      setIsLoadingSlots(true);
      const snapshot = await getDocs(query(collection(db, 'appointments'), where('vetKey', '==', vetKey)));

      const nextBlocked = [];
      const nextUserAppointments = [];

      snapshot.forEach((docItem) => {
        const data = docItem.data();
        if (data.appointmentKind && data.appointmentKind !== 'vet') {
          return;
        }

        const rawDate = data.date ?? data.appointmentDate ?? null;
        let dateObj = null;
        if (rawDate instanceof Date) {
          dateObj = rawDate;
        } else if (rawDate && typeof rawDate.toDate === 'function') {
          dateObj = rawDate.toDate();
        } else if (typeof rawDate === 'string') {
          const parsed = new Date(rawDate);
          if (!Number.isNaN(parsed.getTime())) {
            dateObj = parsed;
          }
        }
        if (!dateObj) {
          return;
        }
        const dateIso = dateObj.toISOString();
        const dayKey = dateIso.split('T')[0];
        const isCancelled = Boolean(data.cancelled);

        const slotKey = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        if (selectedDayKey && dayKey === selectedDayKey && !isCancelled) {
          nextBlocked.push(slotKey);
        }

        if (authUser && data.userId === authUser.uid) {
          nextUserAppointments.push({
            id: docItem.id,
            date: dateObj,
            note: data.note ?? '',
            cancelled: isCancelled,
          });
        }
      });

      setBlockedSlots([...new Set(nextBlocked)]);
      setUserAppointments(nextUserAppointments);
      setErrorMessage('');
    } catch (error) {
      console.error('Randevu bilgileri yüklenemedi:', error);
      setErrorMessage('Randevu bilgileri yüklenirken bir sorun oluştu. Biraz sonra tekrar dene.');
    } finally {
      setIsLoadingSlots(false);
    }
  }, [authUser, selectedDayKey, vetKey]);

  useEffect(() => {
    if (!vetKey) {
      return;
    }
    loadSlotsAndAppointments();
  }, [loadSlotsAndAppointments, vetKey]);

  const handleDateChange = (event, pickedDate) => {
    if (Platform.OS !== 'ios') {
      setIsDatePickerVisible(false);
    }

    if (!pickedDate) {
      return;
    }

    const updated = new Date(pickedDate);
    updated.setHours(selectedDate?.getHours() ?? 9, selectedDate?.getMinutes() ?? 0, 0, 0);
    setSelectedDate(updated);
  };

  const handleSelectSlot = (slot) => {
    const updated = new Date(selectedDate ?? Date.now());
    updated.setHours(slot.hour, slot.minute, 0, 0);
    setSelectedDate(updated);
    setIsTimeModalVisible(false);
  };

  const handleBookAppointment = async () => {
    if (!authUser) {
      Alert.alert('Giriş gerekli', 'Randevu oluşturmak için önce giriş yapmalısın.');
      return;
    }

    if (!vetKey || !vetDisplayName) {
      Alert.alert('Hata', 'Veteriner bilgisi bulunamadı.');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Hata', 'Lütfen tarih ve saat seç.');
      return;
    }

    const slotKey = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    if (timeKeySet.has(slotKey)) {
      Alert.alert('Saat dolu', 'Bu saat başka bir kişi tarafından alınmış. Başka bir saat seç.');
      return;
    }

    try {
      setIsBooking(true);
      const appointmentISO = selectedDate.toISOString();
      const normalizedVetName = vet?.name ? vet.name.trim().toLowerCase() : null;
      const clinicAddress = vet?.address ?? vet?.vicinity ?? null;
      const vetIdToUse = vet?.uid ?? 'noaccount';

      await addDoc(collection(db, 'appointments'), {
        appointmentKind: 'vet',
        userId: authUser.uid,
        vetId: vetIdToUse,
        vetKey,
        vetName: normalizedVetName,
        clinicId: vetIdToUse,
        clinicName: vetDisplayName,
        clinicAddress,
        date: appointmentISO,
        note: noteInput.trim() ? noteInput.trim() : null,
        isFull: true,
        createdAt: new Date().toISOString(),
      });

      if (vetIdToUse !== 'noaccount') {
        await ensureDirectChat({
          currentUserId: authUser.uid,
          targetUserId: vetIdToUse,
          currentUserFallbackName: authUser.displayName || authUser.email || 'Siz',
          targetUserFallbackName: vetDisplayName || 'Veteriner',
        });
      }

      Alert.alert('Başarılı', 'Randevunuz oluşturuldu. Görüşmek üzere!');
      setNoteInput('');
      await loadSlotsAndAppointments();
    } catch (error) {
      console.error('Randevu oluşturulamadı:', error);
      Alert.alert('Hata', 'Randevu kaydedilirken bir sorun çıktı. Tekrar dene.');
    } finally {
      setIsBooking(false);
    }
  };

  if (!vet) {
    return (
      <SafeAreaView style={styles.safeAreaCentered}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
        <Text style={styles.centeredTitle}>Veteriner bilgisi bulunamadı</Text>
        <Text style={styles.centeredSubtitle}>Listeye geri dönerek farklı bir klinik seçebilirsin.</Text>
        <CustomButton
          buttonText="Geri dön"
          setWidth="70%"
          handleOnPress={() => navigation.goBack()}
          buttonColor="#0b6aa2"
          pressedButtonColor="#084d73"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{vetDisplayName}</Text>
            <Text style={styles.heroSubtitle}>{vetSubtitle}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Tarih Seç</Text>
            <CustomButton
              buttonText={formatDateLabel(selectedDate) || 'Tarih Seç'}
              setWidth="100%"
              handleOnPress={() => setIsDatePickerVisible(true)}
              buttonColor="#0b6aa2"
              pressedButtonColor="#084d73"
            />
            {isDatePickerVisible ? (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2. Saat Seç</Text>
            <CustomButton
              buttonText={formatTimeLabel(selectedDate) || 'Saat Seç'}
              setWidth="100%"
              handleOnPress={() => setIsTimeModalVisible(true)}
              buttonColor="#0eb37d"
              pressedButtonColor="#0a8c61"
            />
            {isLoadingSlots ? (
              <ActivityIndicator size="small" color="#0b6aa2" style={styles.loader} />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>3. Not Ekle (Opsiyonel)</Text>
            <CustomTextInput
              title="Not"
              isSecureText={false}
              handleOnChangeText={setNoteInput}
              handleValue={noteInput}
              handlePlaceHolder="Örn. Muayene sebebi"
              helperText="Veteriner ile paylaşmak istediğin kısa bir not ekleyebilirsin."
              containerStyle={styles.noteInput}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Özet</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tarih</Text>
              <Text style={styles.summaryValue}>{formatDateLabel(selectedDate) || '-'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Saat</Text>
              <Text style={styles.summaryValue}>{formatTimeLabel(selectedDate) || '-'}</Text>
            </View>
            {noteInput.trim() ? (
              <View style={styles.summaryNote}>
                <Text style={styles.summaryNoteLabel}>Notun</Text>
                <Text style={styles.summaryNoteValue}>{noteInput.trim()}</Text>
              </View>
            ) : null}
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <CustomButton
              buttonText={isBooking ? 'Randevu Oluşturuluyor...' : 'Randevuyu Onayla'}
              setWidth="100%"
              handleOnPress={handleBookAppointment}
              buttonColor="#2fbf71"
              pressedButtonColor="#249760"
              isDisabled={isBooking}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Yaklaşan Randevuların</Text>
            {upcomingAppointments.length ? (
              upcomingAppointments.map((item) => (
                <View key={item.id} style={styles.appointmentRow}>
                  <Text style={styles.appointmentDate}>
                    {item.date.toLocaleString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {item.note ? <Text style={styles.appointmentNote}>{item.note}</Text> : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Bu klinikte planlanmış randevun yok.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Geçmiş Randevuların</Text>
            {pastAppointments.length ? (
              pastAppointments.map((item) => (
                <View key={item.id} style={styles.appointmentRowPast}>
                  <Text style={styles.appointmentDatePast}>
                    {item.date.toLocaleString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {item.note ? <Text style={styles.appointmentNotePast}>{item.note}</Text> : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Henüz geçmiş randevun yok.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTimeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Saat Seç</Text>
            <Text style={styles.modalSubtitle}>Müsait saatler dolu olanlarla birlikte listelenir.</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((slot) => {
                const slotLabel = `${slot.hour.toString().padStart(2, '0')}:${slot.minute
                  .toString()
                  .padStart(2, '0')}`;
                const isBlocked = timeKeySet.has(slotLabel);
                const isSelected =
                  selectedDate &&
                  selectedDate.getHours() === slot.hour &&
                  selectedDate.getMinutes() === slot.minute;

                return (
                  <TouchableOpacity
                    key={slotLabel}
                    style={[
                      styles.timeSlot,
                      isBlocked && styles.timeSlotBlocked,
                      isSelected && styles.timeSlotSelected,
                    ]}
                    disabled={isBlocked}
                    onPress={() => handleSelectSlot(slot)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotTextSelected,
                        isBlocked && styles.timeSlotTextBlocked,
                      ]}
                    >
                      {slotLabel}
                    </Text>
                    {isBlocked ? <Text style={styles.timeSlotBadge}>Dolu</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
            <CustomButton
              buttonText="Kapat"
              setWidth="100%"
              handleOnPress={() => setIsTimeModalVisible(false)}
              buttonColor="#cbd5e1"
              pressedButtonColor="#94a3b8"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default VetAppointment;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    marginBottom: 18,
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
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.65)',
    lineHeight: 20,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
  },
  loader: {
    marginTop: 12,
  },
  noteInput: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  summaryNote: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(11, 106, 162, 0.08)',
    padding: 12,
  },
  summaryNoteLabel: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  summaryNoteValue: {
    marginTop: 4,
    fontSize: 14,
    color: '#041523',
  },
  errorText: {
    marginTop: 16,
    fontSize: 12,
    color: '#e53935',
  },
  appointmentRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 24, 40, 0.08)',
  },
  appointmentRowPast: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 24, 40, 0.08)',
    opacity: 0.85,
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  appointmentDatePast: {
    fontSize: 14,
    fontWeight: '600',
    color: '#041523',
  },
  appointmentNote: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  appointmentNotePast: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.55)',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#041523',
  },
  modalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 20,
    gap: 10,
  },
  timeSlot: {
    width: '29%',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(6, 24, 40, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotSelected: {
    backgroundColor: 'rgba(14, 179, 125, 0.18)',
    borderWidth: 1,
    borderColor: '#0eb37d',
  },
  timeSlotBlocked: {
    backgroundColor: 'rgba(6, 24, 40, 0.08)',
    borderColor: 'rgba(6, 24, 40, 0.2)',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(6, 24, 40, 0.7)',
  },
  timeSlotTextSelected: {
    color: '#0a8c61',
  },
  timeSlotTextBlocked: {
    color: 'rgba(6, 24, 40, 0.4)',
  },
  timeSlotBadge: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#e53935',
  },
});
