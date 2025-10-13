import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch } from 'react-redux';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { logOut } from '../redux/UserSlice';

const WORKING_HOURS = [9, 10, 11, 13, 14, 15, 16, 17];
const TIME_SEGMENTS = [0, 20, 40];

const AVAILABLE_SLOTS = WORKING_HOURS.flatMap((hour) =>
  TIME_SEGMENTS.map((minute) => {
    const label = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    return { hour, minute, label };
  }),
);

const clampToMinute = (value) => {
  const next = new Date(value);
  next.setSeconds(0, 0);
  return next;
};

const toDate = (value) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) {
    return 'Tarih belirlenmedi';
  }
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const VetDashboard = () => {
  const auth = getAuth();
  const db = getFirestore();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [vaccinationAppointments, setVaccinationAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => clampToMinute(new Date()));
  const [isBlockModalVisible, setIsBlockModalVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [vetContext, setVetContext] = useState({ vetKey: null, normalizedName: null, displayName: '' });

  const openBlockModal = () => {
    setSelectedDate(clampToMinute(new Date()));
    setIsBlockModalVisible(true);
  };

  const closeBlockModal = () => {
    setIsBlockModalVisible(false);
    setIsDatePickerVisible(false);
    setIsTimeModalVisible(false);
    setSelectedDate(clampToMinute(new Date()));
  };

  const handleDatePickerChange = (_, dateValue) => {
    setIsDatePickerVisible(false);
    if (!dateValue) {
      return;
    }
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setFullYear(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
      return clampToMinute(next);
    });
  };

  const handleSelectTime = (slot) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setHours(slot.hour, slot.minute, 0, 0);
      return clampToMinute(next);
    });
    setIsTimeModalVisible(false);
  };

  const loadDashboardData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setError('Oturum bilgisi bulunamadı.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const normalizedName = user.displayName ? user.displayName.trim().toLowerCase() : null;
      const vetKey = `uid:${user.uid}`;
      const displayName = user.displayName ? user.displayName.trim() : '';

      setVetContext({ vetKey, normalizedName, displayName: user.displayName || '' });

      const normalizeName = (value) =>
        typeof value === 'string' ? value.trim().toLowerCase() : '';
      const normalizeLoose = (value) => {
        const base = normalizeName(value);
        if (!base) {
          return '';
        }
        return base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
      };
      const nameCandidates = new Set(
        [normalizedName, normalizeName(displayName)].filter(Boolean)
      );
      const looseCandidates = new Set(
        [normalizedName, displayName].map(normalizeLoose).filter(Boolean)
      );
      const extractCandidates = (source) => {
        if (!source) {
          return [];
        }
        if (typeof source === 'string') {
          return [source];
        }
        const results = [];
        const push = (value) => {
          if (typeof value === 'string' && value.trim()) {
            results.push(value);
          }
        };
        if (typeof source === 'object') {
          push(source.name);
          push(source.title);
          push(source.clinicName);
          push(source.displayName);
        }
        return results;
      };
      const matchesVeterinarian = (value) => {
        const candidates = extractCandidates(value);
        if (!candidates.length) {
          return false;
        }
        return candidates.some((item) => {
          const strict = normalizeName(item);
          if (strict && nameCandidates.has(strict)) {
            return true;
          }
          const loose = normalizeLoose(item);
          return Boolean(loose && looseCandidates.has(loose));
        });
      };

      const reconcileLegacyRecords = async () => {
        const appointmentRef = collection(db, 'appointments');
        const appointmentQueries = [
          query(appointmentRef, where('vetId', '==', 'noaccount')),
          query(appointmentRef, where('clinicId', '==', 'noaccount')),
        ];
        if (normalizedName) {
          appointmentQueries.push(query(appointmentRef, where('vetName', '==', normalizedName)));
        }
        if (displayName) {
          appointmentQueries.push(query(appointmentRef, where('clinicName', '==', displayName)));
        }

        const processedAppointments = new Set();
        for (const q of appointmentQueries) {
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            if (processedAppointments.has(docSnap.id)) {
              continue;
            }
            processedAppointments.add(docSnap.id);
            const data = docSnap.data();
            const matches =
              matchesVeterinarian(data?.vetName) ||
              matchesVeterinarian(data?.clinicName) ||
              matchesVeterinarian(data?.clinicLocation);
            if (!matches) {
              continue;
            }
            const updates = {};
            if (data?.vetId !== user.uid) {
              updates.vetId = user.uid;
            }
            if (data?.vetKey !== vetKey) {
              updates.vetKey = vetKey;
            }
            if (normalizedName && data?.vetName !== normalizedName) {
              updates.vetName = normalizedName;
            }
            if ((!data?.clinicId || data.clinicId === 'noaccount') && user.uid) {
              updates.clinicId = user.uid;
            }
            if (!data?.clinicName && displayName) {
              updates.clinicName = displayName;
            }
            if (Object.keys(updates).length) {
              await updateDoc(doc(db, 'appointments', docSnap.id), updates);
            }
          }
        }

        const vaccinationRef = collection(db, 'VaccinationSchedules');
        const vaccinationQueries = [
          query(vaccinationRef, where('clinicId', '==', 'noaccount')),
        ];
        if (displayName) {
          vaccinationQueries.push(query(vaccinationRef, where('clinicName', '==', displayName)));
        }
        const processedVaccinations = new Set();
        for (const q of vaccinationQueries) {
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            if (processedVaccinations.has(docSnap.id)) {
              continue;
            }
            processedVaccinations.add(docSnap.id);
            const data = docSnap.data();
            const matches =
              matchesVeterinarian(data?.clinicName) ||
              matchesVeterinarian(data?.clinicLocation) ||
              matchesVeterinarian(data?.vetName);
            if (!matches) {
              continue;
            }
            const updates = {};
            if (data?.clinicId !== user.uid) {
              updates.clinicId = user.uid;
            }
            if (!data?.clinicName && displayName) {
              updates.clinicName = displayName;
            }
            if (Object.keys(updates).length) {
              await updateDoc(doc(db, 'VaccinationSchedules', docSnap.id), updates);
            }
          }
        }
      };

      try {
        await reconcileLegacyRecords();
      } catch (legacyError) {
        console.warn('Legacy record reconcile failed:', legacyError);
      }

      const appointmentRef = collection(db, 'appointments');
      const appointmentQueries = [
        query(appointmentRef, where('vetKey', '==', vetKey)),
        query(appointmentRef, where('vetId', '==', user.uid)),
      ];
      if (normalizedName) {
        appointmentQueries.push(query(appointmentRef, where('vetName', '==', normalizedName)));
      }

      const appointmentSnapshots = await Promise.allSettled(
        appointmentQueries.map((q) => getDocs(q)),
      );

      const appointmentMap = new Map();
      const ownerIds = new Set();

      appointmentSnapshots.forEach((result) => {
        if (result.status !== 'fulfilled') {
          console.warn('Appointment query failed:', result.reason);
          return;
        }
        result.value.forEach((docSnap) => {
          if (appointmentMap.has(docSnap.id)) {
            return;
          }
          const data = docSnap.data();
          const dateValue = toDate(data.date ?? data.appointmentDate);
          if (!dateValue) {
            return;
          }

          const appointment = {
            id: docSnap.id,
            date: dateValue,
            isoDate: dateValue.toISOString(),
            userId: data.userId ?? null,
            appointmentKind: data.appointmentKind ?? 'vet',
            note: data.note ?? '',
            cancelled: Boolean(data.cancelled),
            createdAt: toDate(data.createdAt),
            raw: data,
          };

          appointment.status = appointment.cancelled
            ? 'cancelled'
            : appointment.userId === 'blocked'
            ? 'blocked'
            : 'active';

          appointmentMap.set(docSnap.id, appointment);

          if (appointment.userId && appointment.userId !== 'blocked') {
            ownerIds.add(appointment.userId);
          }
        });
      });

      let ownerLookup = {};
      if (ownerIds.size > 0) {
        const ownerSnapshots = await Promise.allSettled(
          Array.from(ownerIds).map((ownerId) => getDoc(doc(db, 'Users', ownerId))),
        );

        ownerLookup = {};
        ownerSnapshots.forEach((result) => {
          if (result.status !== 'fulfilled') {
            console.warn('Owner lookup failed:', result.reason);
            return;
          }
          const docSnap = result.value;
          if (docSnap.exists()) {
            ownerLookup[docSnap.id] = docSnap.data();
          }
        });
      }

      const now = new Date();
      const blockedList = [];
      const upcomingList = [];

      appointmentMap.forEach((item) => {
        const owner = item.userId && ownerLookup[item.userId] ? ownerLookup[item.userId] : null;
        const detailed = { ...item, owner };
        if (item.status === 'blocked') {
          blockedList.push(detailed);
          return;
        }
        if (item.status === 'cancelled') {
          return;
        }
        if (item.date >= now) {
          upcomingList.push(detailed);
        }
      });

      blockedList.sort((a, b) => a.date - b.date);
      upcomingList.sort((a, b) => a.date - b.date);

      const vaccinationSnapshot = await getDocs(
        query(collection(db, 'VaccinationSchedules'), where('clinicId', '==', user.uid)),
      );

      const vaccinationOwnerIds = new Set();
      const vaccinationRaw = vaccinationSnapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const dateValue = toDate(data.appointmentDate ?? data.date);
          if (!dateValue) {
            return null;
          }
          if (data.userId) {
            vaccinationOwnerIds.add(data.userId);
          }
          return {
            id: docSnap.id,
            date: dateValue,
            petName: data.petName ?? '',
            vaccineName: data.vaccineName ?? '',
            ownerId: data.userId ?? null,
            raw: data,
          };
        })
        .filter(Boolean)
        .filter((item) => item.date >= now)
        .sort((a, b) => a.date - b.date);

      const missingOwnerIds = Array.from(vaccinationOwnerIds).filter(
        (ownerId) => ownerId && !ownerLookup[ownerId],
      );

      if (missingOwnerIds.length) {
        const additionalOwners = await Promise.allSettled(
          missingOwnerIds.map((ownerId) => getDoc(doc(db, 'Users', ownerId))),
        );
        additionalOwners.forEach((result) => {
          if (result.status !== 'fulfilled') {
            console.warn('Vaccination owner lookup failed:', result.reason);
            return;
          }
          const docSnap = result.value;
          if (docSnap.exists()) {
            ownerLookup[docSnap.id] = docSnap.data();
          }
        });
      }

      const vaccinationList = vaccinationRaw.map((item) => ({
        ...item,
        owner: item.ownerId && ownerLookup[item.ownerId] ? ownerLookup[item.ownerId] : null,
      }));

      setBlockedSlots(blockedList);
      setUpcomingAppointments(upcomingList);
      setVaccinationAppointments(vaccinationList);
    } catch (err) {
      console.error('Vet dashboard load failed:', err);
      setError('Randevu verileri okunamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [auth, db]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSaveBlockSlot = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Oturum kapalı', 'Bu işlemi yapmak için tekrar giriş yapmalısınız.');
      return;
    }

    if (!vetContext.vetKey) {
      Alert.alert('Hata', 'Veteriner bilgisi yüklenemedi.');
      return;
    }

    const targetDate = clampToMinute(selectedDate);
    const now = new Date();
    if (targetDate <= now) {
      Alert.alert('Uygun değil', 'Geçmiş bir zaman dilimini bloklayamazsınız.');
      return;
    }

    const isoDate = targetDate.toISOString();

    try {
      setSavingBlock(true);

      const appointmentRef = collection(db, 'appointments');
      const checks = [
        query(appointmentRef, where('vetKey', '==', vetContext.vetKey), where('date', '==', isoDate)),
        query(appointmentRef, where('vetId', '==', user.uid), where('date', '==', isoDate)),
      ];

      const checkSnapshots = await Promise.allSettled(checks.map((q) => getDocs(q)));

      const conflict = checkSnapshots.some((result) => {
        if (result.status !== 'fulfilled') {
          console.warn('Availability check failed:', result.reason);
          return false;
        }
        return result.value.docs.some((docSnap) => {
          const data = docSnap.data();
          if (data.cancelled) {
            return false;
          }
          const userId = data.userId ?? null;
          return userId !== 'blocked';
        });
      });

      if (conflict) {
        Alert.alert('Saat uygun değil', 'Bu saat için zaten bir randevu var. Önce randevuyu iptal edin.');
        return;
      }

      await addDoc(appointmentRef, {
        appointmentKind: 'vet',
        userId: 'blocked',
        vetId: user.uid,
        vetKey: vetContext.vetKey,
        vetName: vetContext.normalizedName,
        clinicName: user.displayName || 'Veteriner',
        date: isoDate,
        isFull: true,
        blockedBy: user.uid,
        blockedAt: new Date().toISOString(),
      });

      Alert.alert('İşlem tamam', 'Saat artık randevuya kapalı.');
      closeBlockModal();
      await loadDashboardData();
    } catch (err) {
      console.error('Block slot failed:', err);
      Alert.alert('Hata', 'Saat bloklanamadı. Lütfen tekrar deneyin.');
    } finally {
      setSavingBlock(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        cancelled: true,
        isFull: false,
      });
      Alert.alert('İptal edildi', 'Randevu iptal edildi.');
      await loadDashboardData();
    } catch (err) {
      console.error('Cancel appointment failed:', err);
      Alert.alert('Hata', 'Randevu iptal edilemedi.');
    }
  };

  const handleReleaseBlockedSlot = async (slotId) => {
    try {
      await deleteDoc(doc(db, 'appointments', slotId));
      Alert.alert('Serbest bırakıldı', 'Seçilen saat yeniden randevuya açıldı.');
      await loadDashboardData();
    } catch (err) {
      console.error('Release slot failed:', err);
      Alert.alert('Hata', 'Saat serbest bırakılamadı.');
    }
  };

  const handleLogOut = async () => {
    try {
      await dispatch(logOut()).unwrap();
    } catch (err) {
      console.error('Log out failed:', err);
      Alert.alert('Hata', 'Oturum kapatılamadı.');
    }
  };

  const headerSubtitle = useMemo(() => {
    if (!vetContext.displayName) {
      return 'Hoş geldiniz';
    }
    return `${vetContext.displayName} olarak giriş yapıldı`;
  }, [vetContext.displayName]);

  const renderTimeSlotItem = ({ item }) => {
    const isSelected =
      selectedDate.getHours() === item.hour && selectedDate.getMinutes() === item.minute;
    return (
      <TouchableOpacity
        style={[styles.timeSlot, isSelected && styles.timeSlotSelected]}
        onPress={() => handleSelectTime(item)}
      >
        <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextSelected]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOwnerName = (owner) => {
    if (!owner) {
      return '';
    }
    const name = owner.name || owner.displayName || '';
    return name.trim();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Veteriner Paneli</Text>
        <Text style={styles.subtitle}>{headerSubtitle}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={openBlockModal}>
        <Text style={styles.primaryButtonText}>Yeni saat blokla</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0b6aa2" />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yaklaşan randevular</Text>
            {upcomingAppointments.length ? (
              upcomingAppointments.map((item) => {
                const ownerName = renderOwnerName(item.owner);
                return (
                  <View key={item.id} style={styles.card}>
                    <Text style={styles.cardDate}>{formatDateTime(item.date)}</Text>
                    {ownerName ? (
                      <Text style={styles.cardDetail}>Danışan: {ownerName}</Text>
                    ) : null}
                    {item.note ? <Text style={styles.cardDetail}>Not: {item.note}</Text> : null}
                    <TouchableOpacity
                      style={styles.destructiveButton}
                      onPress={() => handleCancelAppointment(item.id)}
                    >
                      <Text style={styles.destructiveButtonText}>Randevuyu iptal et</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Yaklaşan randevu bulunmuyor.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aşı randevuları</Text>
            {vaccinationAppointments.length ? (
              vaccinationAppointments.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardDate}>{formatDateTime(item.date)}</Text>
                  <Text style={styles.cardDetail}>
                    Evcil hayvan: {item.petName || 'Belirtilmedi'}
                  </Text>
                  <Text style={styles.cardDetail}>Aşı: {item.vaccineName || 'Belirtilmedi'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Yaklaşan aşı randevusu yok.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bloklanan saatler</Text>
            {blockedSlots.length ? (
              blockedSlots.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardDate}>{formatDateTime(item.date)}</Text>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleReleaseBlockedSlot(item.id)}
                  >
                    <Text style={styles.secondaryButtonText}>Saati aç</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Henüz bloklanan saat yok.</Text>
            )}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogOut}>
        <Text style={styles.logoutText}>Oturumu kapat</Text>
      </TouchableOpacity>

      <Modal visible={isBlockModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Saat blokla</Text>
            <Text style={styles.modalSubtitle}>
              Bu araçla seçtiğiniz tarihi yeni randevulara kapatabilirsiniz.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setIsDatePickerVisible(true)}
              >
                <Text style={styles.secondaryButtonText}>Tarih seç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setIsTimeModalVisible(true)}
              >
                <Text style={styles.secondaryButtonText}>Saat seç</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSelectedValue}>{formatDateTime(selectedDate)}</Text>

            <TouchableOpacity
              style={[styles.primaryButton, savingBlock && styles.primaryButtonDisabled]}
              onPress={handleSaveBlockSlot}
              disabled={savingBlock}
            >
              <Text style={styles.primaryButtonText}>
                {savingBlock ? 'Kaydediliyor...' : 'Saati blokla'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelButton} onPress={closeBlockModal}>
              <Text style={styles.modalCancelText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isDatePickerVisible ? (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="spinner"
          onChange={handleDatePickerChange}
        />
      ) : null}

      <Modal visible={isTimeModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.timeModalCard}>
            <Text style={styles.modalTitle}>Saat seç</Text>
            <FlatList
              data={AVAILABLE_SLOTS}
              keyExtractor={(item) => item.label}
              renderItem={renderTimeSlotItem}
              numColumns={3}
              contentContainerStyle={styles.timeGrid}
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setIsTimeModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb', paddingHorizontal: 20, paddingTop: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#041523' },
  subtitle: { marginTop: 4, fontSize: 14, color: 'rgba(6, 24, 40, 0.65)' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { marginBottom: 12, color: '#d32f2f', fontSize: 13 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#041523', marginBottom: 12 },
  card: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardDate: { fontSize: 15, fontWeight: '700', color: '#0b6aa2', marginBottom: 6 },
  cardDetail: { fontSize: 13, color: 'rgba(6, 24, 40, 0.75)', marginTop: 2 },
  emptyText: { fontSize: 14, color: 'rgba(6, 24, 40, 0.6)', textAlign: 'center', paddingVertical: 16 },
  primaryButton: {
    borderRadius: 16,
    backgroundColor: '#0eb37d',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#041523', fontSize: 13, fontWeight: '600' },
  destructiveButton: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.3)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  destructiveButtonText: { color: '#d32f2f', fontSize: 13, fontWeight: '600' },
  logoutButton: {
    marginTop: 'auto',
    marginBottom: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.15)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#d32f2f', fontSize: 14, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 21, 35, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#041523' },
  modalSubtitle: { marginTop: 6, fontSize: 13, color: 'rgba(6, 24, 40, 0.65)' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 12 },
  modalSelectedValue: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: '600',
    color: '#0b6aa2',
    textAlign: 'center',
  },
  modalCancelButton: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 24, 40, 0.15)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: { color: '#041523', fontSize: 13, fontWeight: '600' },
  timeModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  timeGrid: { paddingVertical: 16 },
  timeSlot: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 24, 40, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  timeSlotSelected: {
    backgroundColor: 'rgba(14, 179, 125, 0.18)',
    borderWidth: 1,
    borderColor: '#0eb37d',
  },
  timeSlotText: { fontSize: 14, fontWeight: '600', color: 'rgba(6, 24, 40, 0.7)' },
  timeSlotTextSelected: { color: '#0a8c61' },
});

export default VetDashboard;
