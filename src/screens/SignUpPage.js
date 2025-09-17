// === SignUpPage.js (Güncellenmiş ve indeks hatasız) ===
import { Picker } from '@react-native-picker/picker';
import { createUserWithEmailAndPassword, getAuth, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { useState } from 'react';
import { Image, ImageBackground, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '../../firebaseConfig';
import { CustomButton, CustomTextInput, Loading } from "../components/Index";
//import { getFirestore } from 'firebase/firestore';

const SignUpPage = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  const dispatch = useDispatch();
  const { isLoading } = useSelector(state => state.user);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name,
      });

      await setDoc(doc(db, 'Users', user.uid), {
        name: name,
        email: email,
        role: role,
        password: password,
        createdAt: new Date(),
      });

      if (role === "vet") {
        const firestore = getFirestore();
        const normalizedVetName = name.trim().toLowerCase();

        await setDoc(doc(firestore, 'veterinarians', user.uid), {
          uid: user.uid,
          vetName: normalizedVetName,
          vetGooglePlaceId: "",
          createdAt: new Date(),
        });

        const appointmentsRef = collection(firestore, 'appointments');
        const q = query(
          appointmentsRef,
          where('vetName', '==', normalizedVetName),
          where('vetId', '==', 'noaccount')
        );

        const snapshot = await getDocs(q);

        for (const docItem of snapshot.docs) {
          const appointmentRef = doc(firestore, 'appointments', docItem.id);
          await updateDoc(appointmentRef, {
            vetId: user.uid,
            vetName: normalizedVetName
          });
        }
      }

      console.log("Kayıt başarılı!");
      navigation.navigate("Login");
    } catch (error) {
      console.error("Kayıt hatası:", error.message);
      alert("Kayıt sırasında bir hata oluştu.");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <ImageBackground source={require("../../assets/images/LoginBackground.png")} style={styles.background}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.bg_overlay}>
            <View style={styles.title}>
              <Image style={styles.image} source={require("../../assets/images/signUpIcon.png")} />
              <Text style={styles.signup}>Sign Up</Text>
            </View>

            <View style={styles.textInputContainer}>
              <CustomTextInput
                title="Name"
                isSecureText={false}
                handleOnChangeText={setName}
                handleValue={name}
                handlePlaceHolder={"Enter your name"}
                keyboardType="default"
              />

              <CustomTextInput
                title="E-Mail"
                isSecureText={false}
                handleOnChangeText={setEmail}
                handleValue={email}
                handlePlaceHolder={"Enter your e-mail"}
                keyboardType="email-address"
              />

              <CustomTextInput
                title="Password"
                isSecureText={true}
                handleOnChangeText={setPassword}
                handleValue={password}
                handlePlaceHolder={"Enter your password"}
                keyboardType="default"
              />

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Select Role</Text>
                <Picker
                  selectedValue={role}
                  style={styles.picker}
                  onValueChange={(itemValue) => setRole(itemValue)}
                >
                  <Picker.Item label="User" value="user" />
                  <Picker.Item label="Veterinarian" value="vet" />
                </Picker>
              </View>
            </View>

            <View style={styles.signUpOptions}>
              <CustomButton
                buttonText="Sign Up"
                setWidth="80%"
                handleOnPress={handleRegister}
                buttonColor="green"
                pressedButtonColor="gray"
              />

              <Pressable onPress={() => navigation.navigate("Login")}> 
                <Text style={{ fontWeight: 'bold', color: "white" }}>Already have an account? Login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

export default SignUpPage;

const styles = StyleSheet.create({
  signup: {
    fontWeight: 'bold',
    fontSize: 30,
    marginBottom: 30,
    color: "white"
  },
  title: {
    flex: 2,
    paddingTop: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  textInputContainer: {
    flex: 2,
    width: "100%",
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20
  },
  pickerContainer: {
    marginTop: 20,
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden'
  },
  pickerLabel: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center'
  },
  picker: {
    height: 50,
    width: '100%',
  },
  signUpOptions: {
    flex: 2,
    width: "100%",
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  image: {
    width: 130,
    height: 130,
    marginBottom: 20,
    tintColor: "white"
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  bg_overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});
