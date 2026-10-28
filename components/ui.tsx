import { type ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Colors } from '@/lib/theme';

export function LoadingView({ message = 'Memuat...' }: { message?: string }) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function EmptyView({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.centerContainer}>
      <View style={styles.emptyIconWrap}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && styles.primaryBtnDisabled,
        pressed && !disabled && styles.primaryBtnPressed,
        style,
      ]}>
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: object;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryBtn,
        disabled && styles.secondaryBtnDisabled,
        pressed && !disabled && styles.secondaryBtnPressed,
        style,
      ]}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.neutral[50],
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
  errorText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: Colors.error[600],
    textAlign: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[800],
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyAction: {
    marginTop: 24,
  },
  primaryBtn: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.neutral[300],
  },
  primaryBtnPressed: {
    backgroundColor: Colors.primary[700],
    transform: [{ scale: 0.98 }],
  },
  primaryBtnText: {
    color: Colors.neutral[0],
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  secondaryBtn: {
    backgroundColor: Colors.neutral[100],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnDisabled: {
    backgroundColor: Colors.neutral[50],
  },
  secondaryBtnPressed: {
    backgroundColor: Colors.neutral[200],
    transform: [{ scale: 0.98 }],
  },
  secondaryBtnText: {
    color: Colors.neutral[700],
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
});
