import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ordersApi, paymentsApi, siteApi } from '../../api';
import type { CheckoutConfig, Order } from '../../api/types';
import { OrderDetails } from '../../components/OrderDetails';
import {
  AlertBox,
  AppText,
  Button,
  Card,
  ErrorState,
  KeyValue,
  Page,
  Spinner,
  TextField,
} from '../../components/ui';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useParams, useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useFeedback } from '../../state/FeedbackContext';
import { lastOrderStore } from '../../state/lastOrder';
import { colors, spacing } from '../../theme';

const mobileProviders = new Set(['bkash', 'nagad', 'rocket']);

export function ConfirmationScreen() {
  const { orderId, payment } = useParams<{ orderId: string; payment?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useFeedback();
  const [submitting, setSubmitting] = useState(false);
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [verifyAttempted, setVerifyAttempted] = useState(false);

  const result = useAsync<Order>(async () => {
    const memory = lastOrderStore.getMemoryOrder(orderId);
    if (memory) return memory;
    const hint = await lastOrderStore.getHint(orderId);
    if (user) {
      try {
        return await ordersApi.get(orderId);
      } catch (error) {
        if (hint) return await ordersApi.track(hint.orderNumber, hint.email);
        throw error;
      }
    }
    if (hint) return await ordersApi.track(hint.orderNumber, hint.email);
    throw new Error('Sign in to view this order, or track it with your order number and email.');
  }, [orderId, user?.id]);

  const config = useAsync<CheckoutConfig | null>(async () => {
    try {
      return await siteApi.checkoutConfig();
    } catch {
      return null;
    }
  }, []);
  useDocumentTitle('Order confirmed');

  useEffect(() => {
    if (payment !== 'success' || !result.data || verifyAttempted) return;
    setVerifyAttempted(true);
    (async () => {
      try {
        const hint = await lastOrderStore.getHint(orderId);
        await paymentsApi.verify({
          orderId,
          guestEmail: user?.email ?? hint?.email,
        });
        toast('Payment verified successfully.', 'success');
        result.reload(true);
      } catch (error: any) {
        toast(error?.message ?? 'We could not verify the payment yet.', 'error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment, result.data?.id]);

  if (result.loading && !result.data) {
    return (
      <Page>
        <Spinner label="Confirming your order…" />
      </Page>
    );
  }
  if (result.error && !result.data) {
    return (
      <Page>
        <ErrorState message={result.error} onRetry={() => result.reload()} />
        <Button label="Go to the shop" onPress={() => router.navigate('home')} style={{ alignSelf: 'center' }} />
      </Page>
    );
  }
  const order = result.data;
  if (!order) return null;

  const mobileOption = config.data?.mobileBanking.find(option => option.provider === order.paymentMethod);
  const needsMobilePayment = mobileProviders.has(order.paymentMethod.toLowerCase()) && order.paymentStatus !== 'Paid';
  const paid = order.paymentStatus === 'Paid';

  const submitMobile = async () => {
    if (!/^0?1\d{9}$/.test(senderNumber.replace(/\D/g, ''))) {
      toast('Enter the mobile number you paid from.', 'error');
      return;
    }
    if (transactionId.trim().length < 4) {
      toast('Enter the transaction ID from your payment SMS.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const hint = await lastOrderStore.getHint(orderId);
      await paymentsApi.submitMobile({
        orderId,
        provider: order.paymentMethod,
        senderNumber: senderNumber.trim(),
        transactionId: transactionId.trim(),
        guestEmail: user?.email ?? hint?.email,
      });
      toast('Payment submitted. Our team will verify it shortly.', 'success');
      setTransactionId('');
      result.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to submit the payment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openInvoice = async () => {
    try {
      const blob = await ordersApi.invoiceBlob(order.id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        toast('Open the web app to download your invoice.', 'info');
      }
    } catch (error: any) {
      toast(error?.message ?? 'Unable to load the invoice.', 'error');
    }
  };

  return (
    <Page gap={spacing.xl}>
      <Card style={{ padding: spacing.xxl, gap: spacing.md, alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: '#B9E3DC' }}>
        <View style={styles.successMark}>
          <AppText variant="h1" color={colors.white}>✓</AppText>
        </View>
        <AppText variant="h1" align="center">Thank you{order.customerName ? `, ${order.customerName.split(' ')[0]}` : ''}.</AppText>
        <AppText variant="body" color={colors.inkSoft} align="center">
          Your order <AppText variant="body" weight="700">{order.orderNumber}</AppText> has been received.
        </AppText>
        <AppText variant="small" color={colors.muted} align="center" style={{ maxWidth: 560 }}>
          {paid
            ? 'Payment is confirmed. We are preparing your parcel right now.'
            : order.paymentMethod.toLowerCase() === 'cod'
              ? 'You will pay in cash when the parcel arrives. We will call to confirm the delivery.'
              : `Complete the ${order.paymentMethod} payment below so we can start packing your order.`}
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.sm }}>
          <Button label="Continue shopping" variant="secondary" onPress={() => router.navigate('shop')} />
          {user ? (
            <Button label="View my orders" variant="outline" onPress={() => router.navigate('orders')} />
          ) : (
            <Button label="Track this order" variant="outline" onPress={() => router.navigate('track-order')} />
          )}
          {user ? <Button label="Download invoice" variant="outline" onPress={openInvoice} /> : null}
        </View>
      </Card>

      {payment === 'cancelled' ? (
        <AlertBox
          tone="warning"
          title="Payment was cancelled"
          message="Your order is saved. You can retry payment from your orders page or contact support."
        />
      ) : null}

      {needsMobilePayment ? (
        <Card style={{ padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">Complete your {order.paymentMethod} payment</AppText>
          <AlertBox
            tone="info"
            title="Payment details"
            message={
              mobileOption
                ? `Send ${order.total} to ${mobileOption.accountNumber}. ${mobileOption.instructions} Then submit the transaction details below.`
                : `Send the order total using ${order.paymentMethod}, then submit the transaction details below.`
            }
          />
          <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
            <TextField
              label="Sender mobile number"
              value={senderNumber}
              onChangeText={setSenderNumber}
              keyboardType="phone-pad"
              placeholder="01XXXXXXXXX"
              style={{ flex: 1, minWidth: 180 }}
            />
            <TextField
              label="Transaction ID"
              value={transactionId}
              onChangeText={setTransactionId}
              placeholder="e.g. 8N7A2K9XYZ"
              style={{ flex: 1, minWidth: 180 }}
            />
          </View>
          <Button label="Submit payment for verification" onPress={submitMobile} loading={submitting} />
          <AppText variant="tiny" color={colors.faint}>
            Payments are verified manually against our merchant statement. Never share your PIN or OTP with anyone.
          </AppText>
        </Card>
      ) : null}

      <Card style={{ padding: spacing.xl, gap: spacing.md }}>
        <AppText variant="h3">Payment summary</AppText>
        <KeyValue label="Payment method" value={order.paymentMethod} />
        <KeyValue label="Payment status" value={order.paymentStatus} />
        <KeyValue label="Order status" value={order.status} />
        {order.pointsEarned > 0 ? (
          <KeyValue label="Voucher points earned" value={`${order.pointsEarned} pts`} />
        ) : null}
      </Card>

      <OrderDetails order={order} />
    </Page>
  );
}

const styles = StyleSheet.create({
  successMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
