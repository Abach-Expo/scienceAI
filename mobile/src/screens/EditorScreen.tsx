import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { Button, Card, LoadingOverlay, ModalSheet } from '../../components/ui';
import { useProjectStore } from '../../store/projectStore';

export const EditorScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { documentId } = route.params;

  const {
    currentDocument,
    isLoading,
    fetchDocument,
    updateDocument,
    analyzeDocument,
    improveStyle,
  } = useProjectStore();

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [improving, setImproving] = useState(false);

  const contentRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchDocument(documentId);
  }, [documentId]);

  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content);
      setTitle(currentDocument.title);
    }
  }, [currentDocument]);

  const handleSave = async (createNewVersion = false) => {
    try {
      await updateDocument(documentId, { title, content }, createNewVersion);
      Alert.alert('Success', createNewVersion ? 'New version created!' : 'Document saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save document');
    }
  };

  const handleAnalyze = async (type: string) => {
    setAnalyzing(true);
    setShowAnalysisModal(false);
    try {
      const result = await analyzeDocument(documentId, type);
      setAnalysisResult(result);
      setShowAnalysisModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to analyze document');
    }
    setAnalyzing(false);
  };

  const handleImproveStyle = async () => {
    setImproving(true);
    try {
      const improved = await improveStyle(documentId);
      setContent(improved.content);
      Alert.alert('Success', 'Style improved! Review the changes.');
    } catch (error) {
      Alert.alert('Error', 'Failed to improve style');
    }
    setImproving(false);
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charCount = content.length;

  const analysisTypes = [
    { type: 'LOGIC', label: 'Logic & Arguments', icon: 'git-branch', color: theme.colors.accent.primary },
    { type: 'GRAMMAR', label: 'Grammar & Style', icon: 'text', color: theme.colors.success },
    { type: 'FACTS', label: 'Facts & Claims', icon: 'checkmark-circle', color: theme.colors.warning },
    { type: 'COMPREHENSIVE', label: 'Full Analysis', icon: 'analytics', color: theme.colors.info },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LoadingOverlay
        visible={analyzing || improving}
        message={analyzing ? 'Analyzing document...' : 'Improving style...'}
      />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isEditing) {
              Alert.alert(
                'Unsaved Changes',
                'Do you want to save before leaving?',
                [
                  { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
                  { text: 'Save', onPress: () => { handleSave(); navigation.goBack(); } },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowAnalysisModal(true)}
          >
            <Ionicons name="analytics" size={22} color={theme.colors.accent.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleImproveStyle}
          >
            <Ionicons name="sparkles" size={22} color={theme.colors.success} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.saveButton]}
            onPress={() => handleSave(false)}
          >
            <Ionicons name="save" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Input */}
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setIsEditing(true);
            }}
            placeholder="Document Title"
            placeholderTextColor={theme.colors.text.muted}
            multiline
          />

          {/* Content Editor */}
          <TextInput
            ref={contentRef}
            style={styles.contentInput}
            value={content}
            onChangeText={(text) => {
              setContent(text);
              setIsEditing(true);
            }}
            placeholder="Start writing your research..."
            placeholderTextColor={theme.colors.text.muted}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        {/* Footer Stats */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.footer}>
          <View style={styles.stats}>
            <Text style={styles.statText}>{wordCount} words</Text>
            <View style={styles.statDivider} />
            <Text style={styles.statText}>{charCount} characters</Text>
            <View style={styles.statDivider} />
            <Text style={styles.statText}>v{currentDocument?.version || 1}</Text>
          </View>
          
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => handleSave(true)}
            >
              <Ionicons name="git-branch" size={18} color={theme.colors.text.secondary} />
              <Text style={styles.footerButtonText}>New Version</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Analysis Modal */}
      <ModalSheet
        visible={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        title={analysisResult ? 'Analysis Results' : 'Analyze Document'}
        height={analysisResult ? 'half' : 'auto'}
      >
        {analysisResult ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Score */}
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Overall Score</Text>
              <Text style={styles.scoreValue}>{analysisResult.content?.overallScore || analysisResult.score || 0}/100</Text>
            </View>

            {/* Summary */}
            {analysisResult.content?.summary && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Summary</Text>
                <Text style={styles.analysisSectionText}>{analysisResult.content.summary}</Text>
              </View>
            )}

            {/* Issues */}
            {analysisResult.content?.issues?.length > 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Issues Found</Text>
                {analysisResult.content.issues.slice(0, 5).map((issue: any, index: number) => (
                  <View key={index} style={styles.issueItem}>
                    <View style={[
                      styles.issueSeverity,
                      { backgroundColor: issue.severity === 'high' ? theme.colors.error : 
                        issue.severity === 'medium' ? theme.colors.warning : theme.colors.info }
                    ]} />
                    <View style={styles.issueContent}>
                      <Text style={styles.issueTitle}>{issue.type}</Text>
                      <Text style={styles.issueDesc}>{issue.description}</Text>
                      {issue.suggestion && (
                        <Text style={styles.issueSuggestion}>💡 {issue.suggestion}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Button
              title="Close"
              variant="secondary"
              onPress={() => {
                setAnalysisResult(null);
                setShowAnalysisModal(false);
              }}
              style={{ marginTop: theme.spacing.md }}
            />
          </ScrollView>
        ) : (
          <View>
            <Text style={styles.analysisModalSubtitle}>
              Choose an analysis type to review your document
            </Text>
            {analysisTypes.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={styles.analysisOption}
                onPress={() => handleAnalyze(item.type)}
              >
                <View style={[styles.analysisOptionIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={styles.analysisOptionText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.text.muted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.accent.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  titleInput: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    padding: 0,
  },
  contentInput: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    lineHeight: 26,
    minHeight: 400,
    padding: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.background.secondary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.text.muted,
    marginHorizontal: theme.spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  footerButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  analysisModalSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  analysisOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  analysisOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisOptionText: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.md,
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.lg,
  },
  scoreLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  scoreValue: {
    fontSize: theme.typography.fontSize.display,
    fontWeight: '700',
    color: theme.colors.accent.primary,
    marginTop: theme.spacing.xs,
  },
  analysisSection: {
    marginBottom: theme.spacing.lg,
  },
  analysisSectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  analysisSectionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  issueItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  issueSeverity: {
    width: 4,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  issueDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  issueSuggestion: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.accent.tertiary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
});
