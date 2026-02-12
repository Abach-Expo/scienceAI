import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme';
import { Input, Button, Card, LoadingOverlay } from '../../components/ui';
import { searchService } from '../../services/api';

interface SearchResult {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  year?: number;
  url: string;
  source: string;
  citationCount?: number;
}

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const projectId = route.params?.projectId;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSource, setSearchSource] = useState<'combined' | 'arxiv' | 'semantic'>('combined');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      let data;
      switch (searchSource) {
        case 'arxiv':
          data = await searchService.searchArxiv(query);
          break;
        case 'semantic':
          data = await searchService.searchSemanticScholar(query);
          break;
        default:
          data = await searchService.searchCombined(query);
      }
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setIsLoading(false);
  };

  const handleSaveReference = async (result: SearchResult) => {
    if (!projectId) return;
    
    try {
      await searchService.saveReference(projectId, result);
      setSavedIds(new Set([...savedIds, result.id]));
    } catch (error) {
      console.error('Failed to save reference:', error);
    }
  };

  const renderResult = ({ item, index }: { item: SearchResult; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <Card variant="elevated" style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={[styles.sourceBadge, { 
            backgroundColor: item.source === 'ARXIV' 
              ? `${theme.colors.warning}20` 
              : `${theme.colors.info}20` 
          }]}>
            <Text style={[styles.sourceText, {
              color: item.source === 'ARXIV' ? theme.colors.warning : theme.colors.info
            }]}>
              {item.source}
            </Text>
          </View>
          {item.year && <Text style={styles.yearText}>{item.year}</Text>}
        </View>

        <Text style={styles.resultTitle}>{item.title}</Text>
        
        {item.authors?.length > 0 && (
          <Text style={styles.authorsText} numberOfLines={1}>
            {item.authors.slice(0, 3).join(', ')}
            {item.authors.length > 3 && ` +${item.authors.length - 3} more`}
          </Text>
        )}

        {item.abstract && (
          <Text style={styles.abstractText} numberOfLines={3}>
            {item.abstract}
          </Text>
        )}

        {item.citationCount !== undefined && (
          <View style={styles.citationsContainer}>
            <Ionicons name="bookmark" size={14} color={theme.colors.text.muted} />
            <Text style={styles.citationsText}>{item.citationCount} citations</Text>
          </View>
        )}

        <View style={styles.resultActions}>
          <TouchableOpacity 
            style={styles.resultAction}
            onPress={() => {/* Open URL */}}
          >
            <Ionicons name="open-outline" size={18} color={theme.colors.accent.primary} />
            <Text style={styles.resultActionText}>View</Text>
          </TouchableOpacity>

          {projectId && (
            <TouchableOpacity
              style={[styles.resultAction, savedIds.has(item.id) && styles.savedAction]}
              onPress={() => handleSaveReference(item)}
              disabled={savedIds.has(item.id)}
            >
              <Ionicons 
                name={savedIds.has(item.id) ? 'checkmark' : 'add'} 
                size={18} 
                color={savedIds.has(item.id) ? theme.colors.success : theme.colors.accent.primary} 
              />
              <Text style={[
                styles.resultActionText,
                savedIds.has(item.id) && { color: theme.colors.success }
              ]}>
                {savedIds.has(item.id) ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LoadingOverlay visible={isLoading} message="Searching articles..." />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Articles</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Search Input */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.searchContainer}>
        <Input
          placeholder="Search scientific articles..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          icon={<Ionicons name="search" size={20} color={theme.colors.text.muted} />}
          rightIcon={
            query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.text.muted} />
              </TouchableOpacity>
            ) : undefined
          }
          containerStyle={{ marginBottom: 0 }}
        />

        {/* Source Filters */}
        <View style={styles.sourceFilters}>
          {(['combined', 'arxiv', 'semantic'] as const).map((source) => (
            <TouchableOpacity
              key={source}
              style={[
                styles.sourceFilter,
                searchSource === source && styles.sourceFilterActive,
              ]}
              onPress={() => setSearchSource(source)}
            >
              <Text style={[
                styles.sourceFilterText,
                searchSource === source && styles.sourceFilterTextActive,
              ]}>
                {source === 'combined' ? 'All' : source === 'arxiv' ? 'ArXiv' : 'Semantic Scholar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Search"
          variant="gradient"
          onPress={handleSearch}
          disabled={!query.trim()}
          loading={isLoading}
        />
      </Animated.View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        contentContainerStyle={styles.resultsContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={theme.colors.text.muted} />
              <Text style={styles.emptyTitle}>
                {query ? 'No results found' : 'Search for articles'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query 
                  ? 'Try different keywords or filters'
                  : 'Find scientific papers from ArXiv and Semantic Scholar'
                }
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  searchContainer: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  sourceFilters: {
    flexDirection: 'row',
    marginVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sourceFilter: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  sourceFilterActive: {
    backgroundColor: `${theme.colors.accent.primary}20`,
    borderColor: theme.colors.accent.primary,
  },
  sourceFilterText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  sourceFilterTextActive: {
    color: theme.colors.accent.primary,
    fontWeight: '500',
  },
  resultsContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  resultCard: {
    marginBottom: theme.spacing.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sourceBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  sourceText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  yearText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.muted,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  authorsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  abstractText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  citationsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  citationsText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.muted,
    marginLeft: theme.spacing.xs,
  },
  resultActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  resultAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  savedAction: {
    opacity: 0.7,
  },
  resultActionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.accent.primary,
    marginLeft: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xl,
  },
});
