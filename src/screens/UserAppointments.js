import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../../firebaseConfig';
import { prepareDirectChatParams } from './ChatService';

const UserAppointments = ({ navigation }) => {
  const auth = getAuth();
  const [pastAppointments, setPastAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      const user = auth.currentUser;
      if (!user) {
        return;
      }

      try {
        const currentDate = new Date();
        const past = [];
        const upcoming = [];

        const mapSnapshot = (docSnap, kind) => {
          const data = docSnap.data();
          const rawDate = data.appointmentDate || data.date;
          const appointmentDate = rawDate?.toDate?.() || new Date(rawDate);
          if (!appointmentDate || Number.isNaN(appointmentDate.getTime())) {
            return null;
          }
          return {
            id: docSnap.id,
            ...data,
            appointmentDate,
            kind,
          };
        };

        const vaccinationRef = collection(db, 'VaccinationSchedules');
        const vaccinationQuery = query(
          vaccinationRef,
          where('userId', '==', user.uid),
          orderBy('date'),
        );
        const vaccinationSnapshot = await getDocs(vaccinationQuery);
        vaccinationSnapshot.forEach((docSnap) => {
          const normalized = mapSnapshot(docSnap, 'vaccination');
          if (!normalized) {
            return;
          }
          if (normalized.appointmentDate < currentDate) {
            past.push(normalized);
          } else {
            upcoming.push(normalized);
          }
        });

        const vetAppointmentRef = collection(db, 'appointments');
        const vetQuery = query(vetAppointmentRef, where('userId', '==', user.uid));
        const vetSnapshot = await getDocs(vetQuery);
        vetSnapshot.forEach((docSnap) => {
          const normalized = mapSnapshot(docSnap, 'vet');
          if (!normalized) {
            return;
          }
          if (normalized.appointmentDate < currentDate) {
            past.push(normalized);
          } else {
            upcoming.push(normalized);
          }
        });

        past.sort((a, b) => b.appointmentDate - a.appointmentDate);
        upcoming.sort((a, b) => a.appointmentDate - b.appointmentDate);

        setPastAppointments(past);
        setUpcomingAppointments(upcoming);
      } catch (error) {
        console.error('Randevular alnrken hata olutu:', error);
        Alert.alert('Hata', 'Randevular yÃ¼klenemedi. LÃ¼tfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [auth]);

  const handleMessagePress = async (appointment) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Sohbet', 'Mesajlamak iÃ§in giri yapmalsnz.');
      return;
    }

    const vetIdCandidate = appointment.clinicId || appointment.vetId;
    const vetId = vetIdCandidate && vetIdCandidate !== 'noaccount' ? vetIdCandidate : null;

    if (!vetId) {
      Alert.alert('Sohbet', 'Bu randevunun bal olduu veteriner hesab bulunamad.');
      return;
    }

    try {
      const params = await prepareDirectChatParams({
        currentUserId: user.uid,
        targetUserId: vetId,
        currentUserFallbackName: user.displayName || user.email || 'Siz',
        targetUserFallbackName: appointment.clinicName || 'Veteriner',
      });
      navigation.navigate('ChatRoom', params);
    } catch (error) {
      console.error('Direct message navigation failed:', error);
      Alert.alert('Sohbet', 'Mesaj ekran aÃ§lrken bir sorun olutu.');
    }
  };

  const renderAppointment = ({ item }) => {
    const hasDirectMessage = (item.clinicId && item.clinicId !== 'noaccount') || (item.vetId && item.vetId !== 'noaccount');

    return (
      <View style={styles.appointmentCard}>
        <Text style={styles.petName}>Evcil Hayvan: {item.petName}</Text>
        <Text style={styles.vaccineName}>A: {item.vaccineName}</Text>
        <Text style={styles.date}>
          Tarih:{' '}
          {item.appointmentDate.toLocaleString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}
        </Text>
        {hasDirectMessage ? (
          <TouchableOpacity
            style={styles.messageButton}
            onPress={() => handleMessagePress(item)}
            activeOpacity={0.75}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#ffffff" />
            <Text style={styles.messageButtonText}>Mesaj GÃ¶nder</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Randevular yÃ¼kleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#ff8c00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevularm</Text>
      </View>

      <Text style={styles.sectionTitle}>Yaklaan Randevular</Text>
      {upcomingAppointments.length > 0 ? (
        <FlatList
          data={upcomingAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
        />
      ) : (
        <Text style={styles.noAppointments}>Yaklaan randevunuz yok.</Text>
      )}

      <Text style={styles.sectionTitle}>GeÃ§mi Randevular</Text>
      {pastAppointments.length > 0 ? (
        <FlatList
          data={pastAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
        />
      ) : (
        <Text style={styles.noAppointments}>GeÃ§mi randevunuz yok.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#ff8c00',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff8c00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    padding: 8,
    backgroundColor: '#ff8c00',
    color: '#fff',
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    gap: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
  },
  vaccineName: {
    fontSize: 14,
    color: '#555',
  },
  date: {
    fontSize: 14,
    color: '#555',
  },
  messageButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0eb37d',
  },
  messageButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  noAppointments: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UserAppointments;


