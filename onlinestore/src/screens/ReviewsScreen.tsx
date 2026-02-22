import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { marketplaceApi } from '../api/marketplace';

interface Review {
  id: number;
  rating: number;
  comment?: string;
  reply?: string;
  repliedAt?: string;
  customerName?: string;
  createdAt: string;
}

interface Summary {
  averageRating: number;
  totalReviews: number;
  breakdown: { s5: number; s4: number; s3: number; s2: number; s1: number };
}

export default function ReviewsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { companyId, storeName } = route.params;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reviewsRes, summaryRes] = await Promise.all([
        marketplaceApi.getReviews(companyId, 1),
        marketplaceApi.getReviewSummary(companyId),
      ]);
      setReviews(reviewsRes.reviews);
      setTotal(reviewsRes.total);
      setSummary(summaryRes);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (reviews.length >= total) return;
    const nextPage = page + 1;
    try {
      const res = await marketplaceApi.getReviews(companyId, nextPage);
      setReviews([...reviews, ...res.reviews]);
      setPage(nextPage);
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    if (!newName.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    setSubmitLoading(true);
    try {
      await marketplaceApi.submitReview(companyId, {
        rating: newRating,
        comment: newComment.trim() || undefined,
        guestName: newName.trim(),
      });
      Alert.alert('Thank You!', 'Your review has been submitted.');
      setShowModal(false);
      setNewRating(5);
      setNewComment('');
      setNewName('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const StarRow = ({ rating, size = 14, color = '#F59E0B' }: { rating: number; size?: number; color?: string }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= rating ? 'star' : 'star-outline'} size={size} color={s <= rating ? color : '#64748B'} />
      ))}
    </View>
  );

  const BreakdownBar = ({ label, count, total: t }: { label: string; count: number; total: number }) => {
    const pct = t > 0 ? (count / t) * 100 : 0;
    return (
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.breakdownCount}>{count}</Text>
      </View>
    );
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatar}>
          <Text style={styles.reviewAvatarText}>{item.customerName?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewName}>{item.customerName || 'Anonymous'}</Text>
          <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <StarRow rating={item.rating} size={12} />
      </View>
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
      {item.reply && (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>Store Reply:</Text>
          <Text style={styles.replyText}>{item.reply}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Reviews — {storeName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderReview}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          summary ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <Text style={styles.avgRating}>{summary.averageRating.toFixed(1)}</Text>
                <StarRow rating={Math.round(summary.averageRating)} size={18} />
                <Text style={styles.totalReviews}>{summary.totalReviews} reviews</Text>
              </View>
              <View style={styles.summaryRight}>
                <BreakdownBar label="5" count={summary.breakdown.s5} total={summary.totalReviews} />
                <BreakdownBar label="4" count={summary.breakdown.s4} total={summary.totalReviews} />
                <BreakdownBar label="3" count={summary.breakdown.s3} total={summary.totalReviews} />
                <BreakdownBar label="2" count={summary.breakdown.s2} total={summary.totalReviews} />
                <BreakdownBar label="1" count={summary.breakdown.s1} total={summary.totalReviews} />
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptyHint}>Be the first to review this store!</Text>
          </View>
        }
      />

      {/* Write Review Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Ionicons name="create" size={20} color="#FFF" />
        <Text style={styles.fabText}>Write Review</Text>
      </TouchableOpacity>

      {/* Submit Review Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Your Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.modalLabel}>Rating</Text>
            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setNewRating(s)}>
                  <Ionicons
                    name={s <= newRating ? 'star' : 'star-outline'}
                    size={32}
                    color={s <= newRating ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Comment (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.commentInput]}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Share your experience..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitLoading}
              activeOpacity={0.8}
            >
              {submitLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 80 },
  summaryCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  avgRating: { fontSize: 36, fontWeight: '800', color: '#1F2937' },
  totalReviews: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  summaryRight: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  breakdownLabel: { width: 14, fontSize: 11, color: '#6B7280', textAlign: 'center' },
  barBg: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginHorizontal: 8 },
  barFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  breakdownCount: { width: 24, fontSize: 11, color: '#6B7280', textAlign: 'right' },
  reviewCard: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  reviewAvatarText: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },
  reviewName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  reviewDate: { fontSize: 11, color: '#9CA3AF' },
  reviewComment: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
  replyBox: {
    marginTop: 8, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: '#4F46E5',
  },
  replyLabel: { fontSize: 11, fontWeight: '600', color: '#4F46E5', marginBottom: 2 },
  replyText: { fontSize: 12, color: '#4B5563' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#D1D5DB', marginTop: 4 },
  fab: {
    position: 'absolute', bottom: 24, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4F46E5', paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 28, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8,
  },
  fabText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1F2937',
  },
  commentInput: { height: 100 },
  starPicker: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  submitBtn: {
    backgroundColor: '#4F46E5', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center', marginTop: 20,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
