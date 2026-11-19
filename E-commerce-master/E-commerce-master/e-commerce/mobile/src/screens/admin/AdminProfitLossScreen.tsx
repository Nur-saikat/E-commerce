import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { businessApi } from '../../api';
import {
  AppText,
  Button,
  Card,
  ErrorState,
  KeyValue,
  Section,
  Spinner,
  StatCard,
  Tabs,
  TextField,
} from '../../components/ui';
import { isoDate, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, EmptyRow, MiniBars, SummaryGrid, Toolbar } from './AdminKit';

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return isoDate(d.toISOString());
}

export function AdminProfitLossScreen() {
  useDocumentTitle('Profit & loss');
  const { fmt } = useSettings();
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => isoDate(new Date().toISOString()));
  const report = useAsync(
    () => businessApi.profitLoss({ from: from || undefined, to: to || undefined, groupBy }),
    [from, to, groupBy],
  );
  const data = report.data;

  return (
    <AdminPage title="Profit & loss" subtitle="Revenue, cost of goods and operating expenses in one view.">
      <Toolbar>
        <TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
        <TextField label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={{ flex: 1, minWidth: 150 }} />
        <Button label="Apply" onPress={() => report.reload()} style={{ marginBottom: 1 }} />
      </Toolbar>
      <Tabs
        tabs={[
          { key: 'day', label: 'Daily' },
          { key: 'month', label: 'Monthly' },
        ]}
        active={groupBy}
        onChange={key => setGroupBy(key as 'day' | 'month')}
      />

      {report.loading && !data ? (
        <Spinner label="Calculating performance…" />
      ) : report.error ? (
        <ErrorState message={report.error} onRetry={() => report.reload()} />
      ) : data ? (
        <>
          <SummaryGrid>
            <StatCard label="Revenue" value={fmt(data.revenue)} hint={`${data.orders} orders`} />
            <StatCard label="Cost of goods" value={fmt(data.costOfGoods)} hint={`${data.purchases ? 'incl. purchases' : ''}`} accent={colors.accent} />
            <StatCard label="Gross profit" value={fmt(data.grossProfit)} hint={`${data.margin.toFixed(1)}% margin`} accent={colors.gold} />
            <StatCard label="Expenses" value={fmt(data.expenses)} hint="operating costs" accent={colors.warning} />
            <StatCard label="Net profit" value={fmt(data.netProfit)} hint={data.netProfit >= 0 ? 'profitable period' : 'loss period'} accent={data.netProfit >= 0 ? colors.success : colors.danger} />
            <StatCard label="Capital in / out" value={`${fmt(data.capitalIn)} / ${fmt(data.capitalOut)}`} hint="owner capital movement" accent={colors.info} />
          </SummaryGrid>

          <Section title="Net profit over time" subtitle={`Grouped ${groupBy === 'day' ? 'daily' : 'monthly'} from ${data.from.slice(0, 10)} to ${data.to.slice(0, 10)}.`}>
            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              <MiniBars
                points={data.series.map(point => ({ label: point.label, value: point.netProfit }))}
                valueKey="value"
              />
              <View style={{ flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' }}>
                <AppText variant="tiny" color={colors.muted}>Revenue {fmt(data.revenue)}</AppText>
                <AppText variant="tiny" color={colors.muted}>COGS {fmt(data.costOfGoods)}</AppText>
                <AppText variant="tiny" color={colors.muted}>Expenses {fmt(data.expenses)}</AppText>
              </View>
            </Card>
          </Section>

          <View style={styles.twoColumn}>
            <Card style={{ padding: spacing.lg, gap: spacing.sm, flex: 1, minWidth: 280 }}>
              <AppText variant="h3">Summary</AppText>
              <KeyValue label="Revenue" value={fmt(data.revenue)} />
              <KeyValue label="Cost of goods sold" value={fmt(data.costOfGoods)} />
              <KeyValue label="Gross profit" value={fmt(data.grossProfit)} strong />
              <KeyValue label="Operating expenses" value={fmt(data.expenses)} />
              <KeyValue label="Net profit" value={fmt(data.netProfit)} strong />
              <KeyValue label="Margin" value={`${data.margin.toFixed(1)}%`} />
              <KeyValue label="Stock purchases" value={fmt(data.purchases)} />
              <KeyValue label="Supplier returns" value={fmt(data.purchaseReturns)} />
              <KeyValue label="Capital invested" value={fmt(data.capitalIn)} />
              <KeyValue label="Capital withdrawn" value={fmt(data.capitalOut)} />
            </Card>

            <Card style={{ padding: spacing.lg, gap: spacing.md, flex: 1, minWidth: 280 }}>
              <AppText variant="h3">Period detail</AppText>
              {data.series.length === 0 ? (
                <EmptyRow message="No activity in this range." />
              ) : (
                <View style={{ gap: 8 }}>
                  <View style={styles.tableHead}>
                    <AppText variant="tiny" color={colors.muted} style={{ width: 86 }}>Period</AppText>
                    <AppText variant="tiny" color={colors.muted} style={{ flex: 1, textAlign: 'right' }}>Revenue</AppText>
                    <AppText variant="tiny" color={colors.muted} style={{ flex: 1, textAlign: 'right' }}>COGS</AppText>
                    <AppText variant="tiny" color={colors.muted} style={{ flex: 1, textAlign: 'right' }}>Expenses</AppText>
                    <AppText variant="tiny" color={colors.muted} style={{ flex: 1, textAlign: 'right' }}>Net</AppText>
                  </View>
                  {data.series.map(point => (
                    <View key={point.period} style={styles.tableRow}>
                      <AppText variant="tiny" style={{ width: 86 }} numberOfLines={1}>{titleCase(point.label)}</AppText>
                      <AppText variant="tiny" style={{ flex: 1, textAlign: 'right' }}>{fmt(point.revenue)}</AppText>
                      <AppText variant="tiny" style={{ flex: 1, textAlign: 'right' }}>{fmt(point.costOfGoods)}</AppText>
                      <AppText variant="tiny" style={{ flex: 1, textAlign: 'right' }}>{fmt(point.expenses)}</AppText>
                      <AppText
                        variant="tiny"
                        weight="600"
                        color={point.netProfit >= 0 ? colors.success : colors.danger}
                        style={{ flex: 1, textAlign: 'right' }}
                      >
                        {fmt(point.netProfit)}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </View>
        </>
      ) : null}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  twoColumn: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  tableHead: { flexDirection: 'row', gap: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
});
