import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from 'firebase/auth';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { CustomButton, CustomTextInput } from '../components/Index';

const PasswordResetScreen = ({ route, navigation }) => {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;

  const initialMode = useMemo(() => {
    if (route?.params?.mode) {
      return route.params.mode;
    }
    return user ? 'change' : 'forgot';
  }, [route?.params?.mode, user]);

  const [mode] = useState(initialMode);
  const isChangePassword = mode === 'change';

  const [email, setEmail] = useState(route?.params?.email || user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};

    if (isChangePassword) {
      if (!currentPassword.trim()) {
        nextErrors.currentPassword = 'Mevcut şifreni yazmalısın.';
      }

      if (!newPassword.trim()) {
        nextErrors.newPassword = 'Yeni şifreni yazmalısın.';
      } else if (newPassword.trim().length < 6) {
        nextErrors.newPassword = 'Şifre en az 6 karakter olmalı.';
      } else if (newPassword.trim() === currentPassword.trim()) {
        nextErrors.newPassword = 'Yeni şifre eski şifreyle aynı olamaz.';
      }
    } else {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        nextErrors.email = 'E-posta adresini yazmalısın.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        nextErrors.email = 'Lütfen geçerli bir e-posta adresi yaz.';
      }
    }

    return nextErrors;
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        'E-posta gönderildi',
        `${trimmedEmail} adresine şifre sıfırlama bağlantısı gönderdik.`
      );
      setEmail('');
      navigation?.goBack?.();
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      const message =
        error.code === 'auth/user-not-found'
          ? 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.'
          : 'Şifre sıfırlama bağlantısı gönderilirken bir sorun oluştu. Lütfen tekrar dene.';
      Alert.alert('Hata', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Hata', 'Şifreyi güncellemek için önce e-posta ile giriş yapmalısın.');
      return;
    }

    try {
      setIsLoading(true);
      const credential = EmailAuthProvider.credential(user.email, currentPassword.trim());
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword.trim());

      await updateDoc(doc(db, 'Users', user.uid), {
        passwordUpdated: new Date(),
      });

      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Başarılı', 'Şifren başarıyla değiştirildi.');
      navigation?.goBack?.();
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      const message =
        error.code === 'auth/wrong-password'
          ? 'Mevcut şifreyi yanlış girdin.'
          : error.code === 'auth/too-many-requests'
          ? 'Çok fazla deneme yaptın. Bir süre sonra tekrar dene.'
          : 'Şifre değiştirilirken bir sorun oluştu. Tekrar dene.';
      Alert.alert('Hata', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (isChangePassword) {
      handleChangePassword();
    } else {
      handleForgotPassword();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle='dark-content' backgroundColor='#f6f9fc' />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.overlay}>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isChangePassword ? 'Şifreni Güncelle' : 'Şifreni Sıfırla'}
                </Text>
                <Text style={styles.subtitle}>
                  {isChangePassword
                    ? 'Güvenlik için mevcut şifreni doğrula ve yeni bir şifre belirle.'
                    : 'Kayıtlı e-posta adresine bir sıfırlama bağlantısı gönderelim.'}
                </Text>
              </View>

              {isChangePassword ? (
                <>
                  <CustomTextInput
                    title='Mevcut Şifre'
                    isSecureText
                    handleOnChangeText={setCurrentPassword}
                    handleValue={currentPassword}
                    handlePlaceHolder='Mevcut şifren'
                    helperText='Son girişte kullandığın şifre.'
                    error={errors.currentPassword}
                    textContentType='password'
                    containerStyle={styles.inputWrapper}
                  />

                  <CustomTextInput
                    title='Yeni Şifre'
                    isSecureText
                    handleOnChangeText={setNewPassword}
                    handleValue={newPassword}
                    handlePlaceHolder='Yeni şifren'
                    helperText='En az 6 karakter, tercihen harf ve rakam kombinasyonu.'
                    error={errors.newPassword}
                    textContentType='newPassword'
                    containerStyle={styles.inputWrapper}
                  />

                  <View style={styles.helperBox}>
                    <Text style={styles.helperTitle}>İpucu</Text>
                    <Text style={styles.helperText}>
                      Şifreni düzenli aralıklarla değiştir ve farklı hesaplarda aynı şifreyi kullanmamaya çalış.
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <CustomTextInput
                    title='E-Posta'
                    isSecureText={false}
                    handleOnChangeText={setEmail}
                    handleValue={email}
                    handlePlaceHolder='E-posta adresin'
                    helperText='Sıfırlama bağlantısı bu adrese gönderilecek.'
                    error={errors.email}
                    keyboardType='email-address'
                    autoCapitalize='none'
                    autoCorrect={false}
                    textContentType='emailAddress'
                    containerStyle={styles.inputWrapper}
                  />

                  <View style={styles.helperBox}>
                    <Text style={styles.helperTitle}>Nasıl çalışır?</Text>
                    <Text style={styles.helperText}>
                      E-postanı gönderdiğinde birkaç dakika içinde şifre sıfırlama bağlantısı alırsın. Gelen kutunu ve spam klasörünü kontrol etmeyi unutma.
                    </Text>
                  </View>
                </>
              )}

              <CustomButton
                buttonText={
                  isLoading
                    ? isChangePassword
                      ? 'Şifre güncelleniyor...'
                      : 'E-posta gönderiliyor...'
                    : isChangePassword
                    ? 'Şifreyi Güncelle'
                    : 'Sıfırlama Bağlantısı Gönder'
                }
                setWidth='100%'
                handleOnPress={handleSubmit}
                buttonColor='#0eb37d'
                pressedButtonColor='#0a8c61'
                isDisabled={isLoading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PasswordResetScreen;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#041523',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.65)',
    lineHeight: 20,
  },
  inputWrapper: {
    width: '100%',
  },
  helperBox: {
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(11, 106, 162, 0.08)',
  },
  helperTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b6aa2',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.75)',
    lineHeight: 18,
  },
});
