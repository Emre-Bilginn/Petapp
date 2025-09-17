import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Button, TextInput, TouchableOpacity, Alert, FlatList } from 'react-native';
import { doc, getDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Firebase yapılandırmanıza göre ayarlayın
import { auth } from '../../firebaseConfig'; // Firebase Authentication için doğru import

const PetDetails = ({ route, navigation }) => {
  const { petId } = route.params;
  const [pet, setPet] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [isOwner, setIsOwner] = useState(false); // İlan sahibi olup olmadığını kontrol edeceğiz
  const [reports, setReports] = useState([]); // Raporlar
  const [isViewingReports, setIsViewingReports] = useState(false); // Raporları görüntüleme durumu

  useEffect(() => {
    const fetchPetDetails = async () => {
      try {
        const petDocRef = doc(db, 'lost_pets', petId);
        const petDoc = await getDoc(petDocRef);

        if (petDoc.exists()) {
          const petData = petDoc.data();
          setPet(petData);

          const user = auth.currentUser;
          if (user && user.uid === petData.ownerId) {
            setIsOwner(true);  // Kullanıcı ilan sahibiyse, raporları görsün
          }
        } else {
          console.log('İlan bulunamadı');
        }
      } catch (error) {
        console.error('İlan detayları alınırken bir hata oluştu: ', error);
      }
    };

    fetchPetDetails();
  }, [petId]);

  const handleReport = async () => {
    if (!reportReason) {
      alert('Lütfen raporlama nedeni girin.');
      return;
    }

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'reports'), {
        petId,
        reason: reportReason,
        reportedBy: user.uid,  // Raporu yazan kullanıcı bilgisi
        reportedAt: new Date(),
      });

      // Rapor başarıyla kaydedildikten sonra bir alert gösterelim
      Alert.alert('Başarılı', 'İlan başarıyla raporlandı.', [
        { text: 'Tamam', onPress: () => setIsReporting(false) },
      ]);
      setReportReason('');
    } catch (error) {
      console.error('Rapor gönderilirken bir hata oluştu: ', error);
      alert('Bir hata oluştu.');
    }
  };

  const fetchReports = async () => {
    try {
      const q = query(collection(db, 'reports'), where('petId', '==', petId));
      const querySnapshot = await getDocs(q);

      const fetchedReports = [];
      querySnapshot.forEach((doc) => {
        fetchedReports.push(doc.data());
      });
      setReports(fetchedReports);
    } catch (error) {
      console.error('Raporlar alınırken bir hata oluştu: ', error);
    }
  };

  // Kullanıcının adını almak için fonksiyon
  const getUserNameById = async (userId) => {
    try {
      const userDocRef = doc(db, 'Users', userId); // Kullanıcı bilgilerini almak için 'users' koleksiyonuna erişiyoruz
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return userDoc.data().name; // Kullanıcı adı verisini al
      } else {
        return 'Bilinmeyen Kullanıcı'; // Kullanıcı adı bulunamazsa
      }
    } catch (error) {
      console.error('Kullanıcı adı alınırken hata oluştu: ', error);
      return 'Bilinmeyen Kullanıcı';
    }
  };

  if (!pet) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: pet.image }} style={styles.petImage} />
      <Text style={styles.petName}>{pet.name}</Text>
      <Text style={styles.petDescription}>{pet.description}</Text>
      <Text style={styles.contact}>İletişim: {pet.contact}</Text>

      <Button
        title="Ana Sayfaya Dön"
        onPress={() => navigation.goBack()}
      />

      {isOwner ? (
        <>
          {/* Raporları Gör Butonu - Yalnızca ilan sahibi için */}
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => {
              setIsViewingReports(true);
              fetchReports();
            }}
          >
            <Text style={styles.reportButtonText}>Raporları Gör</Text>
          </TouchableOpacity>

          {isViewingReports && (
            <FlatList
              data={reports}
              renderItem={({ item }) => (
                <View style={styles.reportItem}>
                  <Text>Rapor Nedeni: {item.reason}</Text>
                  <Text>Tarih: {item.reportedAt.toDate().toLocaleDateString()}</Text>
                  <Text>Raporu Yazanın Adı: {getUserNameById(item.reportedBy)}</Text> {/* Raporu yazan kişinin adı */}
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />
          )}
        </>
      ) : (
        // Diğer kullanıcılar için rapor et butonu
        <>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setIsReporting(true)}
          >
            <Text style={styles.reportButtonText}>İlanı Rapor Et</Text>
          </TouchableOpacity>

          {isReporting && (
            <View style={styles.reportForm}>
              <Text>Raporlama Nedeni:</Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                style={styles.reportInput}
                placeholder="Raporlama nedeni girin"
              />
              <Button title="Raporu Gönder" onPress={handleReport} />
              <Button title="İptal Et" onPress={() => setIsReporting(false)} />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  petImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 16,
  },
  petName: {
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 8,
  },
  petDescription: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  contact: {
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  reportForm: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
  },
  reportInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 8,
  },
  reportItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
});

export default PetDetails;
