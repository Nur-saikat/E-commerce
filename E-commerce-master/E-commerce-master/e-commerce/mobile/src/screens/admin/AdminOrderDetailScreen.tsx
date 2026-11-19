import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ordersApi, paymentsApi } from '../../api';
import type { Payment } from '../../api/types';
import { OrderDetails } from '../../components/OrderDetails';
import {
  AlertBox,
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  ErrorState,
  ModalSheet,
  SelectField,
  Spinner,
  TextField,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useParams, useRouter } from '../../navigation/Router';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { AdminPage } from './AdminKit';
import { ORDER_STATUSES } from '../../config';

const refundDestinations = [
  { label: 'Original payment method', value: 'Original' },
  { label: 'bKash', value: 'bKash' },
  { label: 'Nagad', value: 'Nagad' },
  { label: 'Rocket', value: 'Rocket' },
  { label: 'Bank transfer', value: 'BankTransfer' },
  { label: 'Voucher points', value: 'Voucher' },
];

export function AdminOrderDetailScreen() {
  useDocumentTitle('Order detail');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useFeedback();
  const order = useAsync(() => ordersApi.get(id), [id]);
  const payments = useAsync<Payment[]>(async () => {
    try {
      return await ordersApi.payments(id);
    } catch {
      return [];
    }
  }, [id]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [destination, setDestination] = useState('Original');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyApprove, setVerifyApprove] = useState(true);
  const [verifyReference, setVerifyReference] = useState('');
  const [verifyNote, setVerifyNote] = useState('');

  if (order.loading && !order.data) {
    return (
      <AdminPage title="Order">
        <Spinner label="Loading order…" />
      </AdminPage>
    );
  }
  if (order.error || !order.data) {
    return (
      <AdminPage title="Order">
        <ErrorState message={order.error ?? 'Order not found.'} onRetry={() => order.reload()} />
      </AdminPage>
    );
  }
  const data = order.data;

  const mobileBankingProviders = ['bkash', 'nagad', 'rocket'];
  const pendingMobilePayment = (payments.data ?? []).find(
    payment =>
      payment.status === 'Pending' &&
      !!payment.transactionId &&
      mobileBankingProviders.includes((payment.provider ?? '').toLowerCase()),
  );
  const awaitingMobileVerification = !!pendingMobilePayment || data.paymentStatus === 'AwaitingVerification';

  const openStatus = () => {
    setStatus(data.status);
    setNote('');
    setTrackingNumber(data.trackingNumber ?? '');
    setStatusOpen(true);
  };

  const saveStatus = async () => {
    setBusy(true);
    try {
      await ordersApi.updateStatus(data.id, {
        status,
        note: note.trim() || null,
        trackingNumber: trackingNumber.trim() || null,
      });
      toast('Order status updated.', 'success');
      setStatusOpen(false);
      order.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update the status.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitRefund = async () => {
    if (['bKash', 'Nagad', 'Rocket'].includes(destination) && !accountNumber.trim()) {
      toast('Enter the mobile banking number for this refund.', 'error');
      return;
    }
    if (destination === 'BankTransfer' && (!bankName.trim() || !accountName.trim() || !accountNumber.trim())) {
      toast('Bank name, account name and account number are required.', 'error');
      return;
    }
    setBusy(true);
    try {
      await ordersApi.refund(data.id, {
        destination,
        accountName: accountName.trim() || null,
        accountNumber: accountNumber.trim() || null,
        bankName: bankName.trim() || null,
        reference: reference.trim() || null,
        note: refundNote.trim() || null,
      });
      toast('Refund recorded.', 'success');
      setRefundOpen(false);
      order.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to record this refund.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitVerification = async () => {
    setBusy(true);
    try {
      await paymentsApi.verifyMobile(data.id, {
        approve: verifyApprove,
        reference: verifyReference.trim() || null,
        note: verifyNote.trim() || null,
      });
      toast(verifyApprove ? 'Payment approved and order confirmed.' : 'Payment rejected.', 'success');
      setVerifyOpen(false);
      order.reload(true);
      payments.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to verify this payment.', 'error');
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
        toast('Invoices can be downloaded from the web admin.', 'info');
      }
    } catch (error: any) {
      toast(error?.message ?? 'Unable to load the invoice.', 'error');
    }
  };

  return (
    <AdminPage
      title={`Order ${data.orderNumber}`}
      subtitle={`${data.customerName} · placed ${dateTime(data.createdAt)}`}
      actions={
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button label="Back" variant="ghost" onPress={() => router.navigate('admin-orders')} />
          <Button label="Invoice" variant="outline" onPress={openInvoice} />
          <Button label="Update status" variant="secondary" onPress={openStatus} />
          {data.paymentStatus === 'Paid' && data.refundedAmount < data.total ? (
            <Button label="Record refund" variant="danger" onPress={() => setRefundOpen(true)} />
          ) : null}
        </View>
      }
    >
      {awaitingMobileVerification ? (
        <AlertBox
          tone="warning"
          title="Mobile banking payment awaiting verification"
          message={
            pendingMobilePayment
              ? `${pendingMobilePayment.provider} transaction ${pendingMobilePayment.transactionId}${
                  pendingMobilePayment.senderNumber ? ` from ${pendingMobilePayment.senderNumber}` : ''
                } is waiting for your review.`
              : 'Confirm the transaction with the provider before approving it.'
          }
        />
      ) : null}
      {data.status === 'Cancelled' ? (
        <AlertBox tone="danger" title="Cancelled order" message={data.cancellationReason ?? 'This order was cancelled.'} />
      ) : null}

      <OrderDetails order={data} />

      <Card style={{ padding: spacing.xl, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
          <AppText variant="h3">Payments</AppText>
          {awaitingMobileVerification ? (
            <Button
              label="Review mobile payment"
              size="sm"
              onPress={() => {
                setVerifyApprove(true);
                setVerifyReference('');
                setVerifyNote('');
                setVerifyOpen(true);
              }}
            />
          ) : null}
        </View>
        {payments.loading && !payments.data ? (
          <Spinner />
        ) : (payments.data?.length ?? 0) === 0 ? (
          <AppText variant="small" color={colors.faint}>No payment attempts recorded.</AppText>
        ) : (
          payments.data?.map((payment, index) => (
            <View key={payment.id}>
              <View style={styles.paymentRow}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <AppText variant="title">{payment.provider}</AppText>
                  <AppText variant="tiny" color={colors.muted}>
                    {dateTime(payment.createdAt)}
                    {payment.senderNumber ? ` · from ${payment.senderNumber}` : ''}
                    {payment.transactionId ? ` · ${payment.transactionId}` : ''}
                  </AppText>
                  {payment.failureReason ? <AppText variant="tiny" color={colors.danger}>{payment.failureReason}</AppText> : null}
                </View>
                <Badge label={payment.status} />
                <AppText variant="small" weight="600">{payment.amount.toFixed(2)} {payment.currency}</AppText>
              </View>
              {index < (payments.data?.length ?? 0) - 1 ? <Divider style={{ marginVertical: 4 }} /> : null}
            </View>
          ))
        )}
      </Card>

      <ModalSheet
        visible={statusOpen}
        title="Update order status"
        subtitle="Customers see this change immediately in their order timeline."
        onClose={() => setStatusOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setStatusOpen(false)} />
            <Button label="Save status" onPress={saveStatus} loading={busy} />
          </>
        }
      >
        <SelectField
          label="Status"
          value={status}
          options={ORDER_STATUSES.map(value => ({ label: value, value }))}
          onChange={setStatus}
        />
        <TextField label="Tracking number (optional)" value={trackingNumber} onChangeText={setTrackingNumber} autoCapitalize="characters" />
        <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline placeholder="Shared with the customer in the timeline." />
      </ModalSheet>

      <ModalSheet
        visible={refundOpen}
        title="Record a refund"
        subtitle={`Refundable balance ${(data.total - data.refundedAmount).toFixed(2)}`}
        onClose={() => setRefundOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setRefundOpen(false)} />
            <Button label="Record refund" variant="danger" onPress={submitRefund} loading={busy} />
          </>
        }
      >
        <SelectField label="Destination" value={destination} options={refundDestinations} onChange={setDestination} />
        {['bKash', 'Nagad', 'Rocket'].includes(destination) ? (
          <TextField label="Mobile banking number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="phone-pad" />
        ) : null}
        {destination === 'BankTransfer' ? (
          <>
            <TextField label="Bank name" value={bankName} onChangeText={setBankName} />
            <TextField label="Account name" value={accountName} onChangeText={setAccountName} />
            <TextField label="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
          </>
        ) : null}
        <TextField label="Reference (optional)" value={reference} onChangeText={setReference} placeholder="Transaction or voucher reference" />
        <TextField label="Note (optional)" value={refundNote} onChangeText={setRefundNote} multiline />
      </ModalSheet>

      <ModalSheet
        visible={verifyOpen}
        title="Verify mobile banking payment"
        subtitle="Approve only after confirming the transaction in your provider statement."
        onClose={() => setVerifyOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setVerifyOpen(false)} />
            <Button
              label={verifyApprove ? 'Approve payment' : 'Reject payment'}
              variant={verifyApprove ? 'primary' : 'danger'}
              onPress={submitVerification}
              loading={busy}
            />
          </>
        }
      >
        <SelectField
          label="Decision"
          value={verifyApprove ? 'approve' : 'reject'}
          options={[
            { label: 'Approve — payment received', value: 'approve' },
            { label: 'Reject — payment not found', value: 'reject' },
          ]}
          onChange={value => setVerifyApprove(value === 'approve')}
        />
        <TextField label="Provider reference" value={verifyReference} onChangeText={setVerifyReference} placeholder="Transaction ID from the statement" />
        <TextField label="Internal note" value={verifyNote} onChangeText={setVerifyNote} multiline />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', paddingVertical: 4 },
});
