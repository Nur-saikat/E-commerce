import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ordersApi, returnsApi } from '../../api';
import type { Payment } from '../../api/types';
import { OrderDetails } from '../../components/OrderDetails';
import { RequireAuth } from '../../components/RequireAuth';
import {
  AlertBox,
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  ModalSheet,
  Page,
  PageHeader,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useParams, useRouter } from '../../navigation/Router';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

const refundOptions = [
  { label: 'Original payment method', value: 'Original' },
  { label: 'bKash', value: 'bKash' },
  { label: 'Nagad', value: 'Nagad' },
  { label: 'Rocket', value: 'Rocket' },
  { label: 'Bank transfer', value: 'BankTransfer' },
  { label: 'Voucher points', value: 'Voucher' },
];

export function OrderDetailScreen() {
  useDocumentTitle('Order details');
  return (
    <RequireAuth title="Sign in to view this order">
      <OrderDetailContent />
    </RequireAuth>
  );
}

function OrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const { settings } = useSettings();
  const order = useAsync(() => ordersApi.get(id), [id]);
  const payments = useAsync<Payment[]>(async () => {
    try {
      return await ordersApi.payments(id);
    } catch {
      return [];
    }
  }, [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [refundPreference, setRefundPreference] = useState('Original');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [busy, setBusy] = useState(false);

  if (order.loading && !order.data) {
    return (
      <Page>
        <Spinner label="Loading your order…" />
      </Page>
    );
  }
  if (order.error || !order.data) {
    return (
      <Page>
        <ErrorState message={order.error ?? 'Order not found.'} onRetry={() => order.reload()} />
        <Button label="Back to orders" onPress={() => router.navigate('orders')} style={{ alignSelf: 'center' }} />
      </Page>
    );
  }
  const data = order.data;

  const doCancel = async () => {
    const ok = await confirm({
      title: 'Cancel this order?',
      message: 'The items will be released back to stock. This cannot be undone.',
      confirmLabel: 'Cancel order',
      cancelLabel: 'Keep order',
      danger: true,
    });
    if (!ok) return;
    try {
      await ordersApi.cancel(data.id, cancelReason.trim() || undefined);
      toast('Your order has been cancelled.', 'success');
      setCancelOpen(false);
      setCancelReason('');
      order.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to cancel the order.', 'error');
    }
  };

  const openReturn = () => {
    const initial: Record<string, number> = {};
    data.items.forEach(item => {
      initial[`${item.productId}-${item.variantId ?? ''}`] = 0;
    });
    setReturnQuantities(initial);
    setReturnOpen(true);
  };

  const submitReturn = async () => {
    const items = data.items
      .map(item => ({
        key: `${item.productId}-${item.variantId ?? ''}`,
        productId: item.productId,
        variantId: item.variantId,
        quantity: returnQuantities[`${item.productId}-${item.variantId ?? ''}`] ?? 0,
      }))
      .filter(item => item.quantity > 0);
    if (!items.length) {
      toast('Select at least one item to return.', 'error');
      return;
    }
    if (reason.trim().length < 3) {
      toast('Tell us why you are returning these items.', 'error');
      return;
    }
    setBusy(true);
    try {
      await returnsApi.create({
        orderId: data.id,
        items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        reason: reason.trim(),
        refundPreference,
        accountName: accountName.trim() || null,
        accountNumber: accountNumber.trim() || null,
        bankName: bankName.trim() || null,
      });
      toast('Return request submitted. We will review it shortly.', 'success');
      setReturnOpen(false);
      setReason('');
      setRefundPreference('Original');
      setAccountName('');
      setAccountNumber('');
      setBankName('');
      router.navigate('returns');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to submit the return request.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openInvoice = async () => {
    try {
      const blob = await ordersApi.invoiceBlob(data.id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        toast('Download your invoice from the web app.', 'info');
      }
    } catch (error: any) {
      toast(error?.message ?? 'Unable to load the invoice.', 'error');
    }
  };

  const canReturn = data.status === 'Completed' && data.paymentStatus === 'Paid';
  const needsAccount = ['bKash', 'Nagad', 'Rocket'].includes(refundPreference);
  const needsBank = refundPreference === 'BankTransfer';

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back
        title={`Order ${data.orderNumber}`}
        subtitle={`Placed ${dateTime(data.createdAt)}`}
        actions={
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Button label="Invoice" variant="outline" onPress={openInvoice} />
            {data.canCancel ? (
              <Button label="Cancel order" variant="danger" onPress={() => setCancelOpen(true)} />
            ) : null}
            {canReturn ? <Button label="Request return" variant="secondary" onPress={openReturn} /> : null}
          </View>
        }
      />

      {data.paymentStatus === 'AwaitingVerification' ? (
        <AlertBox
          tone="warning"
          title="Payment awaiting verification"
          message="We have received your payment details. Our team verifies mobile banking payments during business hours."
        />
      ) : null}
      {data.status === 'Cancelled' ? (
        <AlertBox tone="danger" title="Order cancelled" message={data.cancellationReason ?? 'This order was cancelled.'} />
      ) : null}

      <OrderDetails order={data} />

      {payments.data && payments.data.length ? (
        <Card style={{ padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">Payments</AppText>
          {payments.data.map(payment => (
            <View key={payment.id} style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="title">{payment.provider}</AppText>
                <AppText variant="tiny" color={colors.muted}>
                  {dateTime(payment.createdAt)}
                  {payment.transactionId ? ` · ${payment.transactionId}` : ''}
                  {payment.failureReason ? ` · ${payment.failureReason}` : ''}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Badge label={payment.status} />
                <AppText variant="tiny" color={colors.faint}>{payment.amount.toFixed(2)} {payment.currency}</AppText>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <ModalSheet
        visible={cancelOpen}
        title="Cancel order"
        subtitle="Let us know why, if you would like."
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button label="Keep order" variant="ghost" onPress={() => setCancelOpen(false)} />
            <Button label="Cancel order" variant="danger" onPress={doCancel} />
          </>
        }
      >
        <TextField
          label="Reason (optional)"
          value={cancelReason}
          onChangeText={setCancelReason}
          placeholder="Changed my mind, found another option…"
          multiline
        />
      </ModalSheet>

      <ModalSheet
        visible={returnOpen}
        title="Request a return"
        subtitle="Choose the items and quantities you want to send back."
        onClose={() => setReturnOpen(false)}
        footer={
          <>
            <Button label="Close" variant="ghost" onPress={() => setReturnOpen(false)} />
            <Button label="Submit return" onPress={submitReturn} loading={busy} />
          </>
        }
      >
        <View style={{ gap: spacing.md }}>
          {data.items.map(item => {
            const key = `${item.productId}-${item.variantId ?? ''}`;
            return (
              <View key={key} style={styles.returnRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="title">{item.productName}</AppText>
                  <AppText variant="tiny" color={colors.muted}>
                    {item.variantName ? `${item.variantName} · ` : ''}Bought {item.quantity}
                  </AppText>
                </View>
                <View style={styles.stepper}>
                  <Button
                    label="−"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      setReturnQuantities(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) - 1) }))
                    }
                  />
                  <AppText variant="title" style={{ minWidth: 24, textAlign: 'center' }}>{returnQuantities[key] ?? 0}</AppText>
                  <Button
                    label="+"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      setReturnQuantities(prev => ({ ...prev, [key]: Math.min(item.quantity, (prev[key] ?? 0) + 1) }))
                    }
                  />
                </View>
              </View>
            );
          })}
          <TextField
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Wrong size, damaged item, not as described…"
            multiline
          />
          <SelectField
            label="Refund method"
            value={refundPreference}
            options={refundOptions.filter(option => option.value !== 'Voucher' || settings.voucherPointsEnabled)}
            onChange={setRefundPreference}
          />
          {needsAccount ? (
            <TextField label="Mobile banking number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="phone-pad" />
          ) : null}
          {needsBank ? (
            <>
              <TextField label="Bank name" value={bankName} onChangeText={setBankName} />
              <TextField label="Account name" value={accountName} onChangeText={setAccountName} />
              <TextField label="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
            </>
          ) : null}
          <AlertBox
            tone="info"
            message="Once approved and received, refunds are processed to your chosen destination. Delivery fees are refunded only for faulty items."
          />
        </View>
      </ModalSheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  paymentRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  returnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 2,
  },
});
