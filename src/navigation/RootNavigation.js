import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import VetDashboard from '../screens/VetDashboard'; // Vet ekranı ayrıysa buradan çek
import AuthStack from './AuthStack';
import UserStack from './UserStack';

const RootNavigation = () => {
    const { isAuth, user } = useSelector((state) => state.user);

    const role = user?.role || "user"; // Kullanıcı rolünü alıyoruz

    return (
        <NavigationContainer>
            {!isAuth ? (
                <AuthStack />
            ) : role === "vet" ? (
                <VetDashboard /> // VET ise doğrudan VetDashboard'a
            ) : (
                <UserStack /> // Normal kullanıcıysa UserStack
            )}
        </NavigationContainer>
    );
};

export default RootNavigation;
