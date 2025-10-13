import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const donationOrganizations = [
  {
    id: '1',
    name: 'HAYTAP',
    description: 'Hayvan Hakları Federasyonu',
    url: 'https://www.haytap.org/tr/online-bagis',
    logo: 'https://www.haytap.org/images/logo.png',
  },
  {
    id: '2',
    name: 'THKD',
    description: 'Türkiye Hayvanları Koruma Derneği',
    url: 'https://www.thkd.org.tr/bagis',
    logo:
      'https://yt3.googleusercontent.com/ytc/AIdro_mkJvUgqlzAkQxJX_1-e4lZba81JEdkm0sCVAZYByNdoQ=s160-c-k-c0x00ffffff-no-rj',
  },
  {
    id: '3',
    name: 'Empati Derneği',
    description: 'Sosyal Sorumluluk ve Eğitim Derneği',
    url: 'https://fonzip.com/empatidernegi/bagis',
    logo: 'https://logowik.com/content/uploads/images/883_empatidernegi.jpg',
  },
  {
    id: '4',
    name: 'Haçiko',
    description: 'Hayvanları Çaresizlik ve İlgisizlikten Koruma Derneği',
    url: 'https://fonzip.com/haciko/bagis',
    logo: 'https://haciko.org.tr/view/default/assets/img/Logo_Yatay.png',
  },
  {
    id: '5',
    name: 'Cansuyu Derneği',
    description: 'İnsani Yardım ve Dayanışma Derneği',
    url: 'https://cansuyu.org.tr/bagis',
    logo: 'https://cansuyu.org.tr/rsm/logo/logo_tr.png',
  },
  {
    id: '6',
    name: 'Ahbap',
    description: 'Sosyal Yardımlaşma ve Dayanışma Derneği',
    url: 'https://ahbap.org/bagisci-ol',
    logo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Ahbap-Logo.svg/1200px-Ahbap-Logo.svg.png',
  },
  {
    id: '7',
    name: 'HİPDER',
    description: 'Hayvanlar İçin Projeler Derneği',
    url: 'https://hipder.org/bagisci-ol/',
    logo:
      'https://hipder.org/wp-content/uploads/2022/06/hipder_LOGO-removebg-preview.png',
  },
  {
    id: '8',
    name: 'Melekler Şehri Derneği',
    description: 'Sokak Hayvanlarını Koruma Derneği',
    url: 'https://www.meleklersehridernegi.org.tr/bagis',
    logo:
      'https://www.meleklersehridernegi.org.tr/wp-content/uploads/2020/08/logo1.png',
  },
  {
    id: '9',
    name: 'Haysev',
    description: 'Hayvanları Sev Derneği',
    url: 'https://www.haysev-dernegi.com/bagis',
    logo:
      'https://static.wixstatic.com/media/9e29ab_cd76fd8c6c6c43e5ba08155cb46e6d8d~mv2.jpg/v1/fill/w_1225,h_379,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/138208977_10159014739289182_358863332296.jpg',
  },
  {
    id: '10',
    name: 'Patilibahçe Derneği',
    description: 'Sokak Hayvanlarını Koruma Derneği',
    url: 'https://patilibahce.org/bagis',
    logo: 'https://patilibahce.org/img/logo-small2.png',
  },
];

const DonationPage = () => {
  const [thankYouVisible, setThankYouVisible] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return donationOrganizations;
    return donationOrganizations.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.description?.toLowerCase?.().includes(q) ?? false)
    );
  }, [query]);

  const handleDonation = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        setThankYouVisible(true);
      } else {
        Alert.alert('Bağlantı açılamıyor', url);
      }
    } catch (e) {
      Alert.alert('Bağlantı hatası', 'Tarayıcı açılamadı. Paylaşmayı deneyebilirsin.');
    }
  }, []);

  const shareLink = useCallback(async (org) => {
    try {
      await Share.share({
        message: `${org.name} bağış sayfası: ${org.url}`,
      });
    } catch {
      // sessiz geç
    }
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Image
          source={{ uri: item.logo }}
          style={styles.logo}
          resizeMode="contain"
          onError={() => {}}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Güvenilir</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryBtn]}
          onPress={() => handleDonation(item.url)}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Bağış Yap</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryBtn]}
          onPress={() => shareLink(item)}
          activeOpacity={0.9}
        >
          <Text style={styles.secondaryBtnText}>Paylaş</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <View style={styles.container}>
        <Text style={styles.header}>Hayvanlara Destek Ol</Text>
        <Text style={styles.subHeader}>
          Güvendiğimiz STK’lara hızlıca bağış yapabilir, linki paylaşarak daha fazla desteğe öncülük edebilirsin.
        </Text>

        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Kurum ara (örn: HAYTAP, Ahbap)"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Sonuç yok</Text>
              <Text style={styles.emptyText}>
                Farklı bir anahtar kelime dener misin?
              </Text>
            </View>
          }
        />

        {/* Teşekkür Modalı */}
        <Modal
          visible={thankYouVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setThankYouVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.thankYouTitle}>Teşekkürler! ❤️</Text>
              <Text style={styles.thankYouText}>
                Bugün bir can dostunun hayatına umut oldun.
              </Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setThankYouVisible(false)}
              >
                <Text style={styles.buttonText}>Tamam</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default DonationPage;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f9fc' },
  container: { flex: 1, padding: 16 },

  header: { fontSize: 22, fontWeight: '700', color: '#041523' },
  subHeader: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(6,24,40,0.65)',
    marginBottom: 12,
  },

  searchBox: {
    marginBottom: 12,
    backgroundColor: 'rgba(6,24,40,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    fontSize: 14,
    color: '#041523',
    paddingVertical: 6,
  },

  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#eef3f7',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#041523' },
  description: { marginTop: 2, fontSize: 12, color: 'rgba(6,24,40,0.65)' },

  badge: {
    marginLeft: 8,
    backgroundColor: 'rgba(14,179,125,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0a8c61' },

  actions: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  primaryBtn: {
    backgroundColor: '#0b6aa2',
    marginRight: 8,
    flex: 1,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#e2e8f0',
    flex: 1,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryBtnText: { color: '#041523', fontWeight: '700' },

  emptyBox: {
    marginTop: 24,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#041523' },
  emptyText: { marginTop: 6, fontSize: 13, color: 'rgba(6,24,40,0.65)' },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(4,21,35,0.45)',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: 320,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
  },
  thankYouTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#041523' },
  thankYouText: { fontSize: 14, textAlign: 'center', marginBottom: 14, color: 'rgba(6,24,40,0.8)' },
  closeButton: {
    backgroundColor: '#0a8c61',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
