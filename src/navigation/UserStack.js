import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  AccountSettingsScreen,
  AddLostPetScreen,
  AppointmentScreen,
  AsiPage,
  Beslenme,
  DonationPage,
  Guess,
  HomePage,
  LostPetsList,
  MainPage,
  MapScreen,
  PasswordResetScreen,
  PetDetails,
  PetGrowthTracker,
  ProfilePage,
  StreetAnimalsMap,
  UserAppointments,
  VetAppointment,
  VetDashboard,
  VeterinarianList,
  ChatPage,
} from '../screens/Index';

const Stack = createNativeStackNavigator();

const UserStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomePage} />
      <Stack.Screen name="Profile" component={ProfilePage} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Asi" component={AsiPage} />
      <Stack.Screen name="Appointments" component={UserAppointments} />
      <Stack.Screen name="Beslenme" component={Beslenme} />
      <Stack.Screen name="PetGrowthTracker" component={PetGrowthTracker} />
      <Stack.Screen name="VetAppointment" component={VetAppointment} />
      <Stack.Screen name="VeterinarianList" component={VeterinarianList} />
      <Stack.Screen name="AppointmentScreen" component={AppointmentScreen} />
      <Stack.Screen name="StreetAnimalsMap" component={StreetAnimalsMap} />
      <Stack.Screen name="AddLostPetScreen" component={AddLostPetScreen} />
      <Stack.Screen name="LostPetsList" component={LostPetsList} />
      <Stack.Screen name="PetDetails" component={PetDetails} />
      <Stack.Screen name="PasswordResetScreen" component={PasswordResetScreen} />
      <Stack.Screen name="AccountSettingsScreen" component={AccountSettingsScreen} />
      <Stack.Screen name="VetDashboard" component={VetDashboard} />
      <Stack.Screen name="MainPage" component={MainPage} />
      <Stack.Screen name="DonationPage" component={DonationPage} />
      <Stack.Screen name="Guess" component={Guess} />
      <Stack.Screen name="ChatRoom" component={ChatPage} />
    </Stack.Navigator>
  );
};

export default UserStack;
