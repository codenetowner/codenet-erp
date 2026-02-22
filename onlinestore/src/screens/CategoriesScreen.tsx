import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { marketplaceApi, StoreCategory } from '../api/marketplace';
import type { CategoriesStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<CategoriesStackParamList>;

export default function CategoriesScreen() {
  const navigation = useNavigation<Nav>();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCategories = async () => {
    try {
      const data = await marketplaceApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
      </View>
      <FlatList
        data={categories}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCategories(); }} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CategoryStores', { categoryId: item.id, categoryName: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.emoji}>{item.icon || '🏪'}</Text>
            </View>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.count}>{item.storeCount} stores</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="grid-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No categories available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.lg,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  grid: { padding: spacing.md },
  card: {
    flex: 1, margin: spacing.sm, backgroundColor: colors.surface,
    borderRadius: borderRadius.lg, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    minHeight: 130,
  },
  iconContainer: {
    width: 56, height: 56, borderRadius: borderRadius.lg,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emoji: { fontSize: 28 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, textAlign: 'center' },
  count: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 4 },
  emptyText: { fontSize: fontSize.md, color: colors.textMuted, marginTop: spacing.md },
});
