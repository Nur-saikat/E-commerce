import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Order } from '../api/types';
import { dateTime, titleCase } from '../format';
import { useSettings } from '../state/SettingsContext';
import { colors, radius, spacing } from '../theme';
import { AppText, Badge, Card, Divider, KeyValue, ProductImage } from './ui';

export function OrderDetails({ order }: { order: Order }) {
  const { fmt } = useSettings();
  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ padding: spacing.xl, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
          <View>
            <AppText variant="h3">Order {order.orderNumber}</AppText>
            <AppText variant="tiny" color={colors.muted} style={{ marginTop: 2 }}>
              Placed {dateTime(order.createdAt)}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Badge label={order.status} />
            <Badge label={order.paymentStatus} />
          </View>
        </View>
        <Divider />
        <View style={{ gap: spacing.lg }}>
          {order.items.map(item => (
            <View key={`${item.productId}-${item.variantId ?? 'base'}`} style={styles.itemRow}>
              <View style={{ width: 56 }}>
                <ProductImage url={item.imageUrl} name={item.productName} height={56} radiusValue={10} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="title" numberOfLines={1}>{item.productName}</AppText>
                <AppText variant="tiny" color={colors.muted}>
                  SKU {item.sku} · {item.quantity} × {fmt(item.unitPrice)}
                  {item.variantName ? ` · ${item.variantName}` : ''}
                </AppText>
              </View>
              <AppText variant="title">{fmt(item.lineTotal)}</AppText>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' }}>
        <Card style={{ flex: 1, minWidth: 260, padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">Delivery</AppText>
          <View>
            <AppText variant="title">{order.shippingAddress.fullName}</AppText>
            <AppText variant="small" color={colors.muted}>
              {order.shippingAddress.street}
            </AppText>
            <AppText variant="small" color={colors.muted}>
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            </AppText>
            <AppText variant="small" color={colors.muted}>{order.shippingAddress.country}</AppText>
            <AppText variant="small" color={colors.muted} style={{ marginTop: 4 }}>
              {order.shippingAddress.phone}
            </AppText>
          </View>
          <Divider />
          <KeyValue label="Shipping method" value={order.shippingMethodName || '—'} />
          {order.trackingNumber ? <KeyValue label="Tracking number" value={order.trackingNumber} /> : null}
        </Card>

        <Card style={{ flex: 1, minWidth: 260, padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">Payment</AppText>
          <KeyValue label="Method" value={order.paymentMethod} />
          <KeyValue label="Status" value={titleCase(order.paymentStatus)} />
          {order.paymentTransactionId ? (
            <KeyValue label="Transaction" value={order.paymentTransactionId} />
          ) : null}
          <Divider />
          <KeyValue label="Subtotal" value={fmt(order.subtotal)} />
          {order.discount > 0 ? (
            <KeyValue label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`− ${fmt(order.discount)}`} />
          ) : null}
          <KeyValue label="Shipping" value={order.shippingCost === 0 ? 'Free' : fmt(order.shippingCost)} />
          <KeyValue label="Tax" value={fmt(order.taxAmount)} />
          {order.pointsDiscount > 0 ? (
            <KeyValue label={`Voucher points (${order.pointsRedeemed})`} value={`− ${fmt(order.pointsDiscount)}`} />
          ) : null}
          <Divider />
          <KeyValue label="Total" value={fmt(order.total)} strong />
          {order.refundedAmount > 0 ? (
            <KeyValue label="Refunded" value={fmt(order.refundedAmount)} />
          ) : null}
        </Card>
      </View>

      {order.notes ? (
        <Card style={{ padding: spacing.xl, gap: spacing.sm }}>
          <AppText variant="h3">Notes</AppText>
          <AppText variant="small" color={colors.inkSoft}>{order.notes}</AppText>
        </Card>
      ) : null}

      {order.statusHistory.length ? (
        <Card style={{ padding: spacing.xl, gap: spacing.md }}>
          <AppText variant="h3">Timeline</AppText>
          {order.statusHistory
            .slice()
            .reverse()
            .map((entry, index) => (
              <View key={`${entry.status}-${entry.changedAt}-${index}`} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={{ flex: 1 }}>
                  <AppText variant="title">{titleCase(entry.status)}</AppText>
                  {entry.note ? <AppText variant="tiny" color={colors.muted}>{entry.note}</AppText> : null}
                  <AppText variant="tiny" color={colors.faint}>{dateTime(entry.changedAt)}</AppText>
                </View>
              </View>
            ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  timelineRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
});
