// src/screens/ChatStyles.js
import { Appearance, StyleSheet } from 'react-native';

const BRAND = '#0eb37d';
const HEADER_BG = '#f6f9fc';
const HEADER_TEXT = '#041523';
const INACTIVE = 'rgba(6, 24, 40, 0.45)';

const DARK = Appearance.getColorScheme() === 'dark';

const BG = DARK ? '#0B0F14' : HEADER_BG;
const SURFACE = DARK ? '#11161D' : '#FFFFFF';
const TEXT = DARK ? '#E6EAF0' : HEADER_TEXT;
const SUBTEXT = DARK ? '#A8B0BC' : INACTIVE;
const BORDER = DARK ? '#1F2730' : '#E5E7EB';

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: BG },

  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HEADER_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerBack: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DARK ? '#1A2029' : '#EAF1F6',
    marginRight: 12,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: HEADER_TEXT },
  headerSubtitle: { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  headerRight: { width: 32 },

  listContent: { paddingVertical: 8, paddingHorizontal: 12 },

  row: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4 },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DARK ? '#232B36' : '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { fontWeight: '700', color: DARK ? '#CBD5E1' : '#374151' },
  avatarPlaceholder: { width: 32, height: 32, marginRight: 10 },

  bubbleWrap: { maxWidth: '82%' },
  bubbleWrapMine: { marginLeft: 40 },
  bubbleWrapOther: { marginRight: 40 },

  bubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bubbleMine: {
    backgroundColor: BRAND,
  },
  bubbleOther: {
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 21,
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    fontSize: 16,
    lineHeight: 21,
    color: TEXT,
  },

  senderName: { fontWeight: '600', color: SUBTEXT, marginBottom: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  timeText: { fontSize: 11, color: SUBTEXT },

  dateDivider: {
    alignSelf: 'center',
    backgroundColor: DARK ? '#141A22' : '#EAF1F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  dateDividerText: { fontSize: 12, color: SUBTEXT },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: SURFACE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  composerInput: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: DARK ? '#0E141B' : '#FFFFFF',
    color: TEXT,
    fontSize: 16,
  },
  sendBtn: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: BRAND,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },

  initialLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  errorBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(220, 38, 38, 0.35)',
  },
  errorBannerText: { fontSize: 13, color: '#991B1B' },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
  },
  emptyStateSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: SUBTEXT,
  },

  loadMoreFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadMoreFooterText: {
    fontSize: 12,
    color: SUBTEXT,
  },

  errorText: { color: '#EF4444', fontSize: 16, textAlign: 'center' },
});
