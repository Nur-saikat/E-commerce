import React, { useState } from 'react';
import { AlertBox, AppText, Button, TextField } from '../../components/ui';
import { authApi } from '../../api';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { colors, spacing } from '../../theme';
import { AuthShell } from './AuthShell';

export function ForgotPasswordScreen() {
  useDocumentTitle('Forgot password');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError('Enter the email address on your account.');
      return;
    }
    setBusy(true);
    try {
      const response = await authApi.forgotPassword(email.trim());
      setMessage(response.message || 'If an account exists for that email, reset instructions have been sent.');
      setResetUrl(response.resetUrl ?? null);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to request a reset link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We will send a secure reset link if the address matches an account."
      footer={
        <AppText variant="small" color={colors.muted}>
          Remembered it?{' '}
          <AppText variant="small" weight="600" color={colors.primary} onPress={() => router.replace('login')}>
            Back to sign in
          </AppText>
        </AppText>
      }
    >
      {error ? <AlertBox tone="danger" message={error} /> : null}
      {message ? <AlertBox tone="success" title="Check your inbox" message={message} /> : null}
      <TextField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        onSubmitEditing={submit}
      />
      <Button label="Send reset link" onPress={submit} loading={busy} full size="lg" />
      {resetUrl ? (
        <Button
          label="Open reset link"
          variant="outline"
          onPress={() => {
            const url = new URL(resetUrl, typeof window !== 'undefined' ? window.location.href : undefined);
            const token = url.searchParams.get('token');
            router.navigate('reset-password', token ? { token } : {});
          }}
        />
      ) : null}
      <AppText variant="tiny" color={colors.faint} style={{ marginTop: spacing.xs }}>
        For your security, reset links expire. Never share your password with anyone.
      </AppText>
    </AuthShell>
  );
}
