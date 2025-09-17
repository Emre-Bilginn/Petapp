import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Button, Alert, Modal, TouchableOpacity
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {logOut} from '../redux/UserSlice';
import { useDispatch } from 'react-redux';
import { getAuth } from 'firebase/auth';
import {
  getFirestore, collection, query, where, getDocs,
  updateDoc, addDoc, doc
} from 'firebase/firestore';

const VetDashboard = () => {
  const [blockedAppointments, setBlockedAppointments] = useState([]);
  const [userAppointments, setUserAppointments] = useState([]);
  const [showPickerMode, setShowPickerMode] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const auth = getAuth();
  const db = getFirestore();

  const availableHours = [9, 10, 11, 13, 14, 15, 16, 17];

  const dispatch = useDispatch();

  const handleLogOut = () => {
    dispatch(logOut())
      .then(() => {})
      .catch((error) => {
        console.error("Log out hatası: ", error);
      });
  };

  const fetchAppointments = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(collection(db, 'appointments'), where('vetId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const now = new Date();

      const all = querySnapshot.docs.map(docItem => {
        const data = docItem.data();
        return {
          id: docItem.id,
          ...data,
          dateObj: new Date(data.date)
        };
      });

      const blocked = all.filter(item => item.userId === 'blocked')
        .sort((a, b) => a.dateObj - b.dateObj);

      const upcomingUsers = all.filter(item =>
        item.userId !== 'blocked' &&
        !item.cancelled &&
        !isNaN(item.dateObj) &&
        item.dateObj > now
      );

      setBlockedAppointments(blocked);
      setUserAppointments(upcomingUsers);
    } catch (error) {
      console.error('Randevular alınamadı:', error);
    }
  };

  const markAsFull = async (id) => {
    try {
      await updateDoc(doc(db, 'appointments', id), { isFull: true });
      Alert.alert('Başarılı', 'Randevu dolu olarak işaretlendi.');
      fetchAppointments();
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'İşlem başarısız.');
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await updateDoc(doc(db, 'appointments', appointmentId), {
        isFull: false,
        cancelled: true
      });
      Alert.alert('Başarılı', 'Randevu iptal edildi.');
      fetchAppointments();
    } catch (error) {
      console.error('İptal hatası:', error);
      Alert.alert('Hata', 'Randevu iptal edilemedi.');
    }
  };

  const blockSelectedDate = async () => {
  try {
    const user = auth.currentUser;
    if (!user || !selectedDate) return;

    const roundedDate = new Date(selectedDate);
    roundedDate.setSeconds(0);
    roundedDate.setMilliseconds(0);
    const isoDate = roundedDate.toISOString();

    const checkQuery = query(
      collection(db, 'appointments'),
      where('vetId', '==', user.uid),
      where('date', '==', isoDate),
      where('userId', '!=', 'blocked')
    );

    const existing = await getDocs(checkQuery);
    const activeAppointments = existing.docs.filter(docSnap => !docSnap.data().cancelled);

    if (activeAppointments.length > 0) {
      Alert.alert("Uyarı", "Bu saat kullanıcı tarafından alınmış. Önce randevuyu iptal edin.");
      return;
    }

    await addDoc(collection(db, 'appointments'), {
      userId: 'blocked',
      vetId: user.uid,
      vetName: user.displayName || 'Veteriner',
      date: isoDate,
      isFull: true
    });

    Alert.alert('Başarılı', 'Saat dolu olarak işaretlendi.');
    setModalVisible(false);
    setSelectedDate(new Date());
    fetchAppointments();
  } catch (err) {
    console.error(err);
    Alert.alert('Hata', 'Kayıt başarısız.');
  }
};


  useEffect(() => {
    fetchAppointments();
  }, []);

  const formatDateTime = (date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Geçersiz Tarih';
      return d.toLocaleString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
    } catch {
      return 'Geçersiz';
    }
  };

  const handleDateChange = (_, date) => {
    if (!date) return;
    setShowPickerMode(null);
    const updated = new Date(selectedDate);
    if (showPickerMode === 'date') {
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    } else if (showPickerMode === 'time') {
      updated.setHours(date.getHours());
      updated.setMinutes(date.getMinutes());
    }
    setSelectedDate(updated);
  };

  const CustomTimePicker = () => {
    const timeSlots = [];
    availableHours.forEach(h => [0, 20, 40].forEach(m => timeSlots.push({ hour: h, minute: m })));

    return (
      <Modal visible={showTimePickerModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Saat Seçin</Text>
            <FlatList
              data={timeSlots}
              numColumns={3}
              keyExtractor={item => `${item.hour}:${item.minute}`}
              renderItem={({ item }) => {
                const isSelected =
                  selectedDate.getHours() === item.hour &&
                  selectedDate.getMinutes() === item.minute;

                return (
                  <TouchableOpacity
                    onPress={() => {
                      const updated = new Date(selectedDate);
                      updated.setHours(item.hour, item.minute);
                      updated.setSeconds(0);
                      updated.setMilliseconds(0);
                      setSelectedDate(updated);
                      setShowTimePickerModal(false);
                    }}
                    style={[
                      styles.timeSlot,
                      isSelected ? { backgroundColor: '#a4c5eb' } : { backgroundColor: '#f0f0f0' }
                    ]}
                  >
                    <Text style={styles.timeText}>
                      {item.hour.toString().padStart(2, '0')}:{item.minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <Button title="İptal" color="gray" onPress={() => setShowTimePickerModal(false)} />
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Veteriner Paneli - Randevular</Text>
      <Button title="Yeni Dolu Saat Ekle" onPress={() => setModalVisible(true)} />

      <Text style={styles.subtitle}>Manuel Bloklanan Saatler</Text>
      <FlatList
        data={blockedAppointments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>{formatDateTime(item.date)} - Dolu</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Henüz bloklanan saat yok.</Text>}
      />

      <Text style={styles.subtitle}>Kullanıcı Randevuları (Yaklaşan)</Text>
      <FlatList
        data={userAppointments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>{formatDateTime(item.date)}</Text>
            <Button title="İptal Et" color="#dc2626" onPress={() => cancelAppointment(item.id)} />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Yaklaşan kullanıcı randevusu yok.</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tarih ve Saat Seç</Text>

            <Button title="Tarih Seç" onPress={() => setShowPickerMode('date')} />
            <Button title="Saat Seç" onPress={() => setShowTimePickerModal(true)} />

            {showPickerMode && (
              <DateTimePicker
                value={selectedDate}
                mode={showPickerMode}
                is24Hour={true}
                display="default"
                onChange={handleDateChange}
              />
            )}

            <CustomTimePicker />
            <Text style={styles.selectedDateText}>
              Seçilen: {formatDateTime(selectedDate)}
            </Text>

            <Button title="Kaydet" onPress={blockSelectedDate} />
            <Button title="İptal" color="gray" onPress={() => {
              setModalVisible(false);
              setSelectedDate(new Date());
            }} />
          </View>
        </View>
      </Modal>

      <View style={styles.section}>
        <View style={styles.sectionBody}>
          <View
            style={[
              styles.rowWrapper,
              styles.rowFirst,
              styles.rowLast,
              { alignItems: 'center' },
            ]}>
            <TouchableOpacity
              onPress={handleLogOut}
              style={styles.row}>
              <Text style={[styles.rowLabel, styles.rowLabelLogout]}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  subtitle: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  item: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  itemText: { fontSize: 16 },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 20 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  selectedDateText: { fontSize: 16, color: '#333', marginVertical: 10 },
  timeSlot: { padding: 10, margin: 5, borderRadius: 5, width: 80, alignItems: 'center' },
  timeText: { fontSize: 16 },
  section: { paddingVertical: 12 },
  sectionBody: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  row: {
    height: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    letterSpacing: 0.24,
    color: '#000',
  },
  rowWrapper: {
    paddingLeft: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
  },
  rowFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  rowLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  rowLabelLogout: {
    width: '100%',
    textAlign: 'center',
    fontWeight: '600',
    color: '#dc2626',
  },
});

export default VetDashboard;
