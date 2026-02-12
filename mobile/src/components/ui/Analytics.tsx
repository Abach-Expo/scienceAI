import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  animationDelay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = theme.colors.accent.primary,
  animationDelay = 0,
}) => {
  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay).duration(500)}
      style={styles.statCard}
    >
      <LinearGradient
        colors={[`${color}20`, `${color}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.statHeader}>
          {icon && <View style={[styles.iconContainer, { backgroundColor: `${color}30` }]}>{icon}</View>}
          {trend && (
            <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? theme.colors.success : theme.colors.error }]}>
              <Text style={styles.trendText}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    </Animated.View>
  );
};

// Progress Ring Component
interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = theme.colors.accent.primary,
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressValue = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (progressValue / 100) * circumference;

  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.ringContainer}>
      <View style={[styles.ring, { width: size, height: size }]}>
        {/* Background circle */}
        <View
          style={[
            styles.ringBackground,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
            },
          ]}
        />
        {/* This would be SVG in a real implementation */}
        <View style={styles.ringCenter}>
          <Text style={styles.ringValue}>{Math.round(progressValue)}%</Text>
          {label && <Text style={styles.ringLabel}>{label}</Text>}
        </View>
      </View>
    </Animated.View>
  );
};

// Analytics Summary Component
interface AnalyticsSummaryProps {
  wordCount: number;
  sectionCount: number;
  referenceCount: number;
  completionPercent: number;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({
  wordCount,
  sectionCount,
  referenceCount,
  completionPercent,
}) => {
  return (
    <View style={styles.analyticsContainer}>
      <Text style={styles.analyticsTitle}>Project Analytics</Text>
      <View style={styles.statsRow}>
        <StatCard
          title="Words Written"
          value={wordCount.toLocaleString()}
          color={theme.colors.accent.primary}
          animationDelay={0}
        />
        <StatCard
          title="Sections"
          value={sectionCount}
          color={theme.colors.info}
          animationDelay={100}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="References"
          value={referenceCount}
          color={theme.colors.success}
          animationDelay={200}
        />
        <StatCard
          title="Completion"
          value={`${Math.round(completionPercent)}%`}
          color={theme.colors.warning}
          animationDelay={300}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  gradient: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  trendText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  statValue: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  statSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.xs,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBackground: {
    position: 'absolute',
    borderColor: theme.colors.background.tertiary,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  ringLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  analyticsContainer: {
    marginBottom: theme.spacing.lg,
  },
  analyticsTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.xs,
  },
});
