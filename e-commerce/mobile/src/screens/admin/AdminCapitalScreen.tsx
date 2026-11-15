import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { businessApi } from '../../api';
import type { CapitalEntry, CapitalEntryRequest } from '../../api/types';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ModalSheet,
  Pagination,
  SelectField,
  Spinner,
  StatCard,
  Tabs,
  TextField,
} from '../../components/ui';
import { date, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { toIso, todayInput } from '../../utils/dates';
import { AdminPage, SummaryGrid } from './AdminKit';

const CAPITAL_TYPES = ['Investment', 'Withdrawal', 'Loan', 'LoanRepayment'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Cheque', 'Other'];

interface Draft {
  type: string;
  amount: string;
  source: string;
  paymentMethod: string;
  reference: string;
  note: string;
  entryDate: string;
}

function blankDraft(): Draft {
  return {
    type: 'Investment',
    amount: '',
    source: 'Owner',
    paymentMethod: 'Bank Transfer',
    reference: '',
    note: '',
    entryDate: todayInput(),
  };
}

export function AdminCapitalScreen() {
  useDocumentTitle('Capital');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const entries = useAsync(
    () => businessApi.capital({ page, pageSize: 10, type: tab === 'all' ? undefined : tab }),
    [tab, page],
  );
  const overview = useAsync(() => businessApi.overview(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CapitalEntry | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft(blankDraft());
    setOpen(true);
  };

  const openEdit = (entry: CapitalEntry) => {
    setEditing(entry);
    setDraft({
      type: entry.type,
      amount: String(entry.amount),
      source: entry.source,
      paymentMethod: entry.paymentMethod,
      reference: entry.reference ?? '',
      note: entry.note ?? '',
      entryDate: entry.entryDate.slice(0, 10),
    });
    setOpen(true);
  };

  const save = async () => {
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('Enter an amount greater than zero.', 'error');
      return;
    }
    if (!draft.source.trim()) {
      toast('Describe where this capital came from.', 'error');
      return;
    }
    const payload: CapitalEntryRequest = {
      type: draft.type,
      amount,
      source: draft.source.trim(),
      paymentMethod: draft.paymentMethod,
      reference: draft.reference.trim() || null,
      note: draft.note.trim() || null,
      entryDate: toIso(draft.entryDate),
    };
    setSaving(true);
    try {
      if (editing) await businessApi.updateCapital(editing.id, payload);
      else await businessApi.createCapital(payload);
      toast(editing ? 'Capital entry updated.' : 'Capital entry recorded.', 'success');
      setOpen(false);
      entries.reload(true);
      overview.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this capital entry.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: CapitalEntry) => {
    const ok = await confirm({
      title: 'Delete this capital entry?',
      message: `${titleCase(entry.type)} of ${fmt(entry.amount)} will be removed from the ledger.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await businessApi.deleteCapital(entry.id);
      toast('Capital entry deleted.', 'success');
      entries.reload(true);
      overview.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this entry.', 'error');
    }
  };

  const summary = overview.data;

  return (
    <AdminPage
      title="Capital"
      subtitle="Track owner investment, drawings and business loans."
      actions={<Button label="Add entry" onPress={openCreate} />}
    >
      {summary ? (
        <SummaryGrid>
          <StatCard label="Capital invested" value={fmt(summary.capitalInvested)} hint="lifetime" />
          <StatCard label="Capital withdrawn" value={fmt(summary.capitalWithdrawn)} hint="lifetime" accent={colors.accent} />
          <StatCard label="Net capital" value={fmt(summary.netCapital)} hint="incl. loans & repayments" accent={colors.gold} />
        </SummaryGrid>
      ) : null}

      <Tabs
        tabs={[
          { key: 'all', label: 'All' },
          ...CAPITAL_TYPES.map(type => ({ key: type, label: titleCase(type) })),
        ]}
        active={tab}
        onChange={key => {
          setTab(key);
          setPage(1);
        }}
      />

      {entries.loading && !entries.data ? (
        <Spinner label="Loading capital ledger…" />
      ) : entries.error ? (
        <ErrorState message={entries.error} onRetry={() => entries.reload()} />
      ) : (entries.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No capital entries"
          message="Record investment or withdrawals to keep the balance sheet accurate."
          actionLabel="Add entry"
          onAction={openCreate}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {entries.data?.items.map(entry => (
              <Card key={entry.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">{titleCase(entry.type)}</AppText>
                      <Badge label={titleCase(entry.paymentMethod)} />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {date(entry.entryDate)} · from {entry.source}
                      {entry.reference ? ` · ${entry.reference}` : ''}
                    </AppText>
                  </View>
                  <AppText variant="h3" color={entry.type === 'Withdrawal' ? colors.danger : colors.success}>
                    {entry.type === 'Withdrawal' ? '−' : '+'}{fmt(entry.amount)}
                  </AppText>
                </View>
                {entry.note ? <AppText variant="small" color={colors.muted}>{entry.note}</AppText> : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(entry)} />
                  <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(entry)} />
                </View>
              </Card>
            ))}
          </View>
          {entries.data ? (
            <Pagination
              page={entries.data.pagination.page}
              totalPages={entries.data.pagination.totalPages}
              totalItems={entries.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit capital entry' : 'New capital entry'}
        onClose={() => !saving && setOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Record entry'} onPress={save} loading={saving} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <SelectField
            label="Type"
            value={draft.type}
            options={CAPITAL_TYPES.map(type => ({ value: type, label: titleCase(type) }))}
            onChange={value => setDraft(prev => ({ ...prev, type: value ?? 'Investment' }))}
            style={{ flex: 1, minWidth: 160 }}
          />
          <TextField
            label="Amount"
            value={draft.amount}
            onChangeText={value => setDraft(prev => ({ ...prev, amount: value }))}
            keyboardType="decimal-pad"
            style={{ flex: 1, minWidth: 140 }}
          />
          <TextField
            label="Date"
            value={draft.entryDate}
            onChangeText={value => setDraft(prev => ({ ...prev, entryDate: value }))}
            placeholder="YYYY-MM-DD"
            style={{ flex: 1, minWidth: 140 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField
            label="Source"
            value={draft.source}
            onChangeText={value => setDraft(prev => ({ ...prev, source: value }))}
            placeholder="Owner, bank, investor…"
            style={{ flex: 1, minWidth: 180 }}
          />
          <SelectField
            label="Payment method"
            value={draft.paymentMethod}
            options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
            onChange={value => setDraft(prev => ({ ...prev, paymentMethod: value ?? 'Cash' }))}
            style={{ flex: 1, minWidth: 160 }}
          />
        </View>
        <TextField
          label="Reference (optional)"
          value={draft.reference}
          onChangeText={value => setDraft(prev => ({ ...prev, reference: value }))}
          placeholder="Transaction or cheque number"
        />
        <TextField
          label="Note (optional)"
          value={draft.note}
          onChangeText={value => setDraft(prev => ({ ...prev, note: value }))}
          multiline
        />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
});
