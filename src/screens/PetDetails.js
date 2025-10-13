import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'; // orderBy kaldırıldı
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const PetDetails = ({ route, navigation }) => {
  const { petId } = route.params;

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isOwner, setIsOwner] = useState(false);

  // Rapor formu
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Rapor listesi
  const [isViewingReports, setIsViewingReports] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // --- İlanı canlı dinle
  useEffect(() => {
    const ref = doc(db, 'lost_pets', petId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPet(data);
          const uid = auth.currentUser?.uid ?? null;
          setIsOwner(Boolean(uid && data.ownerId && uid === data.ownerId));
        } else {
          Alert.alert('Bulunamadı', 'İlan kaldırılmış olabilir.');
          navigation.goBack();
        }
        setLoading(false);
      },
      () => {
        // ilan hatası: kullanıcıya sadece geri dön önerdik
        setLoading(false);
      }
    );
    return () => unsub();
  }, [petId, navigation]);

  // --- Raporları getir (sadece istendiğinde) — indeks gerektirmeyen sürüm
  const fetchReports = useCallback(async () => {
    try {
      setReportsLoading(true);

      // orderBy yok, sadece where: petId == ...
      const q = query(
        collection(db, 'reports'),
        where('petId', '==', petId)
      );

      const unsub = onSnapshot(
        q,
        async (snap) => {
          // Kullanıcı adlarını batch şekilde çek
          const items = await Promise.all(
            snap.docs.map(async (d) => {
              const r = { id: d.id, ...d.data() };
              let reporterName = 'Bilinmeyen Kullanıcı';
              try {
                if (r.reportedBy) {
                  // Projede 'Users' yerine 'users' kullanıyorsan bu satırı değiştir
                  const uref = doc(db, 'Users', r.reportedBy);
                  const u = await getDoc(uref);
                  if (u.exists() && u.data()?.name) reporterName = u.data().name;
                }
              } catch {}
              return { ...r, reporterName };
            })
          );

          // client-side sort: reportedAt DESC
          items.sort((a, b) => {
            const at =
              a.reportedAt?.toMillis?.() ??
              (a.reportedAt?.seconds ? a.reportedAt.seconds * 1000 : 0);
            const bt =
              b.reportedAt?.toMillis?.() ??
              (b.reportedAt?.seconds ? b.reportedAt.seconds * 1000 : 0);
            return bt - at;
          });

          setReports(items);
          setReportsLoading(false);
        },
        // Hata olsa bile kullanıcıya "rapor yok" göster
        () => {
          setReports([]);           // boş liste
          setReportsLoading(false); // yükleme dursun
        }
      );

      // görünüm kapanınca dinlemeyi bitirmek için döndür
      return unsub;
    } catch {
      // Genel hata: boş durum göster
      setReports([]);
      setReportsLoading(false);
    }
  }, [petId]);

  // Görünsün dendiğinde başlat; kapatılınca kes
  useEffect(() => {
    let unsub;
    (async () => {
      if (isViewingReports) {
        unsub = await fetchReports();
      } else {
        setReports([]); // kapatınca temizle
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [isViewingReports, fetchReports]);

  const img = pet?.imageUrl || pet?.image || null;
  const title = pet?.petName || pet?.name || 'İlan';
  const desc = pet?.description || '';
  const contact = pet?.contact || '';
  const type = pet?.petType || pet?.type || '';
  const status = pet?.status || 'Kayıp';

  const createdStr = useMemo(() => {
    try {
      const d =
        pet?.createdAt?.toDate?.() ??
        (typeof pet?.createdAt === 'number'
          ? new Date(pet.createdAt)
          : pet?.createdAt?.seconds
          ? new Date(pet.createdAt.seconds * 1000)
          : null);
      if (d) {
        return d.toLocaleString('tr-TR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {}
    return '';
  }, [pet?.createdAt]);

  const openContact = () => {
    if (!contact) return;
    if (/^\+?\d[\d\s\-()]{6,}$/.test(contact)) {
      Linking.openURL(`tel:${contact.replace(/\s/g, '')}`);
    } else if (/.+@.+\..+/.test(contact)) {
      Linking.openURL(`mailto:${contact}`);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert('Eksik bilgi', 'Lütfen raporlama nedeni girin.');
      return;
    }
    try {
      setReportSubmitting(true);
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert('Gerekli', 'Rapor göndermek için giriş yapmalısın.');
        setReportSubmitting(false);
        return;
      }
      await addDoc(collection(db, 'reports'), {
        petId,
        reason: reportReason.trim(),
        reportedBy: uid,
        reportedAt: serverTimestamp(),
      });
      setReportReason('');
      setIsReporting(false);
      Alert.alert('Teşekkürler', 'Raporun iletildi.');
    } catch {
      Alert.alert('Hata', 'Rapor gönderilemedi.');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading || !pet) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0b6aa2" />
          <Text style={styles.loadingText}>Yükleniyor…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f9fc" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Fotoğraf */}
        {img ? (
          <Image source={{ uri: img }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>Fotoğraf yok</Text>
          </View>
        )}

        {/* Başlık + rozet */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.badge, status === 'Kayıp' ? styles.badgeLost : styles.badgeOther]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {type ? <Text style={styles.metaText}>Tür: {type}</Text> : null}
          {createdStr ? <Text style={styles.metaText}>• {createdStr}</Text> : null}
        </View>

        {desc ? <Text style={styles.desc}>{desc}</Text> : null}

        {contact ? (
          <TouchableOpacity onPress={openContact} activeOpacity={0.85} style={styles.contactBtn}>
            <Text style={styles.contactBtnText}>İletişim: {contact}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Geri */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Text style={styles.secondaryBtnText}>Geri</Text>
        </TouchableOpacity>

        {/* İlan sahibine raporlar; diğerlerine rapor etme */}
        {isOwner ? (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={() => setIsViewingReports((v) => !v)}
            >
              <Text style={styles.primaryBtnText}>
                {isViewingReports ? 'Raporları Gizle' : 'Raporları Gör'}
              </Text>
            </TouchableOpacity>

            {isViewingReports ? (
              <View style={styles.reportsBox}>
                <Text style={styles.sectionTitle}>Raporlar</Text>
                {reportsLoading ? (
                  <ActivityIndicator size="small" color="#0b6aa2" />
                ) : reports.length === 0 ? (
                  <Text style={styles.emptyText}>Bu ilan için rapor yok.</Text>
                ) : (
                  <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    renderItem={({ item }) => {
                      let reportedAtStr = '';
                      try {
                        const d =
                          item.reportedAt?.toDate?.() ??
                          (item.reportedAt?.seconds ? new Date(item.reportedAt.seconds * 1000) : null);
                        if (d) {
                          reportedAtStr = d.toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                        }
                      } catch {}
                      return (
                        <View style={styles.reportItem}>
                          <Text style={styles.reportReason}>Neden: {item.reason}</Text>
                          {reportedAtStr ? <Text style={styles.reportMeta}>{reportedAtStr}</Text> : null}
                          <Text style={styles.reportMeta}>Raporlayan: {item.reporterName}</Text>
                        </View>
                      );
                    }}
                  />
                )}
              </View>
            ) : null}
          </>
        ) : (
          <>
            {!isReporting ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#e11d48' }]}
                activeOpacity={0.9}
                onPress={() => setIsReporting(true)}
              >
                <Text style={styles.primaryBtnText}>İlanı Rapor Et</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.reportForm}>
                <Text style={styles.sectionTitle}>Raporlama Nedeni</Text>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Lütfen rapor sebebini yazın"
                  style={styles.input}
                  multiline
                />
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1 }]}
                    activeOpacity={0.9}
                    onPress={handleReport}
                    disabled={reportSubmitting}
                  >
                    <Text style={styles.primaryBtnText}>
                      {reportSubmitting ? 'Gönderiliyor…' : 'Raporu Gönder'}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ width: 10 }} />
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { flex: 1 }]}
                    activeOpacity={0.9}
                    onPress={() => {
                      setIsReporting(false);
                      setReportReason('');
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>İptal</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PetDetails;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f9fc' },
  container: { padding: 16, paddingBottom: 24 },

  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, color: 'rgba(6,24,40,0.65)' },

  image: { width: '100%', height: 260, borderRadius: 14, backgroundColor: '#eef3f7' },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { color: 'rgba(6,24,40,0.45)' },

  headerRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '700', color: '#041523', flex: 1, marginRight: 10 },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeLost: { backgroundColor: 'rgba(225, 29, 72, 0.12)' },
  badgeOther: { backgroundColor: 'rgba(14, 179, 125, 0.12)' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#e11d48' },

  metaRow: { marginTop: 6, flexDirection: 'row', flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: 'rgba(6,24,40,0.6)', marginRight: 8 },

  desc: { marginTop: 10, fontSize: 14, color: 'rgba(6,24,40,0.85)', lineHeight: 20 },

  contactBtn: {
    marginTop: 12,
    backgroundColor: '#0b6aa2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  contactBtnText: { color: '#fff', fontWeight: '700' },

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
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },

  secondaryBtn: {
    marginTop: 12,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#041523', fontWeight: '700' },

  reportsBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#041523', marginBottom: 8 },

  reportItem: {
    backgroundColor: 'rgba(6,24,40,0.03)',
    padding: 10,
    borderRadius: 10,
  },
  reportReason: { fontSize: 13, color: 'rgba(6,24,40,0.85)' },
  reportMeta: { marginTop: 4, fontSize: 12, color: 'rgba(6,24,40,0.6)' },

  reportForm: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#041523',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  input: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(6,24,40,0.05)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },

  emptyText: { fontSize: 12, color: 'rgba(6,24,40,0.6)' },
});
