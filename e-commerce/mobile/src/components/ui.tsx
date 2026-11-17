import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '../navigation/Router';
import { useStoreFooter } from '../navigation/StoreFooterContext';
import { maxContentWidth, colors, fonts, radius, shadow, spacing, statusColors, type } from '../theme';
import { assetUrl } from '../format';

type TextVariant = keyof typeof type;

export function AppText({
  children,
  variant = 'body',
  color,
  weight,
  align,
  style,
  numberOfLines,
  onPress,
}: {
  children?: React.ReactNode;
  variant?: TextVariant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onPress?: () => void;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      style={[
        type[variant],
        variant === 'display' || variant === 'h1' || variant === 'h2' ? { fontFamily: fonts?.display } : null,
        color ? { color } : null,
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Page({
  children,
  scroll = true,
  padded = true,
  onRefresh,
  refreshing = false,
  gap = spacing.xl,
  contentStyle,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  gap?: number;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const footer = useStoreFooter();
  const content = (
    <View
      style={[
        styles.pageContent,
        padded && { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
        gap ? { gap } : null,
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.page, style]} edges={['left', 'right']}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {content}
          {footer}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {content}
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  full = false,
  style,
  textStyle,
  left,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  left?: React.ReactNode;
  testID?: string;
}) {
  const inactive = disabled || loading;
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
    secondary: { bg: colors.ink, fg: colors.white, border: colors.ink },
    outline: { bg: 'transparent', fg: colors.ink, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.inkSoft, border: 'transparent' },
    danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
    link: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  };
  const colorsForVariant = palette[variant];
  const height = size === 'sm' ? 34 : size === 'lg' ? 52 : 44;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: colorsForVariant.bg,
          borderColor: colorsForVariant.border,
          paddingHorizontal: variant === 'link' ? 0 : size === 'sm' ? spacing.md : spacing.lg,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        },
        full && { alignSelf: 'stretch' },
        style,
        cursorStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colorsForVariant.fg} size="small" />
      ) : (
        <View style={styles.buttonInner}>
          {left}
          <Text
            style={[
              { color: colorsForVariant.fg, fontSize, fontWeight: '600', textAlign: 'center' },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  helper,
  style,
  inputStyle,
  ...props
}: TextInputProps & {
  label?: string;
  error?: string | null;
  helper?: string | null;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <AppText variant="label" color={colors.inkSoft}>{label}</AppText> : null}
      <TextInput
        {...props}
        onFocus={e => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor={colors.faint}
        selectionColor={colors.primary}
        style={[
          styles.input,
          props.multiline ? { height: 104, paddingTop: spacing.md, textAlignVertical: 'top' } : null,
          focused ? { borderColor: colors.primary } : null,
          error ? { borderColor: colors.danger } : null,
          inputStyle,
        ]}
      />
      {error ? (
        <AppText variant="tiny" color={colors.danger}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="tiny" color={colors.faint}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

export interface SelectOption<T = string> {
  label: string;
  value: T;
  hint?: string;
}

export function SelectField<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled,
  allowClear,
  style,
}: {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  allowClear?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <AppText variant="label" color={colors.inkSoft}>{label}</AppText> : null}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={({ pressed }) => [
          styles.select,
          { opacity: disabled ? 0.55 : pressed ? 0.85 : 1 },
          error ? { borderColor: colors.danger } : null,
          cursorStyle,
        ]}
      >
        <AppText variant="body" color={selected ? colors.ink : colors.faint} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </AppText>
        <AppText variant="tiny" color={colors.muted}>v</AppText>
      </Pressable>
      {error ? <AppText variant="tiny" color={colors.danger}>{error}</AppText> : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.selectPanel} onPress={() => {}}>
            <AppText variant="h3" style={{ marginBottom: spacing.md }}>{label ?? 'Choose'}</AppText>
            <ScrollView style={{ maxHeight: 380 }}>
              {allowClear ? (
                <Pressable
                  style={styles.optionRow}
                  onPress={() => {
                    onChange(null as T);
                    setOpen(false);
                  }}
                >
                  <AppText variant="body" color={colors.muted}>{placeholder}</AppText>
                </Pressable>
              ) : null}
              {options.map(option => (
                <Pressable
                  key={String(option.value)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    option.value === value && { backgroundColor: colors.primarySoft },
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" weight={option.value === value ? '600' : '400'}>
                      {option.label}
                    </AppText>
                    {option.hint ? <AppText variant="tiny" color={colors.faint}>{option.hint}</AppText> : null}
                  </View>
                  {option.value === value ? <AppText variant="small" color={colors.primary}>Selected</AppText> : null}
                </Pressable>
              ))}
              {options.length === 0 ? (
                <AppText variant="small" color={colors.faint} style={{ padding: spacing.md }}>
                  Nothing to choose from yet.
                </AppText>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const content = (
    <View style={[styles.card, padded && { padding: spacing.lg }, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, cursorStyle]}>
      {content}
    </Pressable>
  );
}

export function Badge({ label, tone }: { label: string; tone?: { bg: string; fg: string } }) {
  const palette = tone ?? statusColors[label] ?? { bg: colors.surfaceAlt, fg: colors.inkSoft };
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={{ color: palette.fg, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <View style={styles.centerBox}>
      <ActivityIndicator color={colors.primary} />
      {label ? (
        <AppText variant="small" color={colors.muted} style={{ marginTop: spacing.sm }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.empty, compact && { paddingVertical: spacing.xl }]}>
      <AppText variant="h3" align="center">{title}</AppText>
      {message ? (
        <AppText variant="small" color={colors.muted} align="center" style={{ maxWidth: 420 }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="primary" size="sm" style={{ marginTop: spacing.sm }} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <AppText variant="h3" align="center">Something went wrong</AppText>
      <AppText variant="small" color={colors.muted} align="center" style={{ maxWidth: 420 }}>
        {message}
      </AppText>
      {onRetry ? <Button label="Try again" onPress={onRetry} size="sm" style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}

export function Section({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: spacing.md }, style]}>
      {title ? (
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant="h2">{title}</AppText>
            {subtitle ? <AppText variant="small" color={colors.muted} style={{ marginTop: 2 }}>{subtitle}</AppText> : null}
          </View>
          {actionLabel && onAction ? (
            <Button label={actionLabel} variant="ghost" size="sm" onPress={onAction} />
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back = false,
  onBack,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.pageHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 }}>
        {back ? (
          <Pressable
            onPress={onBack ?? router.goBack}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }, cursorStyle]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppText variant="title" color={colors.ink}>{'<'}</AppText>
          </Pressable>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="h1" numberOfLines={2}>{title}</AppText>
          {subtitle ? (
            <AppText variant="small" color={colors.muted} style={{ marginTop: 4 }}>{subtitle}</AppText>
          ) : null}
        </View>
      </View>
      {actions ? <View style={styles.headerActions}>{actions}</View> : null}
    </View>
  );
}

export function RatingStars({ rating, size = 13, showValue = false }: { rating: number; size?: number; showValue?: boolean }) {
  const rounded = Math.round(rating * 2) / 2;
  const stars = [1, 2, 3, 4, 5].map(n => (rounded >= n ? '★' : rounded >= n - 0.5 ? '⯨' : '☆'));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {stars.map((star, index) => (
        <Text key={index} style={{ color: colors.gold, fontSize: size }}>{star}</Text>
      ))}
      {showValue ? (
        <AppText variant="tiny" color={colors.muted} style={{ marginLeft: 4 }}>
          {rating.toFixed(1)}
        </AppText>
      ) : null}
    </View>
  );
}

export function ProductImage({
  url,
  name,
  height,
  style,
  radiusValue = radius.lg,
}: {
  url?: string | null;
  name?: string;
  height: number;
  style?: StyleProp<ViewStyle>;
  radiusValue?: number;
}) {
  const resolved = assetUrl(url);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !!resolved && failedUrl !== resolved;
  return (
    <View style={[{ height, borderRadius: radiusValue, overflow: 'hidden', backgroundColor: colors.surfaceAlt }, style]}>
      {showImage ? (
        <Image
          source={{ uri: resolved }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setFailedUrl(resolved)}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="h1" color={colors.faint}>{(name ?? 'S').slice(0, 1)}</AppText>
        </View>
      )}
    </View>
  );
}

export function Avatar({ name, url, size = 40 }: { name?: string | null; url?: string | null; size?: number }) {
  const resolved = assetUrl(url);
  const label = (name ?? 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {resolved ? (
        <Image source={{ uri: resolved }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: size * 0.36 }}>{label}</Text>
      )}
    </View>
  );
}

export function ModalSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 640,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const panelWidth = Math.min(width, windowWidth - spacing.lg * 2);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalPanel, { width: panelWidth, maxHeight: '92%' }, shadow as ViewStyle]}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="h2">{title}</AppText>
              {subtitle ? <AppText variant="small" color={colors.muted} style={{ marginTop: 2 }}>{subtitle}</AppText> : null}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }, cursorStyle]}
            >
              <AppText variant="h3" color={colors.muted}>×</AppText>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems?: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pagination}>
      <Button label="Previous" size="sm" variant="outline" disabled={page <= 1} onPress={() => onChange(page - 1)} />
      <AppText variant="small" color={colors.muted}>
        Page {page} of {totalPages}{typeof totalItems === 'number' ? ` · ${totalItems} total` : ''}
      </AppText>
      <Button
        label="Next"
        size="sm"
        variant="outline"
        disabled={page >= totalPages}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: { key: string; label: string; badge?: number }[];
  active: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={[styles.tabs, style]}>
      {tabs.map(tab => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              selected && { backgroundColor: colors.ink, borderColor: colors.ink },
              pressed && { opacity: 0.8 },
              cursorStyle,
            ]}
          >
            <AppText variant="small" weight="600" color={selected ? colors.white : colors.inkSoft}>
              {tab.label}{typeof tab.badge === 'number' && tab.badge > 0 ? `  ${tab.badge}` : ''}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="title">{label}</AppText>
        {description ? <AppText variant="tiny" color={colors.muted} style={{ marginTop: 2 }}>{description}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: accent ?? colors.primary }} />
      <AppText variant="tiny" color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
        {label}
      </AppText>
      <AppText variant="h2" numberOfLines={1}>{value}</AppText>
      {hint ? <AppText variant="tiny" color={colors.faint}>{hint}</AppText> : null}
    </View>
  );
}

export function KeyValue({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <View style={styles.keyValue}>
      <AppText variant="small" color={colors.muted} style={{ flex: 1 }}>{label}</AppText>
      {typeof value === 'string' || typeof value === 'number' ? (
        <AppText variant="small" weight={strong ? '700' : '500'} style={{ textAlign: 'right', flexShrink: 1 }}>
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

export function AlertBox({
  message,
  tone = 'info',
  title,
}: {
  message: string;
  tone?: 'info' | 'success' | 'danger' | 'warning';
  title?: string;
}) {
  const palette = {
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  }[tone];
  return (
    <View style={{ backgroundColor: palette.bg, borderRadius: radius.md, padding: spacing.md, gap: 2 }}>
      {title ? <AppText variant="label" color={palette.fg}>{title}</AppText> : null}
      <AppText variant="small" color={palette.fg}>{message}</AppText>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search products…',
  style,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.searchBox, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        style={styles.searchInput}
      />
      <Button label="Search" size="sm" variant="secondary" onPress={onSubmit} />
    </View>
  );
}

const cursorStyle = typeof document !== 'undefined' ? ({ cursor: 'pointer' } as any) : undefined;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  pageContent: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
  },
  button: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    ...(typeof document !== 'undefined' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  select: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  selectPanel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  optionRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  modalPanel: {
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  tabsScroll: { flexGrow: 0 },
  tabs: { gap: spacing.sm, paddingBottom: 2, alignItems: 'flex-start' },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: 6,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 6,
  },
  keyValue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.border },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: 4,
    flex: 1,
    minWidth: 220,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.ink,
    ...(typeof document !== 'undefined' ? ({ outlineStyle: 'none' } as any) : {}),
  },
});
