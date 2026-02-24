import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { Button, Card, ProjectCard, Input, AnalyticsSummary, ModalSheet } from '../components/ui';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../i18n/translations';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { projects, isLoading, fetchProjects, createProject } = useProjectStore();
  const { t } = useLanguageStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectType, setNewProjectType] = useState('THESIS');

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;
    
    try {
      const project = await createProject(newProjectTitle, newProjectType);
      setShowNewProjectModal(false);
      setNewProjectTitle('');
      navigation.navigate('Project', { projectId: project.id });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const totalAnalytics = {
    wordCount: projects.reduce((sum, p) => sum + (p.analytics?.[0]?.wordCount || 0), 0),
    sectionCount: projects.reduce((sum, p) => sum + (p._count?.documents || 0), 0),
    referenceCount: projects.reduce((sum, p) => sum + (p._count?.references || 0), 0),
    completionPercent: projects.length > 0 
      ? projects.reduce((sum, p) => sum + (p.analytics?.[0]?.completionPercent || 0), 0) / projects.length 
      : 0,
  };

  const projectTypes = [
    { value: 'THESIS', label: 'Thesis' },
    { value: 'DISSERTATION', label: 'Dissertation' },
    { value: 'RESEARCH_PAPER', label: 'Research Paper' },
    { value: 'ARTICLE', label: 'Article' },
    { value: 'REVIEW', label: 'Review' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t.welcomeBack}</Text>
            <Text style={styles.userName}>{user?.name || 'Researcher'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle" size={40} color={theme.colors.accent.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Action Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <LinearGradient
            colors={theme.colors.accent.gradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionCard}
          >
            <View style={styles.quickActionContent}>
              <Text style={styles.quickActionTitle}>{t.startResearch}</Text>
              <Text style={styles.quickActionSubtitle}>
                {t.startResearchDesc}
              </Text>
              <Button
                title={t.newProject}
                variant="secondary"
                onPress={() => setShowNewProjectModal(true)}
                style={styles.quickActionButton}
                textStyle={{ color: theme.colors.text.primary }}
              />
            </View>
            <View style={styles.quickActionIcon}>
              <Ionicons name="sparkles" size={80} color="rgba(255,255,255,0.2)" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Analytics Summary */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <AnalyticsSummary {...totalAnalytics} />
        </Animated.View>

        {/* Recent Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.recentProjects}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
              <Text style={styles.seeAll}>{t.seeAll}</Text>
            </TouchableOpacity>
          </View>

          {projects.length === 0 ? (
            <Card variant="glass" style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.text.muted} />
              <Text style={styles.emptyTitle}>{t.noProjectsYet}</Text>
              <Text style={styles.emptySubtitle}>
                {t.createFirst}
              </Text>
              <Button
                title={t.create}
                variant="gradient"
                onPress={() => setShowNewProjectModal(true)}
                style={{ marginTop: theme.spacing.md }}
              />
            </Card>
          ) : (
            projects.slice(0, 3).map((project, index) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                description={project.description}
                status={project.status}
                progress={project.analytics?.[0]?.completionPercent || 0}
                onPress={() => navigation.navigate('Project', { projectId: project.id })}
                animationDelay={300 + index * 100}
              />
            ))
          )}
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.quickActions}</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Search')}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${theme.colors.info}20` }]}>
                <Ionicons name="search" size={24} color={theme.colors.info} />
              </View>
              <Text style={styles.actionLabel}>{t.searchArticles}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Projects')}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${theme.colors.success}20` }]}>
                <Ionicons name="document-text" size={24} color={theme.colors.success} />
              </View>
              <Text style={styles.actionLabel}>{t.myDrafts}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
                <Ionicons name="analytics" size={24} color={theme.colors.warning} />
              </View>
              <Text style={styles.actionLabel}>{t.analytics}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('Projects')}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${theme.colors.accent.primary}20` }]}>
                <Ionicons name="download" size={24} color={theme.colors.accent.primary} />
              </View>
              <Text style={styles.actionLabel}>{t.export}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* New Project Modal */}
      <ModalSheet
        visible={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        title="New Research Project"
      >
        <Input
          label={t.projectTitle}
          placeholder={t.startResearchDesc}
          value={newProjectTitle}
          onChangeText={setNewProjectTitle}
          multiline
        />

        <Text style={styles.typeLabel}>{t.projectType}</Text>
        <View style={styles.typeOptions}>
          {projectTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeOption,
                newProjectType === type.value && styles.typeOptionSelected,
              ]}
              onPress={() => setNewProjectType(type.value)}
            >
              <Text
                style={[
                  styles.typeOptionText,
                  newProjectType === type.value && styles.typeOptionTextSelected,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={t.createAndGenerate}
          variant="gradient"
          onPress={handleCreateProject}
          disabled={!newProjectTitle.trim()}
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
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  userName: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  profileButton: {
    padding: theme.spacing.xs,
  },
  quickActionCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  quickActionContent: {
    flex: 1,
    zIndex: 1,
  },
  quickActionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  quickActionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: theme.spacing.md,
  },
  quickActionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-start',
  },
  quickActionIcon: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.5,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  seeAll: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.accent.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
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
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  actionItem: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  typeLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.sm,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  typeOptionSelected: {
    backgroundColor: `${theme.colors.accent.primary}20`,
    borderColor: theme.colors.accent.primary,
  },
  typeOptionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  typeOptionTextSelected: {
    color: theme.colors.accent.primary,
    fontWeight: '500',
  },
});
