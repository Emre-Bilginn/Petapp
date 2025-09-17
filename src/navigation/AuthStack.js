import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginPage, SignUpPage } from '../screens/Index';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator 
    initialRouteName='Login'
    screenOptions={{headerShown:false}}>

        <Stack.Screen name='Login' component={LoginPage}/>
        <Stack.Screen name='Signup' component={SignUpPage}/>

    </Stack.Navigator>
  )
}

export default AuthStack
