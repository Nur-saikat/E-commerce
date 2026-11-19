import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, EmptyState, ErrorState, KeyValue, Page, PageHeader, Spinner, TextField, AlertBox, Badge, Divider } from '../../components/ui';
import { ProductImage } from '../../components/ui';
import { AppText } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useCart } from '../../state/CartContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

export function CartScreen() {
  useDocumentTitle('Your cart');
  const router = useRouter();
  const cart = useCart();
  const { toast } = useFeedback();
  const { fmt } = useSettings();
  const [coupon, setCoupon] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [lineBusy, setLineBusy] = useState<string | null>(null);

  const changeQty = async (itemId: string, quantity: number) => {
    setLineBusy(itemId);
    try {
      await cart.updateQuantity(itemId, quantity);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update the quantity.', 'error');
    } finally {
      setLineBusy(null);
    }
  };

  const removeItem = async (itemId: string, name: string) => {
    setLineBusy(itemId);
    try {
      await cart.remove(itemId);
      toast(`${name} removed from your cart.`, 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to remove this item.', 'error');
    } finally {
      setLineBusy(null);
    }
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponBusy(true);
    try {
      await cart.applyCoupon(coupon);
      setCoupon('');
      toast('Coupon applied.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'This coupon cannot be applied.', 'error');
    } finally {
      setCouponBusy(false);
    }
  };

  if (cart.loading && cart.items.length === 0) {
    return (
      <Page>
        <Spinner label="Loading your cart…" />
      </Page>
    );
  }

  if (!cart.items.length) {
    return (
      <Page>
        <PageHeader title="Your cart" subtitle="Pieces you have chosen for your family." />
        <EmptyState
          title="Your cart is empty"
          message="Browse the collection and add something lovely for your little one."
          actionLabel="Start shopping"
          onAction={() => router.navigate('shop')}
        />
      </Page>
    );
  }

  const unavailable = cart.items.some(item => !item.isAvailable);

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back
        title="Your cart"
        subtitle={`${cart.count} item${cart.count === 1 ? '' : 's'} ready for checkout.`}
        actions={<Button label="Clear cart" variant="ghost" onPress={async () => {
          try {
            await cart.clear();
            toast('Cart cleared.', 'success');
          } catch (error: any) {
            toast(error?.message ?? 'Unable to clear the cart.', 'error');
          }
        }} />}
      />
      {unavailable ? (
        <AlertBox
          tone="warning"
          title="Some items need attention"
          message="An item in your cart is no longer available in the requested quantity. Adjust it before checking out."
        />
      ) : null}
      <View style={[styles.layout, { flexDirection: 'column' }]}>
        <View style={{ gap: spacing.md }}>
          {cart.items.map(item => (
            <Card key={item.id} style={{ padding: spacing.md }}>
              <View style={styles.row}>
                <View style={{ width: 96 }}>
                  <ProductImage url={item.imageUrl} name={item.productName} height={96} radiusValue={12} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <AppText
                    variant="title"
                    numberOfLines={2}
                    onPress={() => router.navigate('product', { slug: item.slug })}
                  >
                    {item.productName}
                  </AppText>
                  {item.variantName ? <AppText variant="tiny" color={colors.muted}>Variant: {item.variantName}</AppText> : null}
                  <AppText variant="tiny" color={colors.faint}>SKU {item.sku}</AppText>
                  {!item.isAvailable ? <Badge label="Unavailable" tone={{ bg: colors.dangerSoft, fg: colors.danger }} /> : null}
                  <View style={styles.rowBottom}>
                    <View style={styles.qty}>
                      <Button
                        label="−"
                        size="sm"
                        variant="ghost"
                        disabled={item.quantity <= 1 || lineBusy === item.id}
                        onPress={() => changeQty(item.id, item.quantity - 1)}
                      />
                      <AppText variant="title" style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</AppText>
                      <Button
                        label="+"
                        size="sm"
                        variant="ghost"
                        disabled={item.quantity >= item.stockAvailable || lineBusy === item.id}
                        onPress={() => changeQty(item.id, item.quantity + 1)}
                      />
                    </View>
                    <AppText variant="title">{fmt(item.lineTotal)}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="tiny" color={colors.faint}>{fmt(item.unitPrice)} each</AppText>
                    <Button
                      label={lineBusy === item.id ? 'Removing…' : 'Remove'}
                      size="sm"
                      variant="link"
                      onPress={() => removeItem(item.id, item.productName)}
                    />
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>

        <View style={{ gap: spacing.md }}>
          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Order summary</AppText>
            <KeyValue label="Subtotal" value={fmt(cart.summary.subtotal)} />
            {cart.summary.discount > 0 ? (
              <KeyValue label={`Discount${cart.summary.couponCode ? ` (${cart.summary.couponCode})` : ''}`} value={`− ${fmt(cart.summary.discount)}`} />
            ) : null}
            <KeyValue label="Shipping" value={cart.summary.shipping === 0 ? 'Free' : fmt(cart.summary.shipping)} />
            <KeyValue label="Tax" value={fmt(cart.summary.tax)} />
            <Divider />
            <KeyValue label="Total" value={fmt(cart.summary.total)} strong />
            {cart.summary.amountToFreeShipping > 0 ? (
              <AlertBox
                tone="info"
                message={`Add ${fmt(cart.summary.amountToFreeShipping)} more for free shipping.`}
              />
            ) : null}
            <Button
              label="Proceed to checkout"
              size="lg"
              full
              disabled={unavailable}
              onPress={() => router.navigate('checkout')}
            />
            <Button label="Continue shopping" variant="ghost" onPress={() => router.navigate('shop')} />
          </Card>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Coupon</AppText>
            {cart.summary.couponCode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <Badge label={cart.summary.couponCode} tone={{ bg: colors.successSoft, fg: colors.success }} />
                <Button
                  label="Remove coupon"
                  size="sm"
                  variant="link"
                  onPress={async () => {
                    try {
                      await cart.removeCoupon();
                      toast('Coupon removed.', 'success');
                    } catch (error: any) {
                      toast(error?.message ?? 'Unable to remove the coupon.', 'error');
                    }
                  }}
                />
              </View>
            ) : (
              <>
                <TextField
                  value={coupon}
                  onChangeText={setCoupon}
                  placeholder="Enter a coupon code"
                  autoCapitalize="characters"
                  onSubmitEditing={applyCoupon}
                />
                <Button label="Apply coupon" variant="outline" onPress={applyCoupon} loading={couponBusy} />
              </>
            )}
          </Card>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  layout: { gap: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 2,
  },
});
