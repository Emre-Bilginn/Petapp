import { 
    StyleSheet,
    Text, 
    View,
    KeyboardAvoidingView, 
    ScrollView,
    Image,
    ImageBackground
  } from 'react-native';
  import React, { useEffect, useState } from 'react';
  import { Loading, CustomTextInput, CustomButton } from "../components/Index";
  import { login, autoLogin, setIsLoading } from '../redux/UserSlice';
  import { useSelector, useDispatch } from 'react-redux';
  
  const LoginPage = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
  
    const { isLoading } = useSelector((state) => state.user);
    const dispatch = useDispatch();
  
    useEffect(() => {
      dispatch(autoLogin());
    }, []);
  
    const handleLogin = async () => {
      try {
        await dispatch(login({ email, password }));
      } catch (error) {
        console.log("Login error:", error);
      }
    };
  
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ImageBackground source={require("../../assets/images/LoginBackground.png")} style={styles.background}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.bg_overlay}>
              <Text style={styles.welcome}>Welcome</Text>
  
              <Image
                source={require('../../assets/images/loginicon.png')}
                style={styles.image}
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
  
              <CustomButton
                buttonText="Login"
                setWidth="50%"
                handleOnPress={handleLogin}
                buttonColor="green"
                pressedButtonColor="gray"
              />
  
              <CustomButton
                buttonText="Sign Up"
                setWidth="30%"
                handleOnPress={() => navigation.navigate('Signup')}
                buttonColor="gray"
                pressedButtonColor="lightgray"
              />
  
              {isLoading ? <Loading changeIsLoading={() => dispatch(setIsLoading(false))} /> : null}
            </View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    );
  };
  
  export default LoginPage;
  
  const styles = StyleSheet.create({
    image: {
      width: 150,
      height: 150,
      marginBottom: 20
    },
    welcome: {
      fontWeight: 'bold',
      color: 'white',
      fontSize: 30,
      marginBottom: 30
    },
    background: {
      flex: 1,
      resizeMode: 'cover'
    },
    bg_overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
  });
  