// src/components/DateDivider.jsx
import { Text, View } from 'react-native';
import { styles } from '../screens/ChatStyles';

const labelForDate = (date) => {
  const today = new Date();
  const sameDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const normalizedToday = sameDay(today);
  const normalizedTarget = sameDay(date);
  const diffDays = Math.round((normalizedToday - normalizedTarget) / 86400000);

  if (diffDays === 0) {
    return 'Bugün';
  }
  if (diffDays === 1) {
    return 'Dün';
  }

  return date.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const DateDivider = ({ date }) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return (
    <View style={styles.dateDivider}>
      <Text style={styles.dateDividerText}>{labelForDate(date)}</Text>
    </View>
  );
};

export default DateDivider;
