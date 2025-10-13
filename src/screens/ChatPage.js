// src/screens/ChatPage.jsx
import { getAuth } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ChatHeader from '../components/ChatHeader';
import DateDivider from '../components/DateDivider';
import MessageBubble from '../components/MessageBubble';
import { fetchOlderMessages, sendMessage, subscribeLatestMessages } from './ChatService';
import { styles } from './ChatStyles';

const PAGE_SIZE = 30;

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

const isDifferentDay = (current, previous) => {
  const a = toDate(current?.timestamp);
  const b = toDate(previous?.timestamp);
  if (!a || !b) {
    return true;
  }
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
};

const ChatPage = ({ route }) => {
  const { chatId = 'public_general', title = 'Topluluk Sohbeti', subtitle } = route.params || {};
  const listRef = useRef(null);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || null;

  const [messages, setMessages] = useState([]);
  const [composerValue, setComposerValue] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!chatId) {
      return undefined;
    }

    setInitialLoading(true);
    setLoadError(null);

    const unsubscribe = subscribeLatestMessages(chatId, {
      pageSize: PAGE_SIZE,
      onUpdate: (rows) => {
        setMessages(rows);
        setInitialLoading(false);
        setReachedEnd(rows.length < PAGE_SIZE);
      },
      onError: (error) => {
        setLoadError(error);
        setInitialLoading(false);
      },
    });

    return () => unsubscribe && unsubscribe();
  }, [chatId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || reachedEnd || messages.length === 0) {
      return;
    }

    setLoadingMore(true);
    try {
      const lastDocument = messages[messages.length - 1]?._ref;
      const older = await fetchOlderMessages(chatId, lastDocument, PAGE_SIZE);
      if (older.length === 0 || older.length < PAGE_SIZE) {
        setReachedEnd(true);
      }
      setMessages((prev) => [...prev, ...older]);
    } catch (error) {
      console.error('Older messages fetch failed:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, loadingMore, reachedEnd, messages]);

  const handleSend = useCallback(async () => {
    const trimmed = composerValue.trim();
    if (!trimmed || !chatId || !userId || sending) {
      return;
    }

    setSending(true);
    try {
      await sendMessage(chatId, trimmed, userId);
      setComposerValue('');
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    } catch (error) {
      console.error('Send message failed:', error);
      setLoadError(error);
    } finally {
      setSending(false);
    }
  }, [chatId, composerValue, userId, sending]);

  const renderItem = ({ item, index }) => {
    const previous = messages[index + 1];
    const showDateDivider = index === messages.length - 1 || isDifferentDay(item, previous);
    const showSenderName = !previous || previous.senderId !== item.senderId || showDateDivider;
    const compact = !!previous && previous.senderId === item.senderId && !showDateDivider;
    const showAvatar = showSenderName && !compact;
    const isMine = item.senderId === userId;
    const messageDate = toDate(item.timestamp) || new Date();

    return (
      <View>
        {showDateDivider ? <DateDivider date={messageDate} /> : null}
        <MessageBubble
          item={item}
          isMine={isMine}
          showSenderName={showSenderName}
          compact={compact}
          showAvatar={!isMine && showAvatar}
        />
      </View>
    );
  };

  const listEmpty = initialLoading ? null : (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Henüz mesaj yok.</Text>
      <Text style={styles.emptyStateSubtitle}>Konuşmayı başlatmak için ilk mesajı yaz.</Text>
    </View>
  );

  const footer = loadingMore ? (
    <View style={styles.loadMoreFooter}>
      <ActivityIndicator size="small" color="#0eb37d" />
    </View>
  ) : reachedEnd ? (
    <View style={styles.loadMoreFooter}>
      <Text style={styles.loadMoreFooterText}>Tüm mesaj geçmişi yüklendi.</Text>
    </View>
  ) : null;

  if (!chatId || !userId) {
    return (
      <View style={[styles.page, styles.emptyState]}>
        <Text style={styles.errorText}>Sohbet bilgisi bulunamadı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ChatHeader title={title} subtitle={subtitle} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {initialLoading ? (
          <View style={styles.initialLoader}>
            <ActivityIndicator size="large" color="#0eb37d" />
          </View>
        ) : null}
        {loadError && !initialLoading ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>Mesajlar yüklenirken bir sorun oluştu.</Text>
          </View>
        ) : null}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListFooterComponent={footer}
          ListEmptyComponent={listEmpty}
          keyboardShouldPersistTaps="handled"
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={composerValue}
            onChangeText={setComposerValue}
            placeholder="Mesaj yaz..."
            placeholderTextColor="rgba(6, 24, 40, 0.45)"
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            activeOpacity={0.8}
            style={[styles.sendBtn, (!composerValue.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!composerValue.trim() || sending}
          >
            <Icon
              name={composerValue.trim() ? 'send' : 'send-outline'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatPage;
