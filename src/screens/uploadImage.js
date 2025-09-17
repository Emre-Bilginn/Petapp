import { launchImageLibrary } from "react-native-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "../../firebaseConfig";

const uploadImage = async () => {
  // Kullanıcıdan fotoğraf al
  const result = await launchImageLibrary({ mediaType: "photo" });

  if (result.didCancel) return;
  const imageUri = result.assets[0].uri;
  
  try {
    // Firebase Storage'a yükleme
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const filename = `animals/${Date.now()}.jpg`;
    const imageRef = ref(storage, filename);
    await uploadBytes(imageRef, blob);

    // Fotoğrafın URL’sini al
    const imageUrl = await getDownloadURL(imageRef);

    // Firestore'a kaydetme
    await addDoc(collection(db, "animals"), {
      imageUrl,
      description: "Sokakta aç bir köpek gördüm!",
      location: { latitude: 40.12345, longitude: 29.98765 }, // Burayı gerçek konum ile değiştireceğiz
      createdAt: serverTimestamp()
    });

    console.log("Fotoğraf başarıyla yüklendi!");

  } catch (error) {
    console.error("Hata:", error);
  }
};
