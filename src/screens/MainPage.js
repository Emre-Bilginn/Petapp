import { SafeAreaView } from 'react-native-safe-area-context';
﻿import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

const quickActions = [
  {
    id: 'find-vet',
    title: 'Veteriner Bul',
    subtitle: 'Yakındaki klinikleri haritada incele',
    icon: '🐾',
    accent: '#fbe8d3',
    route: 'Map',
  },
  {
    id: 'vaccine-schedule',
    title: 'Aşı Takvimi',
    subtitle: 'Aşı günlerini hatırlat',
    icon: '💉',
    accent: '#d7ecff',
    route: 'Asi',
  },
  {
    id: 'nutrition',
    title: 'Beslenme',
    subtitle: 'Mama ve menü önerileri',
    icon: '🥗',
    accent: '#e7f7d7',
    route: 'Beslenme',
  },
  {
    id: 'pet-growth',
    title: 'Hayvan Gelişim',
    subtitle: 'Gelişim kayıtlarını tut',
    icon: '📈',
    accent: '#f5e6fe',
    route: 'PetGrowthTracker',
  },
  {
    id: 'book-vet',
    title: 'Veteriner Randevu Al',
    subtitle: 'Müsait slotları incele',
    icon: '📅',
    accent: '#ffe8ef',
    route: 'VeterinarianList',
  },
  {
    id: 'appointments',
    title: 'Randevularım',
    subtitle: 'Yaklaşan ziyaretleri gör',
    icon: '🗂️',
    accent: '#fdecc8',
    route: 'AppointmentScreen',
  },
  {
    id: 'street-animals',
    title: 'Sokak Hayvanları',
    subtitle: 'Harita üzerinden bildir',
    icon: '📍',
    accent: '#e3f6ff',
    route: 'StreetAnimalsMap',
  },
  {
    id: 'lost-create',
    title: 'Kayıp Hayvan İlanı',
    subtitle: 'Kayıp dostunu duyur',
    icon: '🔍',
    accent: '#f7eddc',
    route: 'AddLostPetScreen',
  },
  {
    id: 'lost-list',
    title: 'Kayıp İlanlarım',
    subtitle: 'Yayınladığın duyurular',
    icon: '📋',
    accent: '#e1f0ff',
    route: 'LostPetsList',
  },
  {
    id: 'donation',
    title: 'Bağış Yap',
    subtitle: 'Patili dostlara destek ol',
    icon: '❤️',
    accent: '#ffe0e9',
    route: 'DonationPage',
  },
  {
    id: 'symptom-checker',
    title: 'Hastalık Tahmini',
    subtitle: 'Belirtileri kontrol et',
    icon: '🩺',
    accent: '#e8f4ff',
    route: 'Guess',
  },
];

const MainPage = () => {
  const navigation = useNavigation();
  const user = useSelector((state) => state.user?.user);

  const displayName = useMemo(() => {
    if (!user) {
      return 'Misafir';
    }

    if (user.displayName) {
      return user.displayName.split(' ')[0];
    }

    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'Misafir';
  }, [user]);

  const handlePress = (action) => {
    if (action.route) {
      navigation.navigate(action.route);
      return;
    }

    Alert.alert('Yakında', 'Bu özellik üzerinde çalışıyoruz.');
  };

  const renderAction = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => handlePress(item)}
      android_ripple={{ color: 'rgba(14, 179, 125, 0.12)' }}
    >
      <View style={[styles.iconBadge, { backgroundColor: item.accent }]}> 
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.subtitle ? <Text style={styles.cardSubtitle}>{item.subtitle}</Text> : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.greeting}>Hoş geldin, {displayName}!</Text>
            <Text style={styles.subGreeting}>Bugün dostun için ne yapmak istersin?</Text>
          </View>
        </View>

        <FlatList
          data={quickActions}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderAction}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerCard: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    marginBottom: 20,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#041523',
  },
  subGreeting: {
    marginTop: 6,
    fontSize: 15,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 150,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.6)',
  },
});

export default MainPage;

