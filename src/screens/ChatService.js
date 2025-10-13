// src/screens/ChatService.js
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const CHAT_COLLECTION = 'Chats';
const MESSAGE_SUB_COLLECTION = 'Messages';
const USERS_COLLECTION = 'Users';

const mapSnapshotToMessage = (docSnap) => ({
  id: docSnap.id,
  _ref: docSnap,
  ...docSnap.data(),
});

const chatMessagesRef = (chatId) =>
  collection(db, CHAT_COLLECTION, chatId, MESSAGE_SUB_COLLECTION);

const normalizeDisplayName = (data = {}, fallback) =>
  data.name ||
  data.displayName ||
  data.fullName ||
  data.vetName ||
  fallback ||
  'KullanÄ±cÄ±';

const sanitizeParticipantsInfo = (infoMap = {}) => {
  const result = {};
  Object.entries(infoMap).forEach(([uid, value]) => {
    if (!value) {
      return;
    }
    const entry = {
      name: normalizeDisplayName(value),
      role: value.role || 'user',
      photoURL: value.photoURL || value.avatar || null,
    };
    result[uid] = entry;
  });
  return result;
};

export const ensureChatDocument = async (chatId, metadata = {}) => {
  const chatDoc = doc(db, CHAT_COLLECTION, chatId);
  const snap = await getDoc(chatDoc);
  const basePayload = {
    createdAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(chatDoc, {
      ...basePayload,
      ...metadata,
    });
  } else if (metadata && Object.keys(metadata).length > 0) {
    await setDoc(chatDoc, metadata, { merge: true });
  }

  return chatDoc;
};

const fetchUserProfile = async (uid) => {
  if (!uid) {
    return { id: null, data: {} };
  }
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return { id: uid, data: snap.exists() ? snap.data() : {} };
};

const getDisplayFromProfile = (profile, fallbackName) => {
  const name = normalizeDisplayName(profile.data, fallbackName);
  const role = profile.data?.role || 'user';
  const photoURL = profile.data?.photoURL || null;
  return { name, role, photoURL };
};

export const subscribeLatestMessages = (chatId, { pageSize = 30, onUpdate, onError }) => {
  const ref = chatMessagesRef(chatId);
  const q = query(ref, orderBy('timestamp', 'desc'), limit(pageSize));

  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map(mapSnapshotToMessage);
      onUpdate?.(rows);
    },
    (err) => {
      console.error('Chat subscribe failed:', err);
      onError?.(err);
    },
  );
};

export const fetchOlderMessages = async (chatId, lastDocument, pageSize = 30) => {
  if (!lastDocument) {
    return [];
  }

  const ref = chatMessagesRef(chatId);
  const q = query(ref, orderBy('timestamp', 'desc'), startAfter(lastDocument), limit(pageSize));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapSnapshotToMessage);
};

export const sendMessage = async (chatId, message, userId, options = {}) => {
  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('KullanÄ±cÄ± bulunamadÄ±.');
  }

  const senderData = userSnap.data();
  const senderName = normalizeDisplayName(senderData, 'Anonim');

  const chatMetadata = {
    ...(options.chatMetadata || {}),
  };

  const chatDoc = await ensureChatDocument(chatId, chatMetadata);

  const payload = {
    senderId: userId,
    senderName,
    message: trimmed,
    type: options.type || 'text',
    timestamp: serverTimestamp(),
    read: false,
  };

  await addDoc(chatMessagesRef(chatId), payload);
  await setDoc(
    chatDoc,
    {
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: trimmed.slice(0, 120),
      lastMessageSender: {
        id: userId,
        name: senderName,
      },
    },
    { merge: true },
  );
};

const sortUserIdentifiers = (uidA, uidB) => {
  return [uidA, uidB].sort((a, b) => (a < b ? -1 : 1));
};

export const getDirectChatId = (uidA, uidB) => {
  const [first, second] = sortUserIdentifiers(uidA, uidB);
  return `dm_${first}_${second}`;
};

export const ensureDirectChat = async ({
  currentUserId,
  targetUserId,
  currentUserFallbackName = 'Siz',
  targetUserFallbackName = 'Veteriner',
  context = {},
} = {}) => {
  if (!currentUserId || !targetUserId) {
    throw new Error('GeÃ§erli katÄ±lÄ±mcÄ± bilgisi bulunamadÄ±.');
  }

  if (currentUserId === targetUserId) {
    throw new Error('KullanÄ±cÄ± kendisiyle sohbet baÅŸlatamaz.');
  }

  const chatId = getDirectChatId(currentUserId, targetUserId);

  const [currentProfile, targetProfile] = await Promise.all([
    fetchUserProfile(currentUserId),
    fetchUserProfile(targetUserId),
  ]);

  const currentDisplay = getDisplayFromProfile(currentProfile, currentUserFallbackName);
  const targetDisplay = getDisplayFromProfile(targetProfile, targetUserFallbackName);

  const participantsInfo = sanitizeParticipantsInfo({
    [currentUserId]: currentDisplay,
    [targetUserId]: targetDisplay,
  });

  const participants = sortUserIdentifiers(currentUserId, targetUserId);

  const metadata = {
    type: 'dm',
    participants,
    participantsInfo,
    title: targetDisplay.name,
    subtitle: targetDisplay.role === 'vet' ? 'Veteriner' : undefined,
    avatar: context.avatar ?? targetDisplay.photoURL ?? null,
    createdBy: currentUserId,
    ...context.metadata,
  };

  await ensureChatDocument(chatId, metadata);

  return {
    chatId,
    metadata,
    participantsInfo,
  };
};


export const ensureGroupChat = async ({ chatId = 'public_general', metadata = {} } = {}) => {
  const baseMetadata = {
    type: 'group',
    title: metadata.title || 'Genel Sohbet',
    subtitle: metadata.subtitle || 'Topluluk',
    createdBy: metadata.createdBy || null,
    ...metadata,
  };
  await ensureChatDocument(chatId, baseMetadata);
  return chatId;
};

export const prepareDirectChatParams = async ({
  currentUserId,
  targetUserId,
  currentUserFallbackName,
  targetUserFallbackName,
  context,
} = {}) => {
  const { chatId, metadata, participantsInfo } = await ensureDirectChat({
    currentUserId,
    targetUserId,
    currentUserFallbackName,
    targetUserFallbackName,
    context,
  });

  const targetInfo = participantsInfo[targetUserId] || {};

  return {
    chatId,
    title: metadata.title || targetInfo.name || 'Sohbet',
    subtitle: metadata.subtitle || null,
    targetUserId,
    type: 'dm',
    participantsInfo,
  };
};


