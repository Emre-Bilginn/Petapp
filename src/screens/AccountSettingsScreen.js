import React, { useState } from 'react';
import { Button, Alert, View, Text, TextInput, StyleSheet } from 'react-native';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFirestore, doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

const AccountSettingsScreen = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const auth = getAuth();
  const user = auth.currentUser;
  const db = getFirestore();

  // Kullanıcıya ait verileri sil
  const deleteUserData = async (userId) => {
    const collectionsToDelete = [
      'Chats', 'Pets', 'Users', 'VaccinationSchedules', 'animals', 
      'appointments', 'lost_pets', 'reports'
    ];

    try {
      for (let collectionName of collectionsToDelete) {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        
        // Veri silme işlemini beklemek için Promise.all kullanarak async işlemler yönetilmeli
        const deletePromises = querySnapshot.docs.map((docSnapshot) =>
          deleteDoc(doc(db, collectionName, docSnapshot.id))
        );
        
        await Promise.all(deletePromises);
      }
      console.log("Tüm veriler başarıyla silindi.");
    } catch (error) {
      console.error("Veri silme hatası:", error.message);
      Alert.alert(
        "Veri Silme Hatası",
        "Verileriniz silinemedi. Lütfen tekrar deneyin.",
        [{ text: "Tamam" }]
      );
    }
  };

  // Hesap silme işlemi
  const deleteAccount = async () => {
    // Kullanıcıya onay soralım
    Alert.alert(
      "Hesap Silme",
      "Hesabınızı silmek, tüm verilerinizi kalıcı olarak kaybedecektir. Devam etmek istediğinizden emin misiniz?",
      [
        {
          text: "Hayır",
          onPress: () => console.log("Hesap silme iptal edildi"),
          style: "cancel"
        },
        {
          text: "Evet",
          onPress: async () => {
            try {
              // Kullanıcıyı yeniden doğrulamak için gerekli olan email ve şifreyi alın
              const credential = EmailAuthProvider.credential(user.email, password);

              // Kimlik doğrulaması yapalım
              await reauthenticateWithCredential(user, credential);

              // Kullanıcının Firestore verilerini sil
              await deleteUserData(user.uid);
              // Kullanıcıyı Authentication'dan sil
              await user.delete();
              console.log("Hesap başarıyla silindi.");
              // Çıkış yaptıktan sonra, kullanıcıyı giriş ekranına yönlendir
              navigation.replace('LoginPage');
            } catch (error) {
              console.error("Hesap silme hatası:", error.message);
              if (error.code === 'auth/requires-recent-login') {
                Alert.alert(
                  "Giriş Sorunu",
                  "Hesap silme işlemi için lütfen tekrar giriş yapınız.",
                  [{ text: "Tamam" }]
                );
              } else if (error.code === 'auth/invalid-credential') {
                Alert.alert(
                  "Geçersiz Kimlik Bilgileri",
                  "Lütfen geçerli bir şifre girdiğinizden emin olun.",
                  [{ text: "Tamam" }]
                );
              } else {
                Alert.alert(
                  "Hata",
                  "Hesap silme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.",
                  [{ text: "Tamam" }]
                );
              }
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Hesap Silme</Text>
      <Text style={styles.descriptionText}>
        Hesabınızı silmek, tüm verilerinizi kalıcı olarak kaybedecektir. Devam etmek istediğinizden emin misiniz?
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Mevcut Şifrenizi Girin"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Hesabı Sil" color="#D32F2F" onPress={deleteAccount} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#555',
  },
  input: {
    height: 50,
    width: '80%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    paddingLeft: 10,
  },
});

export default AccountSettingsScreen;
