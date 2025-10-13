// src/components/MessageBubble.jsx
import { Text, View } from 'react-native';
import { styles } from '../screens/ChatStyles';

const getInitial = (value) => (value?.trim()?.[0] || '?').toUpperCase();

const formatTime = (value) => {
  if (!value) {
    return '';
  }
  if (typeof value.toDate === 'function') {
    const d = value.toDate();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessageBubble = ({ item, isMine, showSenderName, compact, showAvatar }) => {
  const textStyle = isMine ? styles.bubbleText : styles.bubbleTextOther;
  const bubbleStyle = [styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther];

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      {!isMine ? (
        showAvatar ? (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitial(item.senderName)}</Text>
          </View>
        ) : (
          <View style={styles.avatarPlaceholder} />
        )
      ) : null}
      <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
        <View style={bubbleStyle}>
          {!isMine && showSenderName ? (
            <Text style={styles.senderName}>{item.senderName || 'KullanÄ±cÄ±'}</Text>
          ) : null}
          <Text style={textStyle}>{item.message}</Text>
          {!compact ? (
            <View style={styles.metaRow}>
              <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default MessageBubble;

