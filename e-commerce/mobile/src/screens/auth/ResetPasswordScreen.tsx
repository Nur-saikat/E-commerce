import React, { useState } from 'react';
import { AppText, AlertBox, Button, TextField } from '../../components/ui';
import { authApi } from '../../api';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter, useParams } from '../../navigation/Router';
import { useFeedback } from '../../state/FeedbackContext';
import { colors } from '../../theme';
import { AuthShell } from './AuthShell';

export function ResetPasswordScreen() {
  useDocumentTitle('Reset password');
  const { token: tokenParam } = useParams<{ token?: string }>();
  const router = useRouter();
  const { toast } = useFeedback();
  const [token, setToken] = useState(tokenParam ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    setError(null);
    const next: Record<string, string> = {};
    if (!token.trim()) next.token = 'Paste the reset token from your email.';
    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await authApi.resetPassword(token.trim(), password);
      toast('Your password has been reset. Please sign in.', 'success');
      router.replace('login');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to reset the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use a password you have not used before."
      footer={
        <AppText variant="small" color={colors.muted}>
          <AppText variant="small" weight="600" color={colors.primary} onPress={() => router.replace('login')}>
            Back to sign in
          </AppText>
        </AppText>
      }
    >
      {error ? <AlertBox tone="danger" message={error} /> : null}
      <TextField
        label="Reset token"
        value={token}
        onChangeText={setToken}
        placeholder="Paste the token from your email"
        autoCapitalize="none"
        error={fieldErrors.token}
      />
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        error={fieldErrors.password}
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repeat your password"
        secureTextEntry
        error={fieldErrors.confirm}
        onSubmitEditing={submit}
      />
      <Button label="Reset password" onPress={submit} loading={busy} full size="lg" />
    </AuthShell>
  );
}
