import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const LostPetsList = ({ navigation }) => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = auth.currentUser;
  const uid = user?.uid ?? null;

  // orderBy kaldırıldı -> composite index gerektirmesin
  const q = useMemo(() => {
    if (!uid) return null;
    return query(
      collection(db, 'lost_pets'),
      where('ownerId', '==', uid),
    );
  }, [uid]);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Client-side sort: createdAt DESC (Timestamp/Date/string fark etmez)
        list.sort((a, b) => {
          const at =
            a.createdAt?.toMillis?.() ??
            (a.createdAt?.toDate?.() ? a.createdAt.toDate().getTime() : undefined) ??
            (typeof a.createdAt === 'number' ? a.createdAt : undefined) ??
            (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);

          const bt =
            b.createdAt?.toMillis?.() ??
            (b.createdAt?.toDate?.() ? b.createdAt.toDate().getTime() : undefined) ??
            (typeof b.createdAt === 'number' ? b.createdAt : undefined) ??
            (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);

          return (bt || 0) - (at || 0);
        });

        setPets(list);
        setLoading(false);
      },
      (err) => {
        console.error('İlanlar alınırken hata:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [q]);

  const onRefresh = useCallback(() => {
    // onSnapshot canlı; sadece görsel yenileme
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const renderItem = ({ item }) => {
    // Eski kayıtlara uyumlu alan adları:
    const img = item.imageUrl || item.image || null;
    const title = item.petName || item.name || 'İlan';
    const desc = item.description || '';
    const contact = item.contact || '';
    const type = item.petType || item.type || '';
    const status = item.status || 'Kayıp';

    // Tarihi güvenli biçimde yaz
    let createdStr = '';
    try {
      const d =
        item.createdAt?.toDate?.() ??
        (typeof item.createdAt === 'number'
          ? new Date(item.createdAt)
          : item.createdAt?.seconds
          ? new Date(item.createdAt.seconds * 1000)
          : null);
      if (d) {
        createdStr = d.toLocaleString('tr-TR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {}

    return (
      <View style={styles.card}>
        {img ? (
          <Image source={{ uri: img }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>Fotoğraf yok</Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <View style={[styles.badge, status === 'Kayıp' ? styles.badgeLost : styles.badgeOther]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {type ? <Text style={styles.metaText}>Tür: {type}</Text> : null}
          {createdStr ? <Text style={styles.metaText}>• {createdStr}</Text> : null}
        </View>

        {desc ? <Text style={styles.desc} numberOfLines={3}>{desc}</Text> : null}
        {contact ? <Text style={styles.contact}>İletişim: {contact}</Text> : null}

        <TouchableOpacity
          style={styles.detailsButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PetDetails', { petId: item.id })}
        >
          <Text style={styles.detailsButtonText}>Detayları Gör</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!uid) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>Oturum Gerekli</Text>
          <Text style={styles.emptyText}>
            Kayıp ilanlarını görmek için lütfen giriş yap.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0b6aa2" />
          <Text style={styles.loadingText}>İlanlar yükleniyor…</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyTitle}>İlanın yok</Text>
          <Text style={styles.emptyText}>
            Henüz bir kayıp ilanı oluşturmamışsın. Hemen eklemek ister misin?
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('AddLostPet')}
          >
            <Text style={styles.primaryBtnText}>Yeni İlan Oluştur</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0b6aa2']} />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default LostPetsList;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f9fc' },
  listContent: { padding: 16, paddingBottom: 24 },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: 'rgba(6,24,40,0.65)' },

  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#041523' },
  emptyText: { marginTop: 8, fontSize: 13, color: 'rgba(6,24,40,0.65)', textAlign: 'center' },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#0a8c61',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  cardImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#eef3f7' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { color: 'rgba(6,24,40,0.45)' },

  cardHeader: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#041523', flex: 1, marginRight: 8 },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeLost: { backgroundColor: 'rgba(225, 29, 72, 0.12)' },
  badgeOther: { backgroundColor: 'rgba(14, 179, 125, 0.12)' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#e11d48' },

  metaRow: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: 'rgba(6,24,40,0.6)', marginRight: 8 },

  desc: { marginTop: 8, fontSize: 13, color: 'rgba(6,24,40,0.8)' },
  contact: { marginTop: 6, fontSize: 12, color: 'rgba(6,24,40,0.7)' },

  detailsButton: {
    marginTop: 12,
    backgroundColor: '#0b6aa2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailsButtonText: { color: '#fff', fontWeight: '700' },
});
