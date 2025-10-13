import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db, app } from '../../firebaseConfig';

const normalizeDate = (value) => {
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
  const date = normalizeDate(value);
  if (!date) {
    return 'Tarih bilgisi yok';
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

const AppointmentScreen = () => {
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchAppointments(currentUser.uid);
      } else {
        setUser(null);
        setAppointments([]);
      }
    });
    return unsubscribe;
  }, []);

  const fetchAppointments = async (userId) => {
    if (!userId) {
      return;
    }

    try {
      setIsLoading(true);

      const appointmentQuery = query(collection(db, 'appointments'), where('userId', '==', userId));
      const vaccinationQuery = query(collection(db, 'VaccinationSchedules'), where('userId', '==', userId));

      const [appointmentSnap, vaccinationSnap] = await Promise.all([
        getDocs(appointmentQuery),
        getDocs(vaccinationQuery),
      ]);

      const fetchedAppointments = appointmentSnap.docs.map((docItem) => {
        const data = docItem.data();
        const kind = data.appointmentKind === 'vaccination' ? 'vaccination' : 'vet';
        const clinicDisplay =
          data.clinicName ?? data.vetName ?? 'Klinik bilgisi yok';

        return {
          id: docItem.id,
          type: kind,
          date: data.date ?? data.appointmentDate ?? null,
          vetName: clinicDisplay,
          petName: data.petName ?? null,
          vaccineName: data.vaccineName ?? null,
          raw: data,
        };
      });

      const vaccinationAppointments = vaccinationSnap.docs.map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          type: 'vaccination',
          date: data.appointmentDate ?? data.date ?? null,
          vetName: data.clinicName ?? 'Klinik seçilmedi',
          petName: data.petName ?? 'Evcil hayvan adı yok',
          vaccineName: data.vaccineName ?? 'Aşı adı yok',
          raw: data,
        };
      });

      setAppointments([...fetchedAppointments, ...vaccinationAppointments]);
    } catch (error) {
      console.error('Randevular yüklenirken hata oluştu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const { pastAppointments, upcomingAppointments } = useMemo(() => {
    const now = new Date();

    const normalizeItems = appointments.map((item) => ({
      ...item,
      normalizedDate: normalizeDate(item.date),
    }));

    const past = normalizeItems
      .filter((item) => item.normalizedDate && item.normalizedDate < now)
      .sort((a, b) => b.normalizedDate - a.normalizedDate);

    const upcoming = normalizeItems
      .filter((item) => item.normalizedDate && item.normalizedDate >= now)
      .sort((a, b) => a.normalizedDate - b.normalizedDate);

    return {
      pastAppointments: past,
      upcomingAppointments: upcoming,
    };
  }, [appointments]);

  const renderAppointmentItem = ({ item }) => (
    <View style={styles.appointmentItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.appointmentText}>{formatDateTime(item.normalizedDate ?? item.date)}</Text>
        <View style={[styles.typeTag, item.type === 'vaccination' ? styles.typeTagVaccination : styles.typeTagVet]}>
          <Text style={styles.typeTagText}>{item.type === 'vaccination' ? 'Aşı' : 'Veteriner'}</Text>
        </View>
      </View>
      <Text style={styles.vetName}>Klinik: {item.vetName}</Text>
      {item.type === 'vaccination' ? (
        <>
          <Text style={styles.detailText}>Evcil Hayvan: {item.petName || 'Belirtilmedi'}</Text>
          <Text style={styles.detailText}>Aşı: {item.vaccineName || 'Belirtilmedi'}</Text>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Randevularım</Text>

      {isLoading && !upcomingAppointments.length && !pastAppointments.length ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color="#0eb37d" />
        </View>
      ) : null}

      <Text style={styles.subtitle}>Gelecek Randevular</Text>
      <FlatList
        data={upcomingAppointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointmentItem}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Planlanmış randevu bulunmuyor.</Text> : null}
      />

      <Text style={styles.subtitle}>Geçmiş Randevular</Text>
      <FlatList
        data={pastAppointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointmentItem}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Geçmiş randevu bulunmuyor.</Text> : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f6f9fc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#041523',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
    color: '#041523',
  },
  appointmentItem: {
    padding: 16,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#041523',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appointmentText: {
    fontSize: 15,
    color: 'rgba(6, 24, 40, 0.75)',
    flex: 1,
    marginRight: 12,
  },
  vetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#041523',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.7)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.6)',
    textAlign: 'center',
    paddingVertical: 16,
  },
  loaderWrapper: {
    marginTop: 24,
    alignItems: 'center',
  },
  typeTag: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  typeTagVaccination: {
    backgroundColor: '#0a8c61',
  },
  typeTagVet: {
    backgroundColor: '#0b6aa2',
  },
});

export default AppointmentScreen;




