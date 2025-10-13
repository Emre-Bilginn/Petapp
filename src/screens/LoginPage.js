import { SafeAreaView } from 'react-native-safe-area-context';
﻿import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { CustomButton, CustomTextInput, Loading } from '../components/Index';
import { autoLogin, login, setIsLoading } from '../redux/UserSlice';

const LoginPage = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');

  const { isLoading } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(autoLogin());
  }, [dispatch]);

  const validate = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Lütfen e-posta adresini gir.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Lütfen geçerli bir e-posta adresi yaz.';
    }

    if (!password) {
      nextErrors.password = 'Lütfen şifreni gir.';
    } else if (password.length < 6) {
      nextErrors.password = 'Şifre en az 6 karakter olmalı.';
    }

    return nextErrors;
  };

  const handleLogin = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setAuthError('');

    try {
      await dispatch(login({ email: email.trim().toLowerCase(), password })).unwrap();
    } catch (error) {
      setAuthError('Giriş yapılamadı. Bilgilerini kontrol edip tekrar dene.');
    }
  };

  const handleForgotPassword = () => {
    const availableRoutes = navigation?.getState?.()?.routeNames ?? [];

    if (availableRoutes.includes('PasswordResetScreen')) {
      navigation.navigate('PasswordResetScreen', { mode: 'forgot' });
    } else {
      Alert.alert(
        'Şifremi Unuttum',
        'Şifre sıfırlama özelliğine şu an ulaşamıyoruz. Lütfen destek ekibimizle iletişime geç.'
      );
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/LoginBackground.png')}
      style={styles.background}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.overlay}>
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.welcome}>Tekrar Hoş Geldin</Text>
                  <Text style={styles.subtitle}>
                    Dostunun bakımına devam etmek için giriş yap.
                  </Text>
                </View>

                <Image
                  source={require('../../assets/images/loginicon.png')}
                  style={styles.image}
                />

                <View style={styles.form}>
                  <CustomTextInput
                    title="E-Posta"
                    isSecureText={false}
                    handleOnChangeText={setEmail}
                    handleValue={email}
                    handlePlaceHolder="E-postanı gir"
                    helperText="E-postanı kimseyle paylaşmayacağız."
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                    containerStyle={styles.inputWrapper}
                  />

                  <CustomTextInput
                    title="Şifre"
                    isSecureText
                    handleOnChangeText={setPassword}
                    handleValue={password}
                    handlePlaceHolder="Şifreni gir"
                    helperText="En az 6 karakter kullan."
                    error={errors.password}
                    textContentType="password"
                    containerStyle={styles.inputWrapper}
                  />

                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    style={styles.forgotPassword}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotPasswordText}>Şifreni mi unuttun?</Text>
                  </TouchableOpacity>

                  {authError ? (
                    <Text style={styles.authError}>{authError}</Text>
                  ) : null}

                  <CustomButton
                    buttonText="Giriş Yap"
                    setWidth="100%"
                    handleOnPress={handleLogin}
                    buttonColor="#2fbf71"
                    pressedButtonColor="#24975a"
                  />

                  <View style={styles.signUpRow}>
                    <Text style={styles.signUpLabel}>
                      Aramızda yeni misin?
                      {' '}
                      <Text
                        style={styles.signUpLink}
                        onPress={() => navigation.navigate('Signup')}
                      >
                        Hemen hesap aç
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>

              {isLoading ? (
                <Loading changeIsLoading={() => dispatch(setIsLoading(false))} />
              ) : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView> 
      </SafeAreaView>
    </ImageBackground>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 36,
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 21, 35, 0.3)',
  },
  card: {
    width: '92%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 26,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 7,
  },
  header: {
    alignItems: 'center',
  },
  welcome: {
    fontWeight: '700',
    color: '#041523',
    fontSize: 30,
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(6, 24, 40, 0.75)',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  image: {
    width: 128,
    height: 128,
    marginVertical: 18,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  inputWrapper: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#1e5c7a',
    fontWeight: '600',
  },
  authError: {
    color: '#e53935',
    fontSize: 13,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  signUpRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpLabel: {
    color: 'rgba(6, 24, 40, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  signUpLink: {
    color: '#0b6aa2',
    fontWeight: '700',
  },
});


