import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const MainPage = () => {
  const navigation = useNavigation();

  const quickActions = [
    { id: '1', title: 'Veteriner Bul', icon: '🐶' },
    { id: '2', title: 'Aşı Takvimi', icon: '💉' },
    { id: '3', title: 'Beslenme', icon: '🥗' },
    { id: '4', title: 'Hayvan Gelişim', icon: '🐾' },
    { id: '5', title: 'Veteriner Randevu Al', icon: '📅' },
    { id: '6', title: 'Randevularım', icon: '📜' },
    { id: '7', title: 'Sokak Hayvanları', icon: '📍' },
    { id: '8', title: 'Kayıp Hayvan İlanı Oluşturma', icon: '🔍' },
    { id: '9', title: 'Kayıp Hayvan İlan Listesi',icon: '📋'},
    { id: '10', title: 'Bağış Yap', icon: '❤️' },
    { id: '11', title: 'Hastalık Tahmini', icon: '🧬' }

  ];

  const handlePress = (action) => {
    switch (action.title) {
      case 'Veteriner Bul':
        navigation.navigate('Map');
        break;
      case 'Aşı Takvimi':
        navigation.navigate('Asi');
        break;
      case 'Beslenme':
        navigation.navigate('Beslenme');
        break;
      case 'Hayvan Gelişim':
        navigation.navigate('PetGrowthTracker');
        break;
      case 'Veteriner Randevu Al':
        navigation.navigate('VeterinarianList');
        break;
      case 'Randevularım':
        navigation.navigate('AppointmentScreen');
        break;
      case 'Sokak Hayvanları':
        navigation.navigate('StreetAnimalsMap');
        break;
      case 'Kayıp Hayvan İlanı Oluşturma':
        navigation.navigate('AddLostPetScreen');
        break;
      case 'Kayıp Hayvan İlan Listesi':
        navigation.navigate('LostPetsList');
        break;
      case 'Bağış Yap':
        navigation.navigate('DonationPage');
        break;
      case 'Hastalık Tahmini':
        navigation.navigate('Guess');
        break;
      default:
        console.warn('Bilinmeyen işlem');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hoş geldin, Emre! 🐾</Text>
      <FlatList
        data={quickActions}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.title}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FAFAFA' },
  greeting: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 6,
  },
  icon: { fontSize: 36, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '600' },
});

export default MainPage;
