import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, Button, ScrollView } from 'react-native';
import { db } from '../../firebaseConfig';
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

const fetchMessages = (chatId, setMessages, scrollViewRef) => {
  const messagesRef = collection(db, 'Chats', chatId, 'Messages');
  const q = query(messagesRef, orderBy('timestamp'));

  onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('Fetched messages:', messages);
    setMessages(messages);

    // Yeni mesaj geldiğinde en alta kaydır
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  });
};

const sendMessage = async (chatId, message, userId) => {
  try {
    const userRef = doc(db, 'Users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const senderName = userDoc.data().name || 'Bilinmeyen Kullanıcı';

      await addDoc(collection(db, 'Chats', chatId, 'Messages'), {
        senderId: userId,
        senderName: senderName,
        message,
        type: 'text',
        timestamp: serverTimestamp(),
        read: false,
      });

      console.log('Mesaj başarıyla gönderildi:', message);
    } else {
      alert('Kullanıcı verisi bulunamadı. Lütfen tekrar deneyin.');
    }
  } catch (error) {
    alert('Mesaj gönderme hatası oluştu. Lütfen tekrar deneyin.');
  }
};

const ChatPage = ({ route }) => {
  const { chatId } = route.params || {};
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const scrollViewRef = useRef(null);

  if (!chatId || !userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Geçerli bir sohbet ID'si veya kullanıcı ID'si alınamadı.</Text>
      </View>
    );
  }

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchMessages(chatId, setMessages, scrollViewRef);
  }, [chatId]);

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;
    sendMessage(chatId, newMessage, userId);
    setNewMessage('');

    // Mesaj gönderildiğinde en alta kaydır
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((item, index) => {
          const showSenderName = index === 0 || messages[index - 1].senderId !== item.senderId;

          return (
            <View 
              key={item.id}
              style={[styles.messageContainer, item.senderId === userId ? styles.messageContainerUser : styles.messageContainerOther]}
            >
              {showSenderName && (
                <Text style={styles.sender}>
                  {item.senderName || 'Bilinmeyen Kullanıcı'}
                </Text>
              )}
              <Text style={styles.message}>{item.message}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Mesajınızı yazın..."
        />
        <Button title="Gönder" onPress={handleSendMessage} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    backgroundColor: '#f7f7f7',
  },
  messagesContainer: {
    width: '100%',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  messageContainer: {
    backgroundColor: '#fff',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    width: '80%',
    maxWidth: 350,
  },
  sender: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#555',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    width: '80%',
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 10,
    height: 40,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 18,
  },
  messageContainerUser: {
    backgroundColor: '#FFB38E',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  messageContainerOther: {
    backgroundColor: '#FFCF9D',
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
});

export default ChatPage;
