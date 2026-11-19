import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card } from '../components/ui';
import { colors, radius, spacing } from '../theme';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackValue {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const counter = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    counter.current += 1;
    const id = counter.current;
    setToasts(prev => [...prev.slice(-2), { id, message, kind }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4200);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>(resolve => {
        setDialog({ ...options, resolve });
      }),
    [],
  );

  const finish = (value: boolean) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={styles.toastLayer}>
        {toasts.map(item => (
          <View
            key={item.id}
            style={[
              styles.toast,
              item.kind === 'success' && { backgroundColor: colors.successSoft, borderColor: '#BBF7D0' },
              item.kind === 'error' && { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' },
              item.kind === 'info' && { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <AppText
              variant="small"
              style={{
                color:
                  item.kind === 'success' ? colors.success : item.kind === 'error' ? colors.danger : colors.ink,
                fontWeight: '600',
              }}
            >
              {item.message}
            </AppText>
          </View>
        ))}
      </View>
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => finish(false)}>
        <Pressable style={styles.overlay} onPress={() => finish(false)}>
          <Pressable style={styles.dialogWrap} onPress={() => {}}>
            <Card style={styles.dialog}>
              <AppText variant="h3">{dialog?.title}</AppText>
              {dialog?.message ? (
                <AppText variant="body" color={colors.muted} style={{ marginTop: spacing.sm }}>
                  {dialog.message}
                </AppText>
              ) : null}
              <View style={styles.dialogActions}>
                <Button
                  label={dialog?.cancelLabel ?? 'Cancel'}
                  variant="ghost"
                  onPress={() => finish(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  label={dialog?.confirmLabel ?? 'Confirm'}
                  variant={dialog?.danger ? 'danger' : 'primary'}
                  onPress={() => finish(true)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toastLayer: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    gap: spacing.sm,
  },
  toast: {
    maxWidth: 480,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    ...(typeof document !== 'undefined' ? ({ boxShadow: '0 10px 26px rgba(28,25,23,0.14)' } as any) : {}),
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialogWrap: { width: '100%', maxWidth: 440 },
  dialog: { padding: spacing.xl, gap: spacing.sm },
  dialogActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
