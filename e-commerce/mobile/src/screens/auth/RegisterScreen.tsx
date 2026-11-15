import React, { useState } from 'react';
import { View } from 'react-native';
import { AppText, AlertBox, Button, TextField } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { AuthShell } from './AuthShell';

export function RegisterScreen() {
  useDocumentTitle('Create account');
  const { register, busy } = useAuth();
  const router = useRouter();
  const { toast } = useFeedback();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    setError(null);
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required.';
    if (!form.lastName.trim()) next.lastName = 'Last name is required.';
    if (!form.email.trim()) next.email = 'Email is required.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    try {
      const user = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      toast(`Welcome to Safwan, ${user.firstName}.`, 'success');
      router.reset('home');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to create your account.');
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save favourites, track orders and earn voucher points."
      footer={
        <AppText variant="small" color={colors.muted}>
          Already have an account?{' '}
          <AppText variant="small" weight="600" color={colors.primary} onPress={() => router.replace('login')}>
            Sign in
          </AppText>
        </AppText>
      }
    >
      {error ? <AlertBox tone="danger" message={error} /> : null}
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 150 }}>
          <TextField label="First name" value={form.firstName} onChangeText={set('firstName')} placeholder="Ayesha" error={fieldErrors.firstName} />
        </View>
        <View style={{ flex: 1, minWidth: 150 }}>
          <TextField label="Last name" value={form.lastName} onChangeText={set('lastName')} placeholder="Rahman" error={fieldErrors.lastName} />
        </View>
      </View>
      <TextField
        label="Email address"
        value={form.email}
        onChangeText={set('email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={fieldErrors.email}
      />
      <TextField
        label="Phone (optional)"
        value={form.phone}
        onChangeText={set('phone')}
        placeholder="+880 1XXX XXXXXX"
        keyboardType="phone-pad"
      />
      <TextField
        label="Password"
        value={form.password}
        onChangeText={set('password')}
        placeholder="At least 8 characters"
        secureTextEntry
        error={fieldErrors.password}
      />
      <TextField
        label="Confirm password"
        value={form.confirm}
        onChangeText={set('confirm')}
        placeholder="Repeat your password"
        secureTextEntry
        error={fieldErrors.confirm}
        onSubmitEditing={submit}
      />
      <Button label="Create account" onPress={submit} loading={busy} full size="lg" />
    </AuthShell>
  );
}
