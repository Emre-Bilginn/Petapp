import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  Image,
} from 'react-native';

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
    logo: 'https://yt3.googleusercontent.com/ytc/AIdro_mkJvUgqlzAkQxJX_1-e4lZba81JEdkm0sCVAZYByNdoQ=s160-c-k-c0x00ffffff-no-rj',
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
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Ahbap-Logo.svg/1200px-Ahbap-Logo.svg.png',
  },
  {
    id: '7',
    name: 'HİPDER',
    description: 'Hayvanlar İçin Projeler Derneği',
    url: 'https://hipder.org/bagisci-ol/',
    logo: 'https://hipder.org/wp-content/uploads/2022/06/hipder_LOGO-removebg-preview.png',
  },
  {
    id: '8',
    name: 'Melekler Şehri Derneği',
    description: 'Sokak Hayvanlarını Koruma Derneği',
    url: 'https://www.meleklersehridernegi.org.tr/bagis',
    logo: 'https://www.meleklersehridernegi.org.tr/wp-content/uploads/2020/08/logo1.png',
  },
  {
    id: '9',
    name: 'Haysev',
    description: 'Hayvanları Sev Derneği',
    url: 'https://www.haysev-dernegi.com/bagis',
    logo: 'https://static.wixstatic.com/media/9e29ab_cd76fd8c6c6c43e5ba08155cb46e6d8d~mv2.jpg/v1/fill/w_1225,h_379,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/138208977_10159014739289182_358863332296.jpg',
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

  const handleDonation = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      Linking.openURL(url);
      setThankYouVisible(true);
    } else {
      alert('Bağlantı açılamıyor: ' + url);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.logo }} style={styles.logo} />
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => handleDonation(item.url)}
      >
        <Text style={styles.buttonText}>Bağış Yap</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Hayvanlara Destek Ol</Text>
      <FlatList
        data={donationOrganizations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
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
            <Pressable style={styles.closeButton} onPress={() => setThankYouVisible(false)}>
              <Text style={styles.buttonText}>Tamam</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DonationPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFF',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fdfdfd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 10,
    borderRadius: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
  },
  thankYouTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  thankYouText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
