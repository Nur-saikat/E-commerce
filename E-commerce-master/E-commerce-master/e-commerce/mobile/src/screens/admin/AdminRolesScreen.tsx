import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { adminApi } from '../../api';
import type { Permission, Role } from '../../api/types';
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
  Spinner,
  Tabs,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, radius, spacing } from '../../theme';
import { AdminPage, Toolbar } from './AdminKit';

export function AdminRolesScreen() {
  useDocumentTitle('Roles & audit logs');
  const [tab, setTab] = useState<'roles' | 'audit'>('roles');
  return (
    <AdminPage title="Roles & permissions" subtitle="Delegation limits and a searchable audit trail.">
      <Tabs
        tabs={[
          { key: 'roles', label: 'Roles & permissions' },
          { key: 'audit', label: 'Audit logs' },
        ]}
        active={tab}
        onChange={key => setTab(key as typeof tab)}
      />
      {tab === 'roles' ? <RolesPanel /> : <AuditPanel />}
    </AdminPage>
  );
}

function RolesPanel() {
  const { toast } = useFeedback();
  const roles = useAsync(() => adminApi.roles(), []);
  const permissions = useAsync(() => adminApi.permissions(), []);
  const [editing, setEditing] = useState<Role | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    (permissions.data ?? []).forEach(permission => {
      const list = map.get(permission.group) ?? [];
      list.push(permission);
      map.set(permission.group, list);
    });
    return Array.from(map.entries());
  }, [permissions.data]);

  const openEdit = (role: Role) => {
    setEditing(role);
    setSelected(role.permissions);
  };

  const toggle = (key: string) => {
    setSelected(prev => (prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.updateRole(editing.name, selected);
      toast('Role permissions updated.', 'success');
      setEditing(null);
      roles.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update this role.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <AlertBox
        tone="info"
        title="Permission boundary"
        message="Customer permissions are fixed at their safe defaults. Staff and manager roles can only delegate permissions that the signed-in administrator already holds."
      />
      {roles.loading && !roles.data ? (
        <Spinner label="Loading roles…" />
      ) : roles.error ? (
        <ErrorState message={roles.error} onRetry={() => roles.reload()} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {roles.data?.map(role => {
            const locked = role.name === 'Customer';
            return (
              <Card key={role.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.row}>
                  <View style={{ flex: 1, minWidth: 200, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                      <AppText variant="title">{role.name}</AppText>
                      {role.isSystem ? <Badge label="System role" /> : null}
                      {locked ? <Badge label="Locked" tone={{ bg: colors.warningSoft, fg: colors.warning }} /> : null}
                    </View>
                    <AppText variant="tiny" color={colors.muted}>{role.description}</AppText>
                    <AppText variant="tiny" color={colors.faint}>{role.permissions.length} permissions granted</AppText>
                  </View>
                  <Button label={locked ? 'View permissions' : 'Edit permissions'} size="sm" variant="outline" onPress={() => openEdit(role)} />
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <ModalSheet
        visible={!!editing}
        title={`${editing?.name ?? ''} permissions`}
        subtitle={editing?.name === 'Customer' ? 'Read-only: customer permissions stay at their defaults.' : 'Toggle the capabilities this role should have.'}
        onClose={() => setEditing(null)}
        width={720}
        footer={
          <>
            <Button label="Close" variant="ghost" onPress={() => setEditing(null)} />
            {editing?.name !== 'Customer' ? <Button label="Save permissions" onPress={save} loading={saving} /> : null}
          </>
        }
      >
        {editing?.name === 'Customer' ? (
          <AlertBox
            tone="warning"
            message="Customer permissions are intentionally not editable from this screen. This protects the storefront accounts from accidental privilege changes."
          />
        ) : null}
        {grouped.map(([group, items]) => (
          <View key={group} style={{ gap: spacing.sm }}>
            <AppText variant="h3">{group}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {items.map(permission => {
                const active = selected.includes(permission.key);
                const disabled = editing?.name === 'Customer';
                return (
                  <Pressable
                    key={permission.key}
                    disabled={disabled}
                    onPress={() => toggle(permission.key)}
                    style={({ pressed }) => [
                      styles.permissionChip,
                      active && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                      disabled && { opacity: 0.7 },
                      pressed && !disabled && { opacity: 0.75 },
                    ]}
                  >
                    <AppText variant="small" weight={active ? '700' : '400'} color={active ? colors.primaryDark : colors.inkSoft}>
                      {active ? '✓ ' : ''}
                      {permission.name}
                    </AppText>
                    <AppText variant="tiny" color={colors.faint}>{permission.key}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ModalSheet>
    </View>
  );
}

function AuditPanel() {
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [page, setPage] = useState(1);
  const logs = useAsync(() => adminApi.auditLogs({ page, pageSize: 20, search: submitted || undefined }), [page, submitted]);

  return (
    <View style={{ gap: spacing.md }}>
      <Toolbar>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmitted(search.trim());
            setPage(1);
          }}
          placeholder="Search action, entity or user…"
          style={{ maxWidth: 420 }}
        />
      </Toolbar>
      {logs.loading && !logs.data ? (
        <Spinner label="Loading audit logs…" />
      ) : logs.error ? (
        <ErrorState message={logs.error} onRetry={() => logs.reload()} />
      ) : (logs.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No audit entries" message="Administrative actions are recorded here automatically." />
      ) : (
        <>
          <Card padded={false}>
            {logs.data?.items.map((log, index) => (
              <View key={log.id}>
                <View style={styles.logRow}>
                  <View style={{ flex: 1, minWidth: 220, gap: 2 }}>
                    <AppText variant="title">{log.action}</AppText>
                    <AppText variant="tiny" color={colors.muted}>
                      {log.entity}
                      {log.entityId ? ` · ${log.entityId}` : ''}
                      {log.userEmail ? ` · ${log.userEmail}` : ''}
                    </AppText>
                  </View>
                  <AppText variant="tiny" color={colors.faint}>{log.ipAddress ?? '—'}</AppText>
                  <AppText variant="tiny" color={colors.faint}>{dateTime(log.createdAt)}</AppText>
                </View>
                {index < (logs.data?.items.length ?? 0) - 1 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
              </View>
            ))}
          </Card>
          {logs.data ? (
            <Pagination
              page={logs.data.pagination.page}
              totalPages={logs.data.pagination.totalPages}
              totalItems={logs.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, flexWrap: 'wrap' },
  permissionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    gap: 1,
    minWidth: 180,
  },
});
