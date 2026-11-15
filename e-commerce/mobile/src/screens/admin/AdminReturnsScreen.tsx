import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { returnsApi } from '../../api';
import type { ReturnRequest } from '../../api/types';
import {
  AlertBox,
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  KeyValue,
  ModalSheet,
  Pagination,
  SelectField,
  Spinner,
  Tabs,
  TextField,
} from '../../components/ui';
import { dateTime, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useRouter } from '../../navigation/Router';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage } from './AdminKit';

const RETURN_TRANSITIONS: Record<string, string[]> = {
  Requested: ['Approved', 'Rejected'],
  Approved: ['Received', 'Refunded', 'Rejected'],
  Received: ['Refunded'],
  Refunded: [],
  Rejected: [],
};

const REFUND_DESTINATIONS = ['Original', 'bKash', 'Nagad', 'Rocket', 'BankTransfer', 'Voucher'];
const MOBILE_DESTINATIONS = ['bKash', 'Nagad', 'Rocket'];

export function AdminReturnsScreen() {
  useDocumentTitle('Returns');
  const { toast } = useFeedback();
  const router = useRouter();
  const { fmt } = useSettings();
  const [tab, setTab] = useState('Requested');
  const [page, setPage] = useState(1);
  const returns = useAsync(
    () =>
      returnsApi.adminList({
        page,
        pageSize: 10,
        status: tab === 'all' ? undefined : tab,
      }),
    [tab, page],
  );

  const [active, setActive] = useState<ReturnRequest | null>(null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [destination, setDestination] = useState('Original');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const openManage = (request: ReturnRequest) => {
    setActive(request);
    setStatus(RETURN_TRANSITIONS[request.status]?.[0] ?? request.status);
    setNote(request.adminNote ?? '');
    setDestination(request.refundPreference || 'Original');
    setAccountName(request.refundAccountName ?? '');
    setAccountNumber(request.refundAccountNumber ?? '');
    setBankName(request.refundBankName ?? '');
    setReference('');
  };

  const closeManage = () => {
    if (busy) return;
    setActive(null);
  };

  const submit = async () => {
    if (!active) return;
    if (!status) {
      toast('Choose the next status for this return.', 'error');
      return;
    }
    if (status === 'Refunded') {
      if (destination === 'Voucher' && !active.userId) {
        toast('Voucher refunds are only available for registered customers.', 'error');
        return;
      }
      if (MOBILE_DESTINATIONS.includes(destination) && !accountNumber.trim()) {
        toast('Enter the mobile banking number for this refund.', 'error');
        return;
      }
      if (destination === 'BankTransfer' && (!bankName.trim() || !accountName.trim() || !accountNumber.trim())) {
        toast('Bank name, account name and account number are required.', 'error');
        return;
      }
    }
    setBusy(true);
    try {
      await returnsApi.updateStatus(active.id, {
        status,
        adminNote: note.trim() || null,
        destination: status === 'Refunded' ? destination : null,
        accountName: status === 'Refunded' ? accountName.trim() || null : null,
        accountNumber: status === 'Refunded' ? accountNumber.trim() || null : null,
        bankName: status === 'Refunded' ? bankName.trim() || null : null,
        reference: status === 'Refunded' ? reference.trim() || null : null,
      });
      toast(status === 'Refunded' ? 'Refund processed and stock restored.' : `Return marked ${status.toLowerCase()}.`, 'success');
      setActive(null);
      returns.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update this return.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const transitions = active ? RETURN_TRANSITIONS[active.status] ?? [] : [];
  const statusOptions = transitions.map(value => ({ value, label: value }));

  return (
    <AdminPage title="Returns & refunds" subtitle="Approve returns, receive items and release refunds.">
      <Tabs
        tabs={[
          { key: 'Requested', label: 'Requested' },
          { key: 'Approved', label: 'Approved' },
          { key: 'Received', label: 'Received' },
          { key: 'Refunded', label: 'Refunded' },
          { key: 'Rejected', label: 'Rejected' },
          { key: 'all', label: 'All' },
        ]}
        active={tab}
        onChange={key => {
          setTab(key);
          setPage(1);
        }}
      />

      {returns.loading && !returns.data ? (
        <Spinner label="Loading return requests…" />
      ) : returns.error ? (
        <ErrorState message={returns.error} onRetry={() => returns.reload()} />
      ) : (returns.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No return requests"
          message={tab === 'all' ? 'Customer return requests will appear here.' : `No returns are currently ${tab.toLowerCase()}.`}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {returns.data?.items.map(request => (
              <Card key={request.id} style={{ padding: spacing.lg, gap: spacing.md }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">Return for {request.orderNumber}</AppText>
                      <Badge label={request.status} />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {request.customerName} · {request.customerEmail} · requested {dateTime(request.createdAt)}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="tiny" color={colors.muted}>Refund value</AppText>
                    <AppText variant="h3">{fmt(request.refundAmount)}</AppText>
                  </View>
                </View>

                <View style={styles.itemsBox}>
                  {request.items.map(item => (
                    <View key={`${item.productId}-${item.variantId ?? ''}`} style={styles.itemRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="small" numberOfLines={1}>{item.productName}</AppText>
                        <AppText variant="tiny" color={colors.faint}>
                          {item.sku}
                          {item.variantName ? ` · ${item.variantName}` : ''} · {fmt(item.unitPrice)} each
                        </AppText>
                      </View>
                      <AppText variant="small" color={colors.muted}>× {item.quantity}</AppText>
                      <AppText variant="small" weight="600" style={{ minWidth: 70, textAlign: 'right' }}>{fmt(item.lineTotal)}</AppText>
                    </View>
                  ))}
                </View>

                <View style={{ gap: 4 }}>
                  <KeyValue label="Reason" value={request.reason} />
                  {request.comment ? <KeyValue label="Customer note" value={request.comment} /> : null}
                  <KeyValue
                    label="Refund preference"
                    value={`${titleCase(request.refundPreference)}${
                      request.refundAccountNumber ? ` · ${request.refundAccountNumber}` : ''
                    }${request.refundBankName ? ` · ${request.refundBankName}` : ''}`}
                  />
                  {request.refundMethod ? (
                    <KeyValue
                      label="Refunded via"
                      value={`${titleCase(request.refundMethod)} · ${fmt(request.refundAmount)}${
                        request.refundPoints > 0 ? ` + ${request.refundPoints} points` : ''
                      }`}
                    />
                  ) : null}
                  {request.refundReference ? <KeyValue label="Reference" value={request.refundReference} /> : null}
                  {request.adminNote ? <KeyValue label="Team note" value={request.adminNote} /> : null}
                  {request.processedAt ? <KeyValue label="Processed" value={dateTime(request.processedAt)} /> : null}
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {transitions.length > 0 ? (
                    <Button label="Manage" size="sm" onPress={() => openManage(request)} />
                  ) : (
                    <AppText variant="small" color={colors.muted}>
                      This return is closed — no further changes are possible.
                    </AppText>
                  )}
                  <Button
                    label="View order"
                    size="sm"
                    variant="ghost"
                    onPress={() => router.navigate('admin-order', { id: request.orderId })}
                  />
                </View>
              </Card>
            ))}
          </View>
          {returns.data ? (
            <Pagination
              page={returns.data.pagination.page}
              totalPages={returns.data.pagination.totalPages}
              totalItems={returns.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={Boolean(active)}
        title={active ? `Return for ${active.orderNumber}` : 'Return'}
        subtitle={active ? `Currently ${active.status.toLowerCase()} · ${active.items.length} item(s)` : undefined}
        onClose={closeManage}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={closeManage} />
            <Button label="Save changes" onPress={submit} loading={busy} />
          </>
        }
      >
        {active ? (
          <View style={{ gap: spacing.md }}>
            <SelectField label="Next status" value={status} options={statusOptions} onChange={value => setStatus(value ?? '')} />
            <TextField
              label="Note to customer (optional)"
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Share inspection results, pickup details or refund confirmation."
            />

            {status === 'Refunded' ? (
              <>
                <AlertBox
                  tone="warning"
                  title="Refund will be recorded immediately"
                  message="Stock is restored, voucher points are credited and the order's refunded balance is updated as soon as you save."
                />
                <SelectField
                  label="Refund destination"
                  value={destination}
                  options={REFUND_DESTINATIONS.map(value => ({ value, label: titleCase(value) }))}
                  onChange={value => setDestination(value ?? 'Original')}
                />
                {destination === 'Voucher' && !active.userId ? (
                  <AlertBox
                    tone="danger"
                    title="Guest return"
                    message="This request is not linked to a registered customer, so points cannot be issued. Choose a different destination."
                  />
                ) : null}
                {MOBILE_DESTINATIONS.includes(destination) ? (
                  <TextField
                    label="Mobile banking number"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    keyboardType="phone-pad"
                    placeholder="01XXXXXXXXX"
                  />
                ) : null}
                {destination === 'BankTransfer' ? (
                  <>
                    <TextField label="Bank name" value={bankName} onChangeText={setBankName} />
                    <TextField label="Account name" value={accountName} onChangeText={setAccountName} />
                    <TextField label="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
                  </>
                ) : null}
                <TextField
                  label="Transaction reference (optional)"
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Mobile banking TrxID, bank slip or voucher reference"
                />
                <AppText variant="tiny" color={colors.muted}>
                  Cash refunds are scaled to the amount actually paid (excluding any points redeemed at checkout).
                </AppText>
              </>
            ) : null}
          </View>
        ) : null}
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
  itemsBox: { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: spacing.md, gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
