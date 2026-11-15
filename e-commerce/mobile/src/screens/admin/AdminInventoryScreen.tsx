import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { adminApi } from '../../api';
import type { InventoryItem } from '../../api/types';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ModalSheet,
  Pagination,
  SearchInput,
  SelectField,
  Spinner,
  Tabs,
  TextField,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, Toolbar } from './AdminKit';

const adjustTypes = [
  { label: 'Restock', value: 'Restock' },
  { label: 'Manual adjustment', value: 'Adjustment' },
  { label: 'Damaged / lost', value: 'Damage' },
  { label: 'Customer return', value: 'Return' },
];

function stockTone(status: string) {
  if (status === 'OutOfStock') return { bg: colors.dangerSoft, fg: colors.danger };
  if (status === 'LowStock') return { bg: colors.warningSoft, fg: colors.warning };
  return { bg: colors.successSoft, fg: colors.success };
}

export function AdminInventoryScreen() {
  useDocumentTitle('Inventory');
  const { fmt } = useSettings();
  const { toast } = useFeedback();
  const [tab, setTab] = useState<'stock' | 'transactions'>('stock');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState('Restock');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const inventory = useAsync(
    () => adminApi.inventory({ page, pageSize: 12, search: submitted || undefined }),
    [page, submitted],
  );
  const transactions = useAsync(
    () => adminApi.inventoryTransactions({ page, pageSize: 15, search: submitted || undefined }),
    [page, submitted, tab],
  );

  const openAdjust = (item: InventoryItem) => {
    setAdjusting(item);
    setVariantId('');
    setQuantity('');
    setType('Restock');
    setNote('');
  };

  const saveAdjustment = async () => {
    if (!adjusting) return;
    const change = Number(quantity);
    if (!Number.isFinite(change) || change === 0) {
      toast('Enter a non-zero quantity change.', 'error');
      return;
    }
    setSaving(true);
    try {
      await adminApi.adjustStock(adjusting.productId, {
        quantityChange: change,
        variantId: variantId || null,
        note: note.trim() || null,
        type,
      });
      toast('Stock adjusted.', 'success');
      setAdjusting(null);
      inventory.reload(true);
      transactions.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to adjust stock.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Inventory" subtitle="Stock levels, alerts and every movement in one ledger.">
      <Tabs
        tabs={[
          { key: 'stock', label: 'Stock levels' },
          { key: 'transactions', label: 'Transactions' },
        ]}
        active={tab}
        onChange={key => {
          setTab(key as 'stock' | 'transactions');
          setPage(1);
        }}
      />
      <Toolbar>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmitted(search.trim());
            setPage(1);
          }}
          placeholder="Search by product or SKU…"
          style={{ maxWidth: 420 }}
        />
        <Button
          label="Reset"
          variant="ghost"
          onPress={() => {
            setSearch('');
            setSubmitted('');
            setPage(1);
          }}
        />
      </Toolbar>

      {tab === 'stock' ? (
        inventory.loading && !inventory.data ? (
          <Spinner label="Loading inventory…" />
        ) : inventory.error ? (
          <ErrorState message={inventory.error} onRetry={() => inventory.reload()} />
        ) : (inventory.data?.items.length ?? 0) === 0 ? (
          <EmptyState title="No inventory found" message="Products appear here once they are created." />
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              {inventory.data?.items.map(item => (
                <Card key={item.productId} style={{ padding: spacing.lg }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                        <AppText variant="title">{item.name}</AppText>
                        <Badge label={item.status} tone={stockTone(item.status)} />
                      </View>
                      <AppText variant="tiny" color={colors.muted}>
                        {item.sku} · {item.categoryName ?? 'Uncategorised'} · cost {fmt(item.costPrice)}
                      </AppText>
                      <AppText variant="tiny" color={colors.faint}>
                        Product stock {item.stock} · Total {item.totalStock} · Alert at {item.lowStockThreshold}
                      </AppText>
                      {item.variants.length ? (
                        <AppText variant="tiny" color={colors.muted}>
                          {item.variants.map(variant => `${variant.name}: ${variant.stock}`).join(' · ')}
                        </AppText>
                      ) : null}
                    </View>
                    <Button label="Adjust stock" size="sm" variant="secondary" onPress={() => openAdjust(item)} />
                  </View>
                </Card>
              ))}
            </View>
            {inventory.data ? (
              <Pagination
                page={inventory.data.pagination.page}
                totalPages={inventory.data.pagination.totalPages}
                totalItems={inventory.data.pagination.totalItems}
                onChange={setPage}
              />
            ) : null}
          </>
        )
      ) : transactions.loading && !transactions.data ? (
        <Spinner label="Loading transactions…" />
      ) : transactions.error ? (
        <ErrorState message={transactions.error} onRetry={() => transactions.reload()} />
      ) : (transactions.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No stock movements" message="Adjustments, purchases and returns will appear here." />
      ) : (
        <>
          <Card padded={false}>
            {transactions.data?.items.map((entry, index) => (
              <View key={entry.id}>
                <View style={styles.transactionRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                    <AppText variant="title">{entry.productName}</AppText>
                    <AppText variant="tiny" color={colors.muted}>
                      {entry.type} · {dateTime(entry.createdAt)}
                      {entry.reference ? ` · ${entry.reference}` : ''}
                    </AppText>
                    {entry.note ? <AppText variant="tiny" color={colors.faint}>{entry.note}</AppText> : null}
                  </View>
                  <AppText variant="title" color={entry.quantityChange >= 0 ? colors.success : colors.danger}>
                    {entry.quantityChange >= 0 ? '+' : ''}
                    {entry.quantityChange}
                  </AppText>
                  <AppText variant="tiny" color={colors.faint}>After {entry.stockAfter}</AppText>
                </View>
                {index < (transactions.data?.items.length ?? 0) - 1 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
              </View>
            ))}
          </Card>
          {transactions.data ? (
            <Pagination
              page={transactions.data.pagination.page}
              totalPages={transactions.data.pagination.totalPages}
              totalItems={transactions.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={!!adjusting}
        title="Adjust stock"
        subtitle={adjusting?.name}
        onClose={() => setAdjusting(null)}
        width={560}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setAdjusting(null)} />
            <Button label="Apply adjustment" onPress={saveAdjustment} loading={saving} />
          </>
        }
      >
        {adjusting && adjusting.variants.length > 0 ? (
          <SelectField
            label="Variant"
            value={variantId}
            options={[
              { label: `Product level (${adjusting.stock} in stock)`, value: '' },
              ...adjusting.variants.map(variant => ({ label: `${variant.name} (${variant.stock})`, value: variant.id })),
            ]}
            onChange={setVariantId}
          />
        ) : null}
        <SelectField label="Reason" value={type} options={adjustTypes} onChange={setType} />
        <TextField
          label="Quantity change"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
          placeholder="Use a negative number to remove stock"
          helper="Example: 12 to add, -3 to remove."
        />
        <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, flexWrap: 'wrap' },
});
