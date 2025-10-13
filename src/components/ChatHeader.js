// src/components/ChatHeader.jsx
import { useNavigation } from '@react-navigation/native';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../screens/ChatStyles';

const ChatHeader = ({ title = 'Sohbet', subtitle }) => {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => nav.goBack()} style={styles.headerBack} />
      <View style={styles.headerTextWrap}>
        <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text numberOfLines={1} style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.headerRight} />
    </View>
  );
};

export default ChatHeader;
