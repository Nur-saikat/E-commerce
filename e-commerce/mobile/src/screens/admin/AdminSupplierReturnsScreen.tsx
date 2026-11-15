import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { businessApi } from '../../api';
import type { BusinessProductOption, SupplierReturnRequest } from '../../api/types';
import {
  AlertBox,
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
import { date } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { toIso, todayInput } from '../../utils/dates';
import { AdminPage, EmptyRow } from './AdminKit';

export function AdminSupplierReturnsScreen() {
  useDocumentTitle('Supplier returns');
  const { fmt } = useSettings();
  const { toast, confirm } = useFeedback();
  const [page, setPage] = useState(1);
  const returns = useAsync(() => businessApi.supplierReturns({ page, pageSize: 10 }), [page]);

  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<BusinessProductOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<BusinessProductOption | null>(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [returnDate, setReturnDate] = useState(todayInput);
  const [saving, setSaving] = useState(false);

  const openModal = async () => {
    setOpen(true);
    setSearch('');
    setPicked(null);
    setVariantId('');
    setQuantity('1');
    setUnitCost('');
    setSupplier('');
    setReference('');
    setReason('');
    setNote('');
    setReturnDate(todayInput());
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

  const save = async () => {
    if (!picked) {
      toast('Choose the product being returned.', 'error');
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
    const payload: SupplierReturnRequest = {
      productId: picked.id,
      variantId: variantId || null,
      quantity: qty,
      unitCost: cost,
      supplier: supplier.trim() || null,
      reference: reference.trim() || null,
      reason: reason.trim() || null,
      note: note.trim() || null,
      returnDate: toIso(returnDate),
    };
    setSaving(true);
    try {
      await businessApi.createSupplierReturn(payload);
      toast('Supplier return recorded and stock removed.', 'success');
      setOpen(false);
      returns.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to record this supplier return.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this supplier return?',
      message: 'The stock removed by this return will be added back. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await businessApi.deleteSupplierReturn(id);
      toast('Supplier return deleted.', 'success');
      returns.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to delete this supplier return.', 'error');
    }
  };

  const variantOptions = [
    { value: '', label: 'Base product' },
    ...(picked?.variants ?? []).map(variant => ({ value: variant.id, label: `${variant.name} (${variant.sku})` })),
  ];

  return (
    <AdminPage
      title="Supplier returns"
      subtitle="Send damaged or excess stock back to the supplier."
      actions={<Button label="Record return" onPress={openModal} />}
    >
      {returns.loading && !returns.data ? (
        <Spinner label="Loading supplier returns…" />
      ) : returns.error ? (
        <ErrorState message={returns.error} onRetry={() => returns.reload()} />
      ) : (returns.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No supplier returns"
          message="Returns to suppliers reduce purchase cost and remove stock from inventory."
          actionLabel="Record return"
          onAction={openModal}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {returns.data?.items.map(item => (
              <Card key={item.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">{item.productName}</AppText>
                      {item.variantName ? <Badge label={item.variantName} /> : null}
                      <Badge
                        label={item.stockRemoved ? 'Stock removed' : 'Stock pending'}
                        tone={item.stockRemoved ? { bg: colors.successSoft, fg: colors.success } : { bg: colors.warningSoft, fg: colors.warning }}
                      />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {date(item.returnDate)} · {item.quantity} unit(s) at {fmt(item.unitCost)}
                      {item.supplier ? ` · ${item.supplier}` : ''}
                      {item.reference ? ` · ${item.reference}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="tiny" color={colors.muted}>Credit value</AppText>
                    <AppText variant="h3">{fmt(item.totalCost)}</AppText>
                  </View>
                </View>
                {item.reason ? <AppText variant="small" color={colors.inkSoft}>Reason: {item.reason}</AppText> : null}
                {item.note ? <AppText variant="small" color={colors.muted}>{item.note}</AppText> : null}
                <Button
                  label="Delete"
                  size="sm"
                  variant="ghost"
                  textStyle={{ color: colors.danger }}
                  onPress={() => remove(item.id)}
                  style={{ alignSelf: 'flex-start' }}
                />
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
        visible={open}
        title="Record supplier return"
        subtitle="Stock is removed immediately and purchase cost is credited."
        onClose={() => !saving && setOpen(false)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setOpen(false)} />
            <Button label="Save return" onPress={save} loading={saving} />
          </>
        }
      >
        {optionsLoading ? (
          <Spinner label="Loading catalogue…" />
        ) : picked ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <AppText variant="small" weight="600">{picked.name}</AppText>
                <AppText variant="tiny" color={colors.muted}>{picked.sku} · current stock {picked.totalStock}</AppText>
              </View>
              <Button label="Change" size="sm" variant="ghost" onPress={() => setPicked(null)} />
            </View>
            {picked.variants.length > 0 ? (
              <SelectField label="Variant" value={variantId} options={variantOptions} onChange={value => setVariantId(value ?? '')} />
            ) : null}
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <SearchInput value={search} onChangeText={setSearch} placeholder="Search products by name or SKU" />
            {matches.length === 0 ? (
              <EmptyRow message={`No products match “${search}”.`} />
            ) : (
              matches.map(option => (
                <Button
                  key={option.id}
                  label={`${option.name} · ${option.sku} · stock ${option.totalStock}`}
                  variant="ghost"
                  size="sm"
                  textStyle={{ color: colors.ink }}
                  onPress={() => chooseProduct(option)}
                  style={{ justifyContent: 'flex-start' }}
                />
              ))
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={{ flex: 1, minWidth: 100 }} />
          <TextField label="Unit cost" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 120 }} />
          <TextField label="Return date" value={returnDate} onChangeText={setReturnDate} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
          <TextField label="Supplier (optional)" value={supplier} onChangeText={setSupplier} style={{ flex: 1, minWidth: 180 }} />
          <TextField label="Reference (optional)" value={reference} onChangeText={setReference} style={{ flex: 1, minWidth: 150 }} />
        </View>
        <TextField label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="Damaged, wrong item, overstock…" />
        <TextField label="Note (optional)" value={note} onChangeText={setNote} multiline />
        <AlertBox
          tone="warning"
          message="The return cannot exceed the stock currently available for this product or variant."
        />
      </ModalSheet>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
});
