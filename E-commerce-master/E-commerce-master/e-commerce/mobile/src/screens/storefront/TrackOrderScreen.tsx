import React, { useState } from 'react';
import { View } from 'react-native';
import { ordersApi } from '../../api';
import type { Order } from '../../api/types';
import { OrderDetails } from '../../components/OrderDetails';
import {
  AlertBox,
  AppText,
  Button,
  Card,
  Page,
  PageHeader,
  Spinner,
  TextField,
} from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';

export function TrackOrderScreen() {
  useDocumentTitle('Track order');
  const { toast } = useFeedback();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const track = async () => {
    if (!orderNumber.trim() || !email.trim()) {
      toast('Enter your order number and email address.', 'error');
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const result = await ordersApi.track(orderNumber.trim(), email.trim());
      setOrder(result);
    } catch (err: any) {
      setOrder(null);
      setError(err?.message ?? 'We could not find an order with those details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back
        title="Track your order"
        subtitle="Use the order number from your confirmation email and the email address used at checkout."
      />

      <Card style={{ padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField
            label="Order number"
            value={orderNumber}
            onChangeText={value => setOrderNumber(value.toUpperCase())}
            placeholder="ORD-20260101-000001"
            autoCapitalize="characters"
            style={{ flex: 1, minWidth: 220 }}
          />
          <TextField
            label="Email address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, minWidth: 220 }}
          />
        </View>
        <Button label={loading ? 'Looking up…' : 'Track order'} onPress={track} loading={loading} style={{ alignSelf: 'flex-start' }} />
      </Card>

      {loading ? <Spinner label="Finding your order…" /> : null}

      {error && searched && !loading ? (
        <AlertBox tone="danger" title="Order not found" message={error} />
      ) : null}

      {order && !loading ? (
        <>
          <AlertBox
            tone="success"
            title={`Order ${order.orderNumber}`}
            message="Here is the latest status of your delivery. Keep this page for updates."
          />
          <OrderDetails order={order} />
        </>
      ) : null}

      {!searched ? (
        <Card style={{ padding: spacing.xl, gap: spacing.sm }}>
          <AppText variant="h3">Where do I find my order number?</AppText>
          <AppText variant="small" color={colors.muted}>
            Your order number starts with ORD and appears in the confirmation email sent after checkout, as well as on
            the order confirmation page. Signed-in customers can also see it under Account → Orders.
          </AppText>
        </Card>
      ) : null}
    </Page>
  );
}
