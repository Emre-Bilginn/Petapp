import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { logOut } from '../redux/UserSlice';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const SettingsPage = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const auth = getAuth();
  const db = getFirestore();
  const reduxUser = useSelector((state) => state.user?.user);

  const [profileInfo, setProfileInfo] = useState(() => ({
    name: reduxUser?.displayName || 'Patisever',
    email: reduxUser?.email || 'hesabim@patipartner.app',
    photoURL: reduxUser?.photoURL || null,
  }));

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const current = auth.currentUser;
        if (!current) {
          setProfileInfo({
            name: 'Patisever',
            email: 'hesabim@patipartner.app',
            photoURL: null,
          });
          return;
        }
        try {
          const snap = await getDoc(doc(db, 'Users', current.uid));
          const data = snap.exists() ? snap.data() : {};
          setProfileInfo({
            name: data.name || current.displayName || reduxUser?.displayName || 'Patisever',
            email: data.email || current.email || reduxUser?.email || 'hesabim@patipartner.app',
            photoURL: data.photoURL || current.photoURL || reduxUser?.photoURL || null,
          });
        } catch (error) {
          console.warn('Settings profile load failed:', error);
        }
      };
      loadProfile();
    }, [auth, db, reduxUser?.displayName, reduxUser?.email, reduxUser?.photoURL])
  );


  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
  });

  const displayInfo = useMemo(() => {
    const name = profileInfo.name || 'Patisever';
    const email = profileInfo.email || 'hesabim@patipartner.app';

    return {
      name,
      email,
      initial: name.charAt(0).toUpperCase(),
      photoURL: profileInfo.photoURL || null,
    };
  }, [profileInfo]);

  const handleToggle = (key) => (value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const showComingSoon = (title) => {
    Alert.alert(title, 'Bu bölüm üzerinde çalışıyoruz. Çok yakında aktif olacak.');
  };

  const handleLogOut = () => {
    Alert.alert('Çıkış yap', 'Hesabından çıkmak istediğine emin misin?', [
      {
        text: 'Vazgeç',
        style: 'cancel',
      },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(logOut()).unwrap();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } catch (error) {
            console.error('Log out hatası:', error);
            Alert.alert('Bir şeyler ters gitti', 'Lütfen daha sonra tekrar dene.');
          }
        },
      },
    ]);
  };

  const renderRow = ({ label, value, onPress, rightElement, isLast }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.rowWrapper, isLast && styles.rowLast]}
    >
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowSpacer} />
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {rightElement}
        {onPress && !rightElement ? (
          <FeatherIcon color="#a4acb8" name="chevron-right" size={20} />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarFrame}>
            {displayInfo.photoURL ? (
              <Image source={{ uri: displayInfo.photoURL }} style={styles.profileAvatar} />
            ) : (
              <Text style={styles.avatarInitial}>{displayInfo.initial}</Text>
            )}
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.profileName}>{displayInfo.name}</Text>
            <Text style={styles.profileEmail}>{displayInfo.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <FeatherIcon name="edit-2" size={16} color="#0b6aa2" />
            <Text style={styles.editButtonText}>Profili Düzenle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tercihler</Text>
          <View style={styles.card}>
            {renderRow({
              label: 'Dil',
              value: 'Türkçe (TR)',
              onPress: () => showComingSoon('Dil ayarları'),
            })}
            {renderRow({
              label: 'Konum',
              value: 'İzmir, Türkiye',
              onPress: () => showComingSoon('Konum ayarları'),
            })}
            {renderRow({
              label: 'E-posta bildirimleri',
              rightElement: (
                <Switch
                  value={preferences.emailNotifications}
                  onValueChange={handleToggle('emailNotifications')}
                  trackColor={{ false: '#d7dce3', true: '#0eb37d' }}
                  thumbColor="#ffffff"
                />
              ),
            })}
            {renderRow({
              label: 'Push bildirimleri',
              rightElement: (
                <Switch
                  value={preferences.pushNotifications}
                  onValueChange={handleToggle('pushNotifications')}
                  trackColor={{ false: '#d7dce3', true: '#0eb37d' }}
                  thumbColor="#ffffff"
                />
              ),
            })}
            {renderRow({
              label: 'Karanlık tema',
              rightElement: (
                <Switch
                  value={preferences.darkMode}
                  onValueChange={handleToggle('darkMode')}
                  trackColor={{ false: '#d7dce3', true: '#0eb37d' }}
                  thumbColor="#ffffff"
                />
              ),
              isLast: true,
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek ve kaynaklar</Text>
          <View style={styles.card}>
            {renderRow({
              label: 'Bize Ulaş',
              onPress: () => showComingSoon('Destek'),
            })}
            {renderRow({
              label: 'Hata bildir',
              onPress: () => showComingSoon('Hata bildirme'),
            })}
            {renderRow({
              label: 'App Store puanı',
              onPress: () => showComingSoon('Mağaza bağlantısı'),
            })}
            {renderRow({
              label: 'Sözleşmeler ve gizlilik',
              onPress: () => showComingSoon('Sözleşmeler'),
              isLast: true,
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.card, styles.logoutCard]}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogOut}>
              <FeatherIcon name="log-out" size={18} color="#dc2626" />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.versionText}>Patipartner v2.24 • Yapı 50491</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsPage;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  profileCard: {
    marginTop: 12,
    marginBottom: 24,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  avatarFrame: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 179, 125, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0eb37d',
  },
  profileTextContainer: {
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#041523',
  },
  profileEmail: {
    marginTop: 4,
    fontSize: 15,
    color: 'rgba(6, 24, 40, 0.6)',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(11, 106, 162, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  editButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#0b6aa2',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(6, 24, 40, 0.65)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  rowWrapper: {
    width: '100%',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(6, 24, 40, 0.08)',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#041523',
  },
  rowSpacer: {
    flex: 1,
  },
  rowValue: {
    marginRight: 8,
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.6)',
  },
  logoutCard: {
    paddingHorizontal: 0,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  versionText: {
    fontSize: 13,
    textAlign: 'center',
    color: 'rgba(6, 24, 40, 0.5)',
  },
});
