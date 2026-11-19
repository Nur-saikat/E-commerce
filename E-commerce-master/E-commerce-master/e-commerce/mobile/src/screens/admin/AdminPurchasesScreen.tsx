import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { businessApi } from '../../api';
import type { BusinessProductOption, StockPurchaseLineRequest, StockPurchaseRequest } from '../../api/types';
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
  TextField,
} from '../../components/ui';
import { date, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { toIso, todayInput } from '../../utils/dates';
import { AdminPage, EmptyRow } from './AdminKit';

export function AdminPurchasesScreen() {
  useDocumentTitle('Purchases');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [page, setPage] = useState(1);
  const purchases = useAsync(() => businessApi.purchases({ page, pageSize: 10 }), [page]);

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<BusinessProductOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayInput);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<StockPurchaseLineRequest[]>([]);
  const [picked, setPicked] = useState<BusinessProductOption | null>(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [saving, setSaving] = useState(false);

  const openModal = async () => {
    setOpen(true);
    setSupplier('');
    setReference('');
    setNote('');
    setPurchaseDate(todayInput());
    setSearch('');
    setLines([]);
    setPicked(null);
    setVariantId('');
    setQuantity('1');
    setUnitCost('');
    if (options.length === 0) {
      setOptionsLoading(true);
      try {
        setOptions(await businessApi.products());
      } catch (error: any) {
        toast(error?.message ?? 'Unable to load products.', 'error');
      } finally {
        setOptionsLoading(false);
      }
    }
  };

  const matches = options
    .filter(option => {
      const term = search.trim().toLowerCase();
      if (!term) return true;
      return option.name.toLowerCase().includes(term) || option.sku.toLowerCase().includes(term);
    })
    .slice(0, 8);

  const chooseProduct = (option: BusinessProductOption) => {
    setPicked(option);
    setVariantId('');
    setUnitCost(option.costPrice ? String(option.costPrice) : '');
    setQuantity('1');
  };

  const addLine = () => {
    if (!picked) {
      toast('Choose a product first.', 'error');
      return;
    }
    const qty = Number(quantity);
    const cost = Number(unitCost);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast('Quantity must be greater than zero.', 'error');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast('Enter a valid unit cost.', 'error');
      return;
    }
    setLines(prev => [
      ...prev,
      { productId: picked.id, variantId: variantId || null, quantity: qty, unitCost: cost },
    ]);
    setPicked(null);
    setVariantId('');
    setQuantity('1');
    setUnitCost('');
    setSearch('');
  };

  const lineName = (line: StockPurchaseLineRequest) => {
    const option = options.find(o => o.id === line.productId);
    const variant = option?.variants.find(v => v.id === line.variantId);
    return `${option?.name ?? 'Product'}${variant ? ` · ${variant.name}` : ''}`;
  };

  const save = async () => {
    if (lines.length === 0) {
      toast('Add at least one product to the purchase.', 'error');
      return;
    }
    const payload: StockPurchaseRequest = {
      supplier: supplier.trim() || null,
      reference: reference.trim() || null,
      note: note.trim() || null,
      purchaseDate: toIso(purchaseDate),
      items: lines,
    };
    setSaving(true);
    try {
      await businessApi.createPurchase(payload);
      toast('Purchase recorded and stock updated.', 'success');
      setOpen(false);
      purchases.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to save this purchase.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this purchase?',
      message: 'Stock added by this purchase will be reversed. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await businessApi.deletePurchase(id);
      toast('Purchase deleted.', 'success');
      purchases.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this purchase.', 'error');
    }
  };

  const variantOptions = [
    { value: '', label: 'Base product' },
    ...(picked?.variants ?? []).map(variant => ({ value: variant.id, label: `${variant.name} (${variant.sku})` })),
  ];

  const draftTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);

  return (
    <AdminPage
      title="Stock purchases"
      subtitle="Record supplier invoices with multiple products in one entry."
      actions={<Button label="New purchase" onPress={openModal} />}
    >
      {purchases.loading && !purchases.data ? (
        <Spinner label="Loading purchases…" />
      ) : purchases.error ? (
        <ErrorState message={purchases.error} onRetry={() => purchases.reload()} />
      ) : (purchases.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No purchases yet"
          message="Record your first supplier purchase to start tracking landed stock and costs."
          actionLabel="New purchase"
          onAction={openModal}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {purchases.data?.items.map(purchase => (
              <Card key={purchase.id} style={{ padding: spacing.lg, gap: spacing.md }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">{purchase.supplier || 'Stock purchase'}</AppText>
                      <Badge
                        label={purchase.stockApplied ? 'Stock applied' : 'Pending stock'}
                        tone={purchase.stockApplied ? { bg: colors.successSoft, fg: colors.success } : { bg: colors.warningSoft, fg: colors.warning }}
                      />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {date(purchase.purchaseDate)} · {purchase.items.length} line(s) · {purchase.totalQuantity} unit(s)
                      {purchase.reference ? ` · ${purchase.reference}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="tiny" color={colors.muted}>Total cost</AppText>
                    <AppText variant="h3">{fmt(purchase.totalAmount)}</AppText>
                  </View>
                </View>

                <View style={styles.linesBox}>
                  {purchase.items.map(line => (
                    <View key={`${line.productId}-${line.variantId ?? ''}-${line.unitCost}`} style={styles.lineRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="small" numberOfLines={1}>
                          {line.productName}
                          {line.variantName ? ` · ${line.variantName}` : ''}
                        </AppText>
                        <AppText variant="tiny" color={colors.faint}>
                          {line.quantity} × {fmt(line.unitCost)}
                        </AppText>
                      </View>
                      <AppText variant="small" weight="600">{fmt(line.lineTotal)}</AppText>
                    </View>
                  ))}
                </View>

                {purchase.note ? <AppText variant="small" color={colors.muted}>{purchase.note}</AppText> : null}

                <Button
                  label="Delete"
                  size="sm"
                  variant="ghost"
                  textStyle={{ color: colors.danger }}
                  onPress={() => remove(purchase.id)}
                  style={{ alignSelf: 'flex-start' }}
                />
              </Card>
            ))}
          </View>
          {purchases.data ? (
            <Pagination
              page={purchases.data.pagination.page}
              totalPages={purchases.data.pagination.totalPages}
              totalItems={purchases.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <ModalSheet
        visible={open}
        title="New stock purchase"
        subtitle="Add every product on the supplier invoice."
        onClose={() => !saving && setOpen(false)}
        width={760}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label="Save purchase" onPress={save} loading={saving} />
          </>
        }
      >
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Supplier" value={supplier} onChangeText={setSupplier} placeholder="Supplier or vendor name" style={{ flex: 1, minWidth: 200 }} />
          <TextField label="Invoice reference" value={reference} onChangeText={setReference} placeholder="Invoice number" style={{ flex: 1, minWidth: 160 }} />
          <TextField label="Purchase date" value={purchaseDate} onChangeText={setPurchaseDate} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
        </View>

        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: spacing.md, gap: spacing.sm }}>
          <AppText variant="title">Add products</AppText>
          {optionsLoading ? (
            <Spinner label="Loading catalogue…" />
          ) : picked ? (
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <AppText variant="small" weight="600">{picked.name}</AppText>
                  <AppText variant="tiny" color={colors.muted}>{picked.sku} · stock {picked.totalStock}</AppText>
                </View>
                <Button label="Change" size="sm" variant="ghost" onPress={() => setPicked(null)} />
              </View>
              {picked.variants.length > 0 ? (
                <SelectField label="Variant" value={variantId} options={variantOptions} onChange={value => setVariantId(value ?? '')} />
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={{ flex: 1, minWidth: 100 }} />
                <TextField label="Unit cost" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 120 }} />
                <Button label="Add line" variant="secondary" onPress={addLine} style={{ marginBottom: 1 }} />
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <SearchInput value={search} onChangeText={setSearch} placeholder="Search products by name or SKU" />
              {matches.length === 0 ? (
                <AppText variant="small" color={colors.muted}>No products match “{search}”.</AppText>
              ) : (
                <View style={{ gap: 4 }}>
                  {matches.map(option => (
                    <Button
                      key={option.id}
                      label={`${option.name} · ${option.sku} · stock ${option.totalStock}`}
                      variant="ghost"
                      size="sm"
                      textStyle={{ color: colors.ink }}
                      onPress={() => chooseProduct(option)}
                      style={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="title">Invoice lines</AppText>
            <AppText variant="small" weight="600">Total {fmt(draftTotal)}</AppText>
          </View>
          {lines.length === 0 ? (
            <EmptyRow message="No products added yet." />
          ) : (
            <View style={{ gap: 6 }}>
              {lines.map((line, index) => (
                <View key={`${line.productId}-${line.variantId ?? ''}-${index}`} style={styles.lineRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="small" numberOfLines={1}>{lineName(line)}</AppText>
                    <AppText variant="tiny" color={colors.faint}>{line.quantity} × {fmt(line.unitCost)}</AppText>
                  </View>
                  <AppText variant="small" weight="600">{fmt(line.quantity * line.unitCost)}</AppText>
                  <Button
                    label="Remove"
                    size="sm"
                    variant="ghost"
                    textStyle={{ color: colors.danger }}
                    onPress={() => setLines(prev => prev.filter((_, i) => i !== index))}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline placeholder="Delivery terms, payment status or anything to remember." />
        <AppText variant="tiny" color={colors.muted}>
          Saving a purchase adds every line to stock and records the cost for profit reporting.
        </AppText>
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
  linesBox: { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: spacing.md, gap: 8 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
