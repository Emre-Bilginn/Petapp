import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';
import Ionicons from 'react-native-vector-icons/Ionicons';

const UserAppointments = ({ navigation }) => {
  const [pastAppointments, setPastAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      try {
        const vaccinationRef = collection(db, 'VaccinationSchedules');
        const q = query(vaccinationRef, where('userId', '==', user.uid), orderBy('date'));
        const querySnapshot = await getDocs(q);

        const currentDate = new Date();
        const past = [];
        const upcoming = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const appointmentDate = data.date.toDate(); // Firestore Timestamp to JS Date
          if (appointmentDate < currentDate) {
            past.push({ id: doc.id, ...data });
          } else {
            upcoming.push({ id: doc.id, ...data });
          }
        });

        setPastAppointments(past);
        setUpcomingAppointments(upcoming);
        setLoading(false);
      } catch (error) {
        console.error("Randevuları alırken hata oluştu: ", error);
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const renderAppointment = ({ item }) => (
    <View style={styles.appointmentCard}>
      <Text style={styles.petName}>Evcil Hayvan: {item.petName}</Text>
      <Text style={styles.vaccineName}>Aşı: {item.vaccineName}</Text>
      <Text style={styles.date}>
        Tarih: {item.date.toDate().toLocaleString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Randevular yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#ff8c00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Randevularım</Text>
      </View>

      <Text style={styles.sectionTitle}>Yaklaşan Randevular</Text>
      {upcomingAppointments.length > 0 ? (
        <FlatList
          data={upcomingAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
        />
      ) : (
        <Text style={styles.noAppointments}>Yaklaşan randevunuz yok.</Text>
      )}

      <Text style={styles.sectionTitle}>Geçmiş Randevular</Text>
      {pastAppointments.length > 0 ? (
        <FlatList
          data={pastAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderAppointment}
        />
      ) : (
        <Text style={styles.noAppointments}>Geçmiş randevunuz yok.</Text>
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
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vaccineName: {
    fontSize: 14,
    color: '#555',
  },
  date: {
    fontSize: 14,
    color: '#888',
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
