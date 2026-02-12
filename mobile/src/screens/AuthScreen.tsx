import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Input, Button } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useAuthStore();

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    }
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Header */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <LinearGradient
              colors={theme.colors.accent.gradient as [string, string, ...string[]]}
              style={styles.logoContainer}
            >
              <Ionicons name="flask" size={40} color={theme.colors.text.primary} />
            </LinearGradient>
            <Text style={styles.appName}>Science AI</Text>
            <Text style={styles.tagline}>Your intelligent research assistant</Text>
          </Animated.View>

          {/* Auth Form */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.formContainer}>
            <View style={styles.tabsContainer}>
              <TouchableTab
                title="Sign In"
                active={isLogin}
                onPress={() => setIsLogin(true)}
              />
              <TouchableTab
                title="Sign Up"
                active={!isLogin}
                onPress={() => setIsLogin(false)}
              />
            </View>

            {!isLogin && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <Input
                  label="Full Name"
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  icon={<Ionicons name="person-outline" size={20} color={theme.colors.text.muted} />}
                />
              </Animated.View>
            )}

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Ionicons name="mail-outline" size={20} color={theme.colors.text.muted} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.muted} />}
              rightIcon={
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.colors.text.muted}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button
              title={isLogin ? 'Sign In' : 'Create Account'}
              variant="gradient"
              onPress={handleSubmit}
              loading={isLoading}
              style={styles.submitButton}
            />

            {isLogin && (
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            )}
          </Animated.View>

          {/* Features */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.features}>
            <FeatureItem
              icon="document-text"
              title="Generate Research"
              description="AI-powered thesis and dissertation writing"
            />
            <FeatureItem
              icon="search"
              title="Find Articles"
              description="Search ArXiv and Semantic Scholar"
            />
            <FeatureItem
              icon="analytics"
              title="Smart Analysis"
              description="Logic, facts, and grammar checking"
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const TouchableTab: React.FC<{
  title: string;
  active: boolean;
  onPress: () => void;
}> = ({ title, active, onPress }) => (
  <View style={[styles.tab, active && styles.tabActive]}>
    <Text
      style={[styles.tabText, active && styles.tabTextActive]}
      onPress={onPress}
    >
      {title}
    </Text>
  </View>
);

const FeatureItem: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon as any} size={24} color={theme.colors.accent.primary} />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDesc}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  appName: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  tagline: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  formContainer: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.accent.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: theme.colors.text.primary,
  },
  submitButton: {
    marginTop: theme.spacing.md,
  },
  forgotPassword: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.accent.primary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  features: {
    marginTop: theme.spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: `${theme.colors.accent.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  featureTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  featureDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});
