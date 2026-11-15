import React, { useState } from 'react';
import { View } from 'react-native';
import { siteApi } from '../../api';
import {
  AlertBox,
  AppText,
  Button,
  Card,
  Divider,
  Page,
  PageHeader,
  TextField,
} from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

export function ContactScreen() {
  useDocumentTitle('Contact');
  const { settings } = useSettings();
  const { toast } = useFeedback();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast('Name, email, subject and message are required.', 'error');
      return;
    }
    setBusy(true);
    try {
      await siteApi.contact({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      toast('Your message has been sent. We will reply soon.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to send your message.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back
        title="Contact us"
        subtitle="Questions about an order, a product or a partnership? We would love to hear from you."
      />

      <View style={{ flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card style={{ flex: 2, minWidth: 300, padding: spacing.xl, gap: spacing.lg }}>
          <AppText variant="h3">Send a message</AppText>
          {sent ? (
            <AlertBox tone="success" title="Message sent" message="Thank you for reaching out. Our team replies within one business day." />
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            <TextField label="Your name" value={form.name} onChangeText={update('name')} style={{ flex: 1, minWidth: 200 }} />
            <TextField
              label="Email"
              value={form.email}
              onChangeText={update('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ flex: 1, minWidth: 200 }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            <TextField
              label="Phone (optional)"
              value={form.phone}
              onChangeText={update('phone')}
              keyboardType="phone-pad"
              style={{ flex: 1, minWidth: 200 }}
            />
            <TextField label="Subject" value={form.subject} onChangeText={update('subject')} style={{ flex: 1, minWidth: 200 }} />
          </View>
          <TextField
            label="Message"
            value={form.message}
            onChangeText={update('message')}
            multiline
            placeholder="How can we help?"
          />
          <Button label={busy ? 'Sending…' : 'Send message'} onPress={submit} loading={busy} style={{ alignSelf: 'flex-start' }} />
        </Card>

        <Card style={{ flex: 1, minWidth: 260, padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">{settings.storeName}</AppText>
          {settings.tagline ? <AppText variant="small" color={colors.muted}>{settings.tagline}</AppText> : null}
          <Divider />
          {settings.address ? (
            <View style={{ gap: 2 }}>
              <AppText variant="label" color={colors.muted}>Visit us</AppText>
              <AppText variant="small">{settings.address}</AppText>
            </View>
          ) : null}
          {settings.phone ? (
            <View style={{ gap: 2 }}>
              <AppText variant="label" color={colors.muted}>Call</AppText>
              <AppText variant="small">{settings.phone}</AppText>
            </View>
          ) : null}
          {settings.email ? (
            <View style={{ gap: 2 }}>
              <AppText variant="label" color={colors.muted}>Email</AppText>
              <AppText variant="small">{settings.email}</AppText>
            </View>
          ) : null}
          <Divider />
          <AppText variant="tiny" color={colors.faint}>
            Our support team is available Saturday to Thursday, 10:00–20:00 (BST). For order-specific questions, use the
            order number from your confirmation email.
          </AppText>
        </Card>
      </View>
    </Page>
  );
}
