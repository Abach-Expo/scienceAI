import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { theme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  onPress?: () => void;
  style?: ViewStyle;
  animationDelay?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  style,
  animationDelay = 0,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'glass':
        return styles.glass;
      case 'gradient':
        return styles.gradientCard;
      default:
        return styles.default;
    }
  };

  if (variant === 'gradient') {
    return (
      <Animated.View
        entering={FadeInDown.delay(animationDelay).duration(400).springify()}
        style={animatedStyle}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={onPress ? 0.9 : 1}
          disabled={!onPress}
        >
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.15)', 'rgba(99, 102, 241, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, styles.gradientCard, style]}
          >
            {children}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const CardContent = (
    <View style={[styles.card, getVariantStyles(), style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Animated.View
        entering={FadeInDown.delay(animationDelay).duration(400).springify()}
        style={animatedStyle}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {CardContent}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(400).springify()}
    >
      {CardContent}
    </Animated.View>
  );
};

// Specialized card for project items
interface ProjectCardProps {
  title: string;
  description?: string;
  status: string;
  progress: number;
  onPress: () => void;
  animationDelay?: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  status,
  progress,
  onPress,
  animationDelay = 0,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'IN_PROGRESS':
        return theme.colors.accent.primary;
      case 'REVIEW':
        return theme.colors.warning;
      default:
        return theme.colors.text.tertiary;
    }
  };

  return (
    <Card variant="elevated" onPress={onPress} animationDelay={animationDelay}>
      <View style={styles.projectHeader}>
        <Text style={styles.projectTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{status.replace('_', ' ')}</Text>
        </View>
      </View>
      {description && (
        <Text style={styles.projectDescription} numberOfLines={2}>
          {description}
        </Text>
      )}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: getStatusColor() },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  default: {
    backgroundColor: theme.colors.background.card,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  elevated: {
    backgroundColor: theme.colors.background.elevated,
    ...theme.shadows.md,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  gradientCard: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  projectTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  projectDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textTransform: 'uppercase',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  progressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
});
