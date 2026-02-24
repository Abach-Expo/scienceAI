import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { Button, Card, LoadingOverlay, ModalSheet, Input } from '../components/ui';
import { useProjectStore } from '../store/projectStore';

export const ProjectScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { projectId } = route.params;

  const {
    currentProject,
    documents,
    outline,
    isLoading,
    fetchProject,
    fetchDocuments,
    generateOutline,
    generateDraft,
    analyzeDocument,
    improveStyle,
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'outline' | 'documents' | 'references'>('outline');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAction, setAiAction] = useState<string>('');
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  useEffect(() => {
    fetchProject(projectId);
    fetchDocuments(projectId);
  }, [projectId]);

  const handleGenerateOutline = async () => {
    if (!currentProject) return;
    setGeneratingOutline(true);
    try {
      await generateOutline(currentProject.title, projectId, currentProject.type);
    } catch (error) {
      console.error('Failed to generate outline:', error);
    }
    setGeneratingOutline(false);
  };

  const handleGenerateDraft = async (section?: string) => {
    setGeneratingDraft(true);
    try {
      const doc = await generateDraft(projectId, section);
      navigation.navigate('Editor', { documentId: doc.id });
    } catch (error) {
      console.error('Failed to generate draft:', error);
    }
    setGeneratingDraft(false);
  };

  const renderOutlineSection = (section: any, index: number, depth: number = 0) => (
    <Animated.View
      key={`${section.title}-${index}`}
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={[styles.outlineSection, { marginLeft: depth * 16 }]}
    >
      <View style={styles.outlineSectionHeader}>
        <View style={styles.outlineBullet} />
        <Text style={styles.outlineSectionTitle}>{section.title}</Text>
        {section.estimatedWords && (
          <Text style={styles.outlineWords}>~{section.estimatedWords} words</Text>
        )}
      </View>
      {section.description && (
        <Text style={styles.outlineSectionDesc}>{section.description}</Text>
      )}
      {section.subsections?.map((sub: any, subIndex: number) =>
        renderOutlineSection(sub, subIndex, depth + 1)
      )}
      <TouchableOpacity
        style={styles.generateSectionButton}
        onPress={() => handleGenerateDraft(section.title)}
      >
        <Ionicons name="sparkles" size={14} color={theme.colors.accent.primary} />
        <Text style={styles.generateSectionText}>Generate this section</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const tabs = [
    { key: 'outline', label: 'Outline', icon: 'list-outline' },
    { key: 'documents', label: 'Documents', icon: 'document-text-outline' },
    { key: 'references', label: 'References', icon: 'bookmark-outline' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LoadingOverlay
        visible={generatingOutline || generatingDraft}
        message={generatingOutline ? 'Generating outline with AI...' : 'Writing draft with AI...'}
      />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.projectType}>{currentProject?.type?.replace('_', ' ')}</Text>
          <Text style={styles.projectTitle} numberOfLines={2}>
            {currentProject?.title}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowAIModal(true)}
        >
          <Ionicons name="sparkles" size={24} color={theme.colors.accent.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Tabs */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? theme.colors.accent.primary : theme.colors.text.tertiary}
            />
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'outline' && (
          <View>
            {!outline || outline.length === 0 ? (
              <Card variant="glass" style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.text.muted} />
                <Text style={styles.emptyTitle}>No outline yet</Text>
                <Text style={styles.emptySubtitle}>
                  Generate an AI-powered outline for your research
                </Text>
                <Button
                  title="Generate Outline"
                  variant="gradient"
                  icon={<Ionicons name="sparkles" size={18} color={theme.colors.text.primary} style={{ marginRight: 8 }} />}
                  onPress={handleGenerateOutline}
                  loading={generatingOutline}
                  style={{ marginTop: theme.spacing.lg }}
                />
              </Card>
            ) : (
              <View>
                <View style={styles.outlineHeader}>
                  <Text style={styles.outlineTitle}>Research Outline</Text>
                  <Button
                    title="Regenerate"
                    variant="ghost"
                    size="sm"
                    onPress={handleGenerateOutline}
                  />
                </View>
                {outline.map((section, index) => renderOutlineSection(section, index))}
                
                <Button
                  title="Generate Complete Draft"
                  variant="gradient"
                  onPress={() => handleGenerateDraft()}
                  loading={generatingDraft}
                  style={{ marginTop: theme.spacing.lg }}
                />
              </View>
            )}
          </View>
        )}

        {activeTab === 'documents' && (
          <View>
            {documents.length === 0 ? (
              <Card variant="glass" style={styles.emptyState}>
                <Ionicons name="documents-outline" size={48} color={theme.colors.text.muted} />
                <Text style={styles.emptyTitle}>No documents yet</Text>
                <Text style={styles.emptySubtitle}>
                  Generate your first draft or create a new document
                </Text>
              </Card>
            ) : (
              documents.map((doc, index) => (
                <Animated.View
                  key={doc.id}
                  entering={FadeInDown.delay(index * 50).duration(300)}
                >
                  <Card
                    variant="elevated"
                    onPress={() => navigation.navigate('Editor', { documentId: doc.id })}
                    style={styles.documentCard}
                  >
                    <View style={styles.documentHeader}>
                      <Text style={styles.documentTitle}>{doc.title}</Text>
                      <View style={styles.versionBadge}>
                        <Text style={styles.versionText}>v{doc.version}</Text>
                      </View>
                    </View>
                    <Text style={styles.documentPreview} numberOfLines={2}>
                      {doc.content.substring(0, 150)}...
                    </Text>
                    <View style={styles.documentMeta}>
                      <Text style={styles.documentDate}>
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </Text>
                      <Text style={styles.documentWords}>
                        {doc.content.split(/\s+/).length} words
                      </Text>
                    </View>
                  </Card>
                </Animated.View>
              ))
            )}
          </View>
        )}

        {activeTab === 'references' && (
          <View>
            <Card variant="glass" style={styles.emptyState}>
              <Ionicons name="library-outline" size={48} color={theme.colors.text.muted} />
              <Text style={styles.emptyTitle}>No references yet</Text>
              <Text style={styles.emptySubtitle}>
                Search for scientific articles to add to your project
              </Text>
              <Button
                title="Search Articles"
                variant="gradient"
                icon={<Ionicons name="search" size={18} color={theme.colors.text.primary} style={{ marginRight: 8 }} />}
                onPress={() => navigation.navigate('Search', { projectId })}
                style={{ marginTop: theme.spacing.lg }}
              />
            </Card>
          </View>
        )}
      </ScrollView>

      {/* AI Actions Modal */}
      <ModalSheet
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        title="AI Actions"
      >
        <TouchableOpacity
          style={styles.aiActionItem}
          onPress={() => {
            setShowAIModal(false);
            handleGenerateOutline();
          }}
        >
          <View style={[styles.aiActionIcon, { backgroundColor: `${theme.colors.accent.primary}20` }]}>
            <Ionicons name="list" size={24} color={theme.colors.accent.primary} />
          </View>
          <View style={styles.aiActionContent}>
            <Text style={styles.aiActionTitle}>Generate Outline</Text>
            <Text style={styles.aiActionDesc}>Create a structured plan for your research</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiActionItem}
          onPress={() => {
            setShowAIModal(false);
            handleGenerateDraft();
          }}
        >
          <View style={[styles.aiActionIcon, { backgroundColor: `${theme.colors.success}20` }]}>
            <Ionicons name="document-text" size={24} color={theme.colors.success} />
          </View>
          <View style={styles.aiActionContent}>
            <Text style={styles.aiActionTitle}>Generate Draft</Text>
            <Text style={styles.aiActionDesc}>Write a complete draft based on outline</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiActionItem}
          onPress={() => {
            setShowAIModal(false);
            navigation.navigate('Search', { projectId });
          }}
        >
          <View style={[styles.aiActionIcon, { backgroundColor: `${theme.colors.info}20` }]}>
            <Ionicons name="search" size={24} color={theme.colors.info} />
          </View>
          <View style={styles.aiActionContent}>
            <Text style={styles.aiActionTitle}>Find References</Text>
            <Text style={styles.aiActionDesc}>Search ArXiv and Semantic Scholar</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiActionItem}
          onPress={() => {
            setShowAIModal(false);
            // Navigate to analysis
          }}
        >
          <View style={[styles.aiActionIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
            <Ionicons name="analytics" size={24} color={theme.colors.warning} />
          </View>
          <View style={styles.aiActionContent}>
            <Text style={styles.aiActionTitle}>Analyze & Review</Text>
            <Text style={styles.aiActionDesc}>Check logic, facts, and grammar</Text>
          </View>
        </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
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
  headerContent: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  projectType: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  projectTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${theme.colors.accent.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  tabActive: {
    backgroundColor: `${theme.colors.accent.primary}15`,
  },
  tabText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginLeft: theme.spacing.xs,
  },
  tabTextActive: {
    color: theme.colors.accent.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
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
  outlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  outlineTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  outlineSection: {
    marginBottom: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border.subtle,
  },
  outlineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  outlineBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent.primary,
    marginRight: theme.spacing.sm,
  },
  outlineSectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  outlineWords: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.muted,
    marginLeft: theme.spacing.sm,
  },
  outlineSectionDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  generateSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  generateSectionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.accent.primary,
    marginLeft: theme.spacing.xs,
  },
  documentCard: {
    marginBottom: theme.spacing.sm,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  documentTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  versionBadge: {
    backgroundColor: theme.colors.background.tertiary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  versionText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  documentPreview: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  documentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  documentDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.muted,
  },
  documentWords: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.muted,
  },
  aiActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  aiActionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiActionContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  aiActionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  aiActionDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});
