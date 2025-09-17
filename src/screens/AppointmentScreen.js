import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db, app } from '../../firebaseConfig';

const AppointmentScreen = () => {
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchAppointments(currentUser.uid);
      } else {
        setUser(null);
      }
    });
    return unsubscribe;
  }, []);

  const fetchAppointments = async (userId) => {
    if (!userId) return;
    try {
      const q = query(collection(db, 'appointments'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const fetchedAppointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAppointments(fetchedAppointments);
    } catch (error) {
      console.error('Randevular yüklenirken hata oluştu:', error);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Zamana göre sıralama
  const pastAppointments = appointments
    .filter(appt => new Date(appt.date) < new Date())
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // En yeni tarih en üstte

  const upcomingAppointments = appointments
    .filter(appt => new Date(appt.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // En yakın tarih en üstte

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Randevularım</Text>

      <Text style={styles.subtitle}>Gelecek Randevular</Text>
      <FlatList
        data={upcomingAppointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.appointmentItem}>
            <Text style={styles.appointmentText}>{formatDateTime(item.date)}</Text>
            <Text style={styles.vetName}>Veteriner: {item.vetName}</Text>
          </View>
        )}
      />

      <Text style={styles.subtitle}>Geçmiş Randevular</Text>
      <FlatList
        data={pastAppointments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.appointmentItem}>
            <Text style={styles.appointmentText}>{formatDateTime(item.date)}</Text>
            <Text style={styles.vetName}>Veteriner: {item.vetName}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  appointmentItem: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentText: {
    fontSize: 16,
    color: '#555',
  },
  vetName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default AppointmentScreen;
