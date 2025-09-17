// Firebase yapılandırma ve Firestore işlemleri için gerekli importları ekliyoruz
import { db } from '../../firebaseConfig'; // Firebase yapılandırma dosyasını içe aktar
import { collection, addDoc } from 'firebase/firestore'; // Firestore'dan verileri eklemek için gerekli fonksiyonlar

import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, Platform, Modal, FlatList, TouchableOpacity } from 'react-native';
import { getAuth } from 'firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

const VaccinationSchedule = () => {
  const navigation = useNavigation();
  const [petName, setPetName] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const availableHours = [9, 10, 11, 13, 14, 15, 16, 17]; // Çalışma saatleri

  const handleSaveVaccination = async () => {
    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert('Hata', 'Veriyi kaydetmek için giriş yapmalısınız.');
      return;
    }
  
    if (!petName || !vaccineName || !date) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
  
    try {
      const vaccinationData = {
        petName,
        vaccineName,
        date,
        userId: user.uid,
        createdAt: new Date(),
      };
  
      const vaccinationRef = collection(db, 'VaccinationSchedules');
      await addDoc(vaccinationRef, vaccinationData);
  
      Alert.alert('Başarılı', 'Aşı bilgileri başarıyla kaydedildi!');
      setPetName('');
      setVaccineName('');
      setDate(new Date());
    } catch (error) {
      Alert.alert('Hata', 'Aşı bilgilerini kaydetme başarısız oldu.');
      console.error(error.message);
    }
  };
  

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const CustomTimePicker = ({ onTimeSelect }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const generateTimeSlots = () => {
      const slots = [];
      availableHours.forEach((hour) => {
        [0, 20, 40].forEach((minute) => {
          slots.push({ hour, minute });
        });
      });
      return slots;
    };

    const timeSlots = generateTimeSlots();

    const formatTime = (hour, minute) => {
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    return (
      <View>
        <Button title="Saat Seç" onPress={() => setModalVisible(true)} />
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <FlatList
              data={timeSlots}
              keyExtractor={(item) => `${item.hour}:${item.minute}`}
              numColumns={3}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.timeSlot}
                  onPress={() => {
                    const selectedTime = new Date(date);
                    selectedTime.setHours(item.hour);
                    selectedTime.setMinutes(item.minute);
                    setDate(selectedTime);
                    onTimeSelect(selectedTime);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.timeText}>{formatTime(item.hour, item.minute)}</Text>
                </TouchableOpacity>
              )}
            />
            <Button title="İptal" onPress={() => setModalVisible(false)} />
          </View>
        </Modal>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aşı Takvimi</Text>

      <TextInput
        style={styles.input}
        placeholder="Evcil Hayvan Adı"
        value={petName}
        onChangeText={setPetName}
      />

      <TextInput
        style={styles.input}
        placeholder="Aşı Adı"
        value={vaccineName}
        onChangeText={setVaccineName}
      />

      <View style={styles.dateTimeContainer}>
        <Button title="Tarih Seç" onPress={() => setShowDatePicker(true)} />
        <CustomTimePicker onTimeSelect={(selectedTime) => setDate(selectedTime)} />
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          is24Hour={true}
          onChange={onDateChange}
        />
      )}

      <Text style={styles.selectedDate}>
        Seçilen Tarih ve Saat: {date.toLocaleString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}
      </Text>

      <Button title="Aşı Bilgilerini Kaydet" onPress={handleSaveVaccination} />

      {/* Yeni Randevularım Butonu */}
      <View style={styles.buttonContainer}>
        <Button
          title="Randevularım"
          onPress={() => navigation.navigate('Appointments')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  selectedDate: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  modalContainer: {
    height:600,
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center', 
  },
  timeSlot: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f2f2f2',
    borderRadius: 5,
    alignItems: 'center',
    margin: 15,
  },
  timeText: {
    fontSize: 18,
  },
  buttonContainer: {
    marginTop: 20,
  }
});

export default VaccinationSchedule;
