import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ensureGroupChat } from './ChatService';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../firebaseConfig';

const GROUP_CHAT_ID = 'public_general';
const CHAT_COLLECTION = 'Chats';

const toDate = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatRelativeTime = (value) => {
  const target = toDate(value);
  if (!target) {
    return '';
  }
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) {
    return '\u015eimdi';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} dk`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} sa`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} g\u00fcn`;
  }
  return target.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
};

const resolveCounterpart = (chat, currentUserId) => {
  const participants = chat.participants || [];
  const others = participants.filter((uid) => uid !== currentUserId);
  const counterpartId = others[0] || participants[0] || null;
  const infoMap = chat.participantsInfo || {};
  const counterpartInfo = counterpartId ? infoMap[counterpartId] : null;
  return {
    counterpartId,
    name: counterpartInfo?.name || chat.title || 'Sohbet',
    subtitle: chat.lastMessagePreview || counterpartInfo?.role || 'Birebir sohbet',
  };
};

const DMListItem = ({ item, onPress }) => (
  <TouchableOpacity style={styles.dmItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.dmAvatar}>
      <Text style={styles.dmAvatarText}>{item.initials}</Text>
    </View>
    <View style={styles.dmContent}>
      <Text style={styles.dmTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.dmSubtitle} numberOfLines={1}>{item.subtitle}</Text>
    </View>
    <View style={styles.dmMeta}>
      <Text style={styles.dmTime}>{item.timeLabel}</Text>
      <Icon name="chevron-forward" size={18} color="rgba(6, 24, 40, 0.35)" />
    </View>
  </TouchableOpacity>
);

const ChatLobby = () => {
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid ?? null;

  const [loading, setLoading] = useState(true);
  const [dmChats, setDmChats] = useState([]);

  useEffect(() => {
    ensureGroupChat({}).catch((error) => {
      console.error('Group chat initialization failed:', error);
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      return undefined;
    }

    const chatsRef = collection(db, CHAT_COLLECTION);
    const q = query(chatsRef, where('participants', 'array-contains', currentUserId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((chat) => chat?.type === 'dm');

        rows.sort((a, b) => {
          const aTime = toDate(a.lastMessageAt)?.getTime() || 0;
          const bTime = toDate(b.lastMessageAt)?.getTime() || 0;
          return bTime - aTime;
        });

        setDmChats(rows);
        setLoading(false);
      },
      (error) => {
        console.error('Direct message subscription failed:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const dmList = useMemo(
    () => dmChats.map((chat) => {
      const counterpart = resolveCounterpart(chat, currentUserId);
      const initials = counterpart.name?.[0]?.toUpperCase() || 'S';
      return {
        id: chat.id,
        title: counterpart.name,
        subtitle: counterpart.subtitle,
        timeLabel: formatRelativeTime(chat.lastMessageAt || chat.createdAt),
        initials,
        counterpartId: counterpart.counterpartId,
      };
    }),
    [dmChats, currentUserId],
  );

  const handleOpenGroupChat = () => {
    navigation.navigate('ChatRoom', {
      chatId: GROUP_CHAT_ID,
      title: 'Topluluk Sohbeti',
      subtitle: 'Genel oda',
      type: 'group',
    });
  };

  const handleOpenDirect = (item) => {
    navigation.navigate('ChatRoom', {
      chatId: item.id,
      title: item.title,
      subtitle: item.subtitle,
      type: 'dm',
      targetUserId: item.counterpartId,
    });
  };

  if (!currentUserId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sohbet için giriş yapmalısınız.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <Text style={styles.screenTitle}>Sohbetler</Text>
        <Text style={styles.sectionTitle}>Topluluk Sohbeti</Text>
        <TouchableOpacity
          style={styles.groupCard}
          onPress={handleOpenGroupChat}
          activeOpacity={0.8}
        >
          <View style={styles.groupCardIcon}>
            <Icon name="people" size={22} color="#0b6aa2" />
          </View>
          <View style={styles.groupCardText}>
            <Text style={styles.groupCardTitle}>Genel Sohbet</Text>
            <Text style={styles.groupCardSubtitle}>Tüm topluluğa mesaj gönder</Text>
          </View>
          <Icon name="chevron-forward" size={20} color="rgba(6, 24, 40, 0.35)" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Birebir Sohbetler</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#0eb37d" />
          </View>
        ) : dmList.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Henüz birebir sohbetiniz yok.</Text>
            <Text style={styles.emptyHint}>Randevu aldığınız veterinerle mesajlaşabilirsiniz.</Text>
          </View>
        ) : (
          <FlatList
            data={dmList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DMListItem item={item} onPress={() => handleOpenDirect(item)} />
            )}
            contentContainerStyle={styles.dmList}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f9fc',
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#041523',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#041523',
    marginBottom: 12,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  groupCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 106, 162, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groupCardText: {
    flex: 1,
  },
  groupCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#041523',
  },
  groupCardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
  },
  dmList: {
    paddingBottom: 32,
  },
  dmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  dmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(11, 106, 162, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dmAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b6aa2',
  },
  dmContent: {
    flex: 1,
  },
  dmTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#041523',
  },
  dmSubtitle: {
    fontSize: 13,
    color: 'rgba(6, 24, 40, 0.65)',
    marginTop: 4,
  },
  dmMeta: {
    alignItems: 'flex-end',
    gap: 4,
    marginLeft: 10,
  },
  dmTime: {
    fontSize: 11,
    color: 'rgba(6, 24, 40, 0.55)',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(6, 24, 40, 0.6)',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(6, 24, 40, 0.45)',
    textAlign: 'center',
  },
});

export default ChatLobby;
