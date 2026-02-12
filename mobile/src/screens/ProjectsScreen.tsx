import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { useProjectStore } from '../store/projectStore';
import { ModalSheet, Input, Button } from '../components/ui';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: theme.colors.text.muted,
  IN_PROGRESS: theme.colors.info,
  REVIEW: theme.colors.warning,
  COMPLETED: theme.colors.success,
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
};

export const ProjectsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { projects, isLoading, fetchProjects, createProject, deleteProject } = useProjectStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('THESIS');
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const project = await createProject(newTitle, newType);
      setShowNewModal(false);
      setNewTitle('');
      navigation.navigate('Project', { projectId: project.id });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const filteredProjects = filter
    ? projects.filter(p => p.status === filter)
    : projects;

  const projectTypes = [
    { value: 'THESIS', label: 'Thesis' },
    { value: 'DISSERTATION', label: 'Dissertation' },
    { value: 'RESEARCH_PAPER', label: 'Research Paper' },
    { value: 'ARTICLE', label: 'Article' },
    { value: 'REVIEW', label: 'Review' },
  ];

  const filters = [
    { value: null, label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'REVIEW', label: 'Review' },
    { value: 'COMPLETED', label: 'Done' },
  ];

  const renderProject = ({ item, index }: { item: any; index: number }) => {
    const progress = item.analytics?.[0]?.completionPercent || 0;
    const statusColor = STATUS_COLORS[item.status] || theme.colors.text.muted;

    return (
      <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
        <TouchableOpacity
          style={styles.projectCard}
          onPress={() => navigation.navigate('Project', { projectId: item.id })}
          activeOpacity={0.8}
        >
          <View style={styles.projectHeader}>
            <View style={styles.projectTypeIcon}>
              <Ionicons
                name={item.type === 'DISSERTATION' ? 'school' : 'document-text'}
                size={20}
                color={theme.colors.accent.primary}
              />
            </View>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>

          <Text style={styles.projectTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description && (
            <Text style={styles.projectDesc} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.projectMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="document-text-outline" size={14} color={theme.colors.text.muted} />
              <Text style={styles.metaText}>{item._count?.documents || 0} docs</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="bookmark-outline" size={14} color={theme.colors.text.muted} />
              <Text style={styles.metaText}>{item._count?.references || 0} refs</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>

          <View style={styles.projectFooter}>
            <Text style={[styles.statusBadge, { color: statusColor, borderColor: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>My Projects</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Filter tabs */}
      <Animated.ScrollView
        entering={FadeInDown.delay(100).duration(400)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map(f => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>

      {/* Projects List */}
      <FlatList
        data={filteredProjects}
        keyExtractor={item => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent.primary}
          />
        }
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={56} color={theme.colors.text.muted} />
            <Text style={styles.emptyTitle}>No projects yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first research project to get started
            </Text>
            <Button
              title="Create Project"
              variant="gradient"
              onPress={() => setShowNewModal(true)}
              style={{ marginTop: theme.spacing.lg }}
            />
          </Animated.View>
        }
      />

      {/* New Project Modal */}
      <ModalSheet
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Research Project"
      >
        <Input
          label="Project Title"
          placeholder="Enter your topic..."
          value={newTitle}
          onChangeText={setNewTitle}
          multiline
        />
        <Text style={styles.typeLabel}>Project Type</Text>
        <View style={styles.typeOptions}>
          {projectTypes.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.typeChip, newType === t.value && styles.typeChipActive]}
              onPress={() => setNewType(t.value)}
            >
              <Text style={[styles.typeChipText, newType === t.value && styles.typeChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button
          title="Create & Generate Outline"
          variant="gradient"
          onPress={handleCreate}
          disabled={!newTitle.trim()}
          style={{ marginTop: theme.spacing.lg }}
        />
      </ModalSheet>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  filterChipActive: {
    backgroundColor: `${theme.colors.accent.primary}20`,
    borderColor: theme.colors.accent.primary,
  },
  filterText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: theme.colors.accent.primary,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  projectCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  projectTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: `${theme.colors.accent.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  projectDesc: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  projectMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.text.muted,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  dateText: {
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  typeChipActive: {
    backgroundColor: `${theme.colors.accent.primary}20`,
    borderColor: theme.colors.accent.primary,
  },
  typeChipText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  typeChipTextActive: {
    color: theme.colors.accent.primary,
    fontWeight: '500',
  },
});
