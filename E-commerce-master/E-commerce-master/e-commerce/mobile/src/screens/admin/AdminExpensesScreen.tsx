import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { businessApi } from '../../api';
import type { ExpenseEntry, ExpenseEntryRequest } from '../../api/types';
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
  TextField,
  ToggleRow,
} from '../../components/ui';
import { date, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { toIso, todayInput } from '../../utils/dates';
import { AdminPage, SummaryGrid, Toolbar } from './AdminKit';

const EXPENSE_CATEGORIES = ['Rent', 'Salary', 'Marketing', 'Utilities', 'Packaging', 'Transport', 'Software', 'General'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Rocket', 'Cheque', 'Other'];

interface Draft {
  category: string;
  title: string;
  amount: string;
  vendor: string;
  paymentMethod: string;
  reference: string;
  note: string;
  expenseDate: string;
  isPaid: boolean;
}

function blankDraft(): Draft {
  return {
    category: 'General',
    title: '',
    amount: '',
    vendor: '',
    paymentMethod: 'Cash',
    reference: '',
    note: '',
    expenseDate: todayInput(),
    isPaid: true,
  };
}

export function AdminExpensesScreen() {
  useDocumentTitle('Expenses');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const expenses = useAsync(
    () => businessApi.expenses({ page, pageSize: 10, category: category || undefined }),
    [category, page],
  );
  const overview = useAsync(() => businessApi.overview(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft(blankDraft());
    setOpen(true);
  };

  const openEdit = (expense: ExpenseEntry) => {
    setEditing(expense);
    setDraft({
      category: expense.category,
      title: expense.title,
      amount: String(expense.amount),
      vendor: expense.vendor ?? '',
      paymentMethod: expense.paymentMethod,
      reference: expense.reference ?? '',
      note: expense.note ?? '',
      expenseDate: expense.expenseDate.slice(0, 10),
      isPaid: expense.isPaid,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      toast('Give this expense a title.', 'error');
      return;
    }
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('Enter an amount greater than zero.', 'error');
      return;
    }
    const payload: ExpenseEntryRequest = {
      category: draft.category,
      title: draft.title.trim(),
      amount,
      vendor: draft.vendor.trim() || null,
      paymentMethod: draft.paymentMethod,
      reference: draft.reference.trim() || null,
      note: draft.note.trim() || null,
      expenseDate: toIso(draft.expenseDate),
      isPaid: draft.isPaid,
    };
    setSaving(true);
    try {
      if (editing) await businessApi.updateExpense(editing.id, payload);
      else await businessApi.createExpense(payload);
      toast(editing ? 'Expense updated.' : 'Expense recorded.', 'success');
      setOpen(false);
      expenses.reload(true);
      overview.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this expense.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense: ExpenseEntry) => {
    const ok = await confirm({
      title: 'Delete this expense?',
      message: `${expense.title} (${fmt(expense.amount)}) will be removed from the ledger.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await businessApi.deleteExpense(expense.id);
      toast('Expense deleted.', 'success');
      expenses.reload(true);
      overview.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this expense.', 'error');
    }
  };

  const summary = overview.data;

  return (
    <AdminPage
      title="Expenses"
      subtitle="Every cost outside stock purchases, ready for profit reporting."
      actions={<Button label="Add expense" onPress={openCreate} />}
    >
      {summary ? (
        <SummaryGrid>
          <StatCard label="Expenses this month" value={fmt(summary.thisMonth.expenses)} hint="month to date" accent={colors.warning} />
          <StatCard label="Expenses lifetime" value={fmt(summary.lifetime.expenses)} hint="all recorded costs" accent={colors.accent} />
          <StatCard label="Net profit this month" value={fmt(summary.thisMonth.netProfit)} hint={`${summary.thisMonth.margin.toFixed(1)}% margin`} accent={colors.success} />
        </SummaryGrid>
      ) : null}

      <Toolbar>
        <SelectField
          label="Category"
          value={category}
          allowClear
          options={EXPENSE_CATEGORIES.map(value => ({ value, label: titleCase(value) }))}
          onChange={value => {
            setCategory(value ?? '');
            setPage(1);
          }}
          style={{ flex: 1, minWidth: 200 }}
        />
      </Toolbar>

      {expenses.loading && !expenses.data ? (
        <Spinner label="Loading expenses…" />
      ) : expenses.error ? (
        <ErrorState message={expenses.error} onRetry={() => expenses.reload()} />
      ) : (expenses.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No expenses"
          message={category ? `No ${category.toLowerCase()} expenses recorded.` : 'Record rent, salaries, marketing and other running costs here.'}
          actionLabel="Add expense"
          onAction={openCreate}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {expenses.data?.items.map(expense => (
              <Card key={expense.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">{expense.title}</AppText>
                      <Badge label={titleCase(expense.category)} />
                      <Badge
                        label={expense.isPaid ? 'Paid' : 'Unpaid'}
                        tone={expense.isPaid ? { bg: colors.successSoft, fg: colors.success } : { bg: colors.warningSoft, fg: colors.warning }}
                      />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {date(expense.expenseDate)} · {titleCase(expense.paymentMethod)}
                      {expense.vendor ? ` · ${expense.vendor}` : ''}
                      {expense.reference ? ` · ${expense.reference}` : ''}
                    </AppText>
                  </View>
                  <AppText variant="h3">{fmt(expense.amount)}</AppText>
                </View>
                {expense.note ? <AppText variant="small" color={colors.muted}>{expense.note}</AppText> : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Button label="Edit" size="sm" variant="outline" onPress={() => openEdit(expense)} />
                  <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => remove(expense)} />
                </View>
              </Card>
            ))}
          </View>
          {expenses.data ? (
            <Pagination
              page={expenses.data.pagination.page}
              totalPages={expenses.data.pagination.totalPages}
              totalItems={expenses.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={open}
        title={editing ? 'Edit expense' : 'New expense'}
        onClose={() => !saving && setOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Record expense'} onPress={save} loading={saving} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField
            label="Title"
            value={draft.title}
            onChangeText={value => setDraft(prev => ({ ...prev, title: value }))}
            placeholder="Studio rent for November"
            style={{ flex: 2, minWidth: 200 }}
          />
          <SelectField
            label="Category"
            value={draft.category}
            options={EXPENSE_CATEGORIES.map(value => ({ value, label: titleCase(value) }))}
            onChange={value => setDraft(prev => ({ ...prev, category: value ?? 'General' }))}
            style={{ flex: 1, minWidth: 160 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField
            label="Amount"
            value={draft.amount}
            onChangeText={value => setDraft(prev => ({ ...prev, amount: value }))}
            keyboardType="decimal-pad"
            style={{ flex: 1, minWidth: 120 }}
          />
          <TextField
            label="Date"
            value={draft.expenseDate}
            onChangeText={value => setDraft(prev => ({ ...prev, expenseDate: value }))}
            placeholder="YYYY-MM-DD"
            style={{ flex: 1, minWidth: 140 }}
          />
          <SelectField
            label="Payment method"
            value={draft.paymentMethod}
            options={PAYMENT_METHODS.map(method => ({ value: method, label: method }))}
            onChange={value => setDraft(prev => ({ ...prev, paymentMethod: value ?? 'Cash' }))}
            style={{ flex: 1, minWidth: 160 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField
            label="Vendor (optional)"
            value={draft.vendor}
            onChangeText={value => setDraft(prev => ({ ...prev, vendor: value }))}
            style={{ flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Reference (optional)"
            value={draft.reference}
            onChangeText={value => setDraft(prev => ({ ...prev, reference: value }))}
            style={{ flex: 1, minWidth: 160 }}
          />
        </View>
        <TextField
          label="Note (optional)"
          value={draft.note}
          onChangeText={value => setDraft(prev => ({ ...prev, note: value }))}
          multiline
        />
        <ToggleRow
          label="Mark as paid"
          description="Unpaid expenses are tracked but flagged for follow-up."
          value={draft.isPaid}
          onValueChange={value => setDraft(prev => ({ ...prev, isPaid: value }))}
        />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
});
