import React, { useEffect, useState } from 'react';
import {
  View, Text, Button, Alert, FlatList, StyleSheet,
  Modal, TouchableOpacity, Platform
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db, app } from '../../firebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const VetAppointment = () => {
  const route = useRoute();
  const { vet } = route.params;

  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && selectedDate) fetchAppointments(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (selectedDate && user) fetchAppointments(user);
  }, [selectedDate]);

  const fetchAppointments = async (currentUser) => {
    if (!selectedDate || !currentUser) return;
    try {
      const normalizedVetName = vet.name.trim().toLowerCase();
      const q = query(
        collection(db, 'appointments'),
        where('vetName', '==', normalizedVetName),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);

      const selectedDay = selectedDate.toISOString().split('T')[0];

      const fetchedAppointments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const blocked = fetchedAppointments
        .filter(app => app.isFull && new Date(app.date).toISOString().startsWith(selectedDay))
        .map(app => {
          const d = new Date(app.date);
          return {
            hour: d.getHours(),
            minute: d.getMinutes()
          };
        });

      setBlockedSlots(blocked);
      setAppointments(fetchedAppointments);
    } catch (err) {
      console.error('Randevular yüklenemedi:', err);
    }
  };

  const bookAppointment = async () => {
    if (!user) return Alert.alert('Hata', 'Lütfen önce giriş yapın.');
    if (!selectedDate) return Alert.alert('Hata', 'Lütfen bir tarih ve saat seçin.');

    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();
    const isFull = blockedSlots.some(slot => slot.hour === hour && slot.minute === minute);

    if (isFull) {
      return Alert.alert('Hata', 'Bu saat zaten dolu. Lütfen başka bir saat seçin.');
    }

    try {
      const roundedDate = new Date(selectedDate);
      roundedDate.setSeconds(0);
      roundedDate.setMilliseconds(0);

      const duplicateCheck = query(
        collection(db, 'appointments'),
        where('date', '==', roundedDate.toISOString()),
        where('isFull', '==', true)
      );
      const snapshot = await getDocs(duplicateCheck);
      if (!snapshot.empty) {
        return Alert.alert("Hata", "Bu saat zaten alınmış.");
      }

      let vetIdToUse = vet.uid;
      const normalizedVetName = vet.name.trim().toLowerCase();

      if (!vetIdToUse || vetIdToUse === 'noaccount') {
        const vetQuery = query(
          collection(db, 'veterinarians'),
          where('vetName', '==', normalizedVetName)
        );
        const vetSnapshot = await getDocs(vetQuery);
        if (!vetSnapshot.empty) {
          vetIdToUse = vetSnapshot.docs[0].data().uid;
        } else {
          vetIdToUse = 'noaccount';
        }
      }

      // Bildirim token kısmı kaldırıldı ✅
      await addDoc(collection(db, 'appointments'), {
        userId: user.uid,
        vetId: vetIdToUse,
        vetName: normalizedVetName,
        date: roundedDate.toISOString(),
        isFull: false
      });

      Alert.alert('Başarılı', 'Randevunuz başarıyla alındı.');
      fetchAppointments(user);
    } catch (err) {
      console.error('Randevu alma hatası:', err);
      Alert.alert('Hata', 'Randevu alınamadı.');
    }
  };

  const availableHours = [9, 10, 11, 13, 14, 15, 16, 17];

  const CustomTimePicker = ({ onTimeSelect }) => {
    const timeSlots = [];
    availableHours.forEach(h => [0, 20, 40].forEach(m => timeSlots.push({ hour: h, minute: m })));

    return (
      <View>
        <Button title="Saat Seç" onPress={() => setModalVisible(true)} />
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Saat Seçin</Text>
              <FlatList
                data={timeSlots}
                numColumns={3}
                keyExtractor={item => `${item.hour}:${item.minute}`}
                renderItem={({ item }) => {
                  const isFull = blockedSlots.some(slot => slot.hour === item.hour && slot.minute === item.minute);
                  const isSelected = selectedDate &&
                    selectedDate.getHours() === item.hour &&
                    selectedDate.getMinutes() === item.minute;

                  return (
                    <TouchableOpacity
                      disabled={isFull}
                      onPress={() => {
                        const updated = new Date(selectedDate || new Date());
                        updated.setHours(item.hour, item.minute);
                        updated.setSeconds(0);
                        updated.setMilliseconds(0);
                        setSelectedDate(updated);
                        onTimeSelect(updated);
                        setModalVisible(false);
                      }}
                      style={[
                        styles.timeSlot,
                        isFull ? { backgroundColor: '#ccc' }
                          : isSelected ? { backgroundColor: '#a4c5eb' }
                          : { backgroundColor: '#f0f0f0' }
                      ]}
                    >
                      <Text style={styles.timeText}>
                        {item.hour.toString().padStart(2, '0')}:{item.minute.toString().padStart(2, '0')}
                        {isFull ? ' (Dolu)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <Button title="İptal" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const formatDateTime = (date) =>
    new Date(date).toLocaleString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

  const pastAppointments = appointments.filter(a => new Date(a.date) < new Date());
  const upcomingAppointments = appointments.filter(a => new Date(a.date) >= new Date());

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{vet.name}</Text>

      <View style={styles.dateTimePickerContainer}>
        <Button title="Tarih Seç" onPress={() => setShowDatePicker(true)} />
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                const updated = new Date(date);
                if (selectedDate) {
                  updated.setHours(selectedDate.getHours() || 9);
                  updated.setMinutes(selectedDate.getMinutes() || 0);
                }
                setSelectedDate(updated);
              }
            }}
          />
        )}
      </View>

      <CustomTimePicker onTimeSelect={setSelectedDate} />

      <Text style={styles.selectedDate}>
        {selectedDate ? `Seçilen: ${formatDateTime(selectedDate)}` : 'Henüz bir tarih seçilmedi'}
      </Text>

      <Button title="Randevu Al" onPress={bookAppointment} />

      <Text style={styles.subtitle}>Geçmiş Randevular</Text>
      <FlatList
        data={pastAppointments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.appointmentItem, item.cancelled ? { backgroundColor: '#f0f0f0' } : {}]}>
            <Text style={[styles.appointmentText, item.cancelled ? { color: '#999', textDecorationLine: 'line-through' } : {}]}>
              {formatDateTime(item.date)}
            </Text>
            {item.cancelled && (
              <Text style={{ color: '#dc2626', marginTop: 4 }}>
                Bu randevu veteriner tarafından iptal edilmiştir.
              </Text>
            )}
          </View>
        )}
      />

      <Text style={styles.subtitle}>Gelecek Randevular</Text>
      <FlatList
        data={upcomingAppointments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.appointmentItem, item.cancelled ? { backgroundColor: '#f0f0f0' } : {}]}>
            <Text style={[styles.appointmentText, item.cancelled ? { color: '#999', textDecorationLine: 'line-through' } : {}]}>
              {formatDateTime(item.date)}
            </Text>
            {item.cancelled && (
              <Text style={{ color: '#dc2626', marginTop: 4 }}>
                Bu randevu veteriner tarafından iptal edilmiştir.
              </Text>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  subtitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  selectedDate: { fontSize: 16, textAlign: 'center', marginVertical: 10 },
  appointmentItem: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10 },
  appointmentText: { fontSize: 16 },
  dateTimePickerContainer: { marginBottom: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  timeSlot: { padding: 10, margin: 5, borderRadius: 5, width: 80, alignItems: 'center' },
  timeText: { fontSize: 16 },
});

export default VetAppointment;
