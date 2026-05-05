'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PrettySelect, PrettySelectOption } from '@/components/ui/PrettySelect';
import { SkeletonLine } from '@/components/ui/SkeletonLine';
import { useToast } from '@/components/ui/ToastProvider';
import { apiRequest } from '@/lib/api';
import {
  clearAuthTokens,
  getAuthContext,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
} from '@/lib/auth';
import {
  AdminRoleItem,
  AdminStats,
  AdminUserItem,
  AuditLogItem,
  PermissionItem,
} from '@/lib/types';
import { API_URL } from '@/lib/api';

const PIE_COLORS = ['#38bdf8', '#6366f1', '#22c55e', '#f59e0b'];
type TabKey = 'analytics' | 'roles' | 'users' | 'audit';

export default function AdminPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('analytics');
  const [authPermissions, setAuthPermissions] = useState<string[]>([]);
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>(
    [],
  );
  const [userSearch, setUserSearch] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [roleDraftByUser, setRoleDraftByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }

    const auth = getAuthContext();
    if (auth.role !== 'ADMIN' && auth.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
      return;
    }
    setAuthRole(auth.role);
    setAuthPermissions(auth.permissions);

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [statsData, permissionsData, rolesData, usersData, logsData] =
          await Promise.all([
            apiRequest<AdminStats>('/admin/stats', { auth: true }),
            apiRequest<PermissionItem[]>('/admin/permissions', { auth: true }),
            apiRequest<AdminRoleItem[]>('/admin/roles', { auth: true }),
            apiRequest<AdminUserItem[]>('/admin/users', { auth: true }),
            apiRequest<AuditLogItem[]>('/admin/audit-logs?limit=50', {
              auth: true,
            }),
          ]);

        setStats(statsData);
        setPermissions(permissionsData);
        setRoles(rolesData);
        setUsers(usersData);
        setAuditLogs(logsData);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };

    void loadInitialData();
  }, [router, showError]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    const token = getAccessToken();
    if (!token) return;

    const stream = new EventSource(
      `${API_URL}/admin/stats/stream?access_token=${encodeURIComponent(token)}`,
    );

    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as AdminStats;
        setStats(payload);
      } catch {
        // ignore malformed chunks
      }
    };

    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.close();
    };
  }, [activeTab]);

  const logout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      } catch {
        // local cleanup is enough for client logout
      }
    }
    clearAuthTokens();
    router.push('/auth/login');
  };

  const activityMax = useMemo(() => {
    if (!stats?.activity.dailyMessages.length) return 1;
    return Math.max(...stats.activity.dailyMessages.map((item) => item.messages), 1);
  }, [stats]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const search = userSearch.trim().toLowerCase();
    return users.filter((user) => user.email.toLowerCase().includes(search));
  }, [userSearch, users]);

  const hasPermission = (permission: string) =>
    authRole === 'SUPERADMIN' || authPermissions.includes(permission);

  const roleOptions = useMemo<PrettySelectOption[]>(
    () => [
      { value: '', label: 'Assign role...' },
      ...roles.map((role) => ({ value: role.id, label: role.name })),
    ],
    [roles],
  );

  const refreshRolesAndUsers = async () => {
    const [rolesData, usersData] = await Promise.all([
      apiRequest<AdminRoleItem[]>('/admin/roles', { auth: true }),
      apiRequest<AdminUserItem[]>('/admin/users', { auth: true }),
    ]);
    setRoles(rolesData);
    setUsers(usersData);
  };

  const createRole = async () => {
    if (!newRoleName.trim()) {
      showError('Role name is required');
      return;
    }
    if (!selectedPermissionKeys.length) {
      showError('Select at least one permission');
      return;
    }

    try {
      await apiRequest('/admin/roles', {
        method: 'POST',
        auth: true,
        body: {
          name: newRoleName.trim().toUpperCase(),
          description: newRoleDescription.trim(),
          permissionKeys: selectedPermissionKeys,
        },
      });
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissionKeys([]);
      await refreshRolesAndUsers();
      showSuccess('Role created');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create role');
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      await apiRequest(`/admin/roles/${roleId}`, {
        method: 'DELETE',
        auth: true,
      });
      await refreshRolesAndUsers();
      showSuccess('Role deleted');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    if (!roleId) return;
    try {
      await apiRequest(`/admin/users/${userId}/roles`, {
        method: 'POST',
        auth: true,
        body: { roleId },
      });
      await refreshRolesAndUsers();
      showSuccess('Role assigned');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to assign role');
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    try {
      await apiRequest(`/admin/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        auth: true,
      });
      await refreshRolesAndUsers();
      showSuccess('Role removed');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to remove role');
    }
  };

  const togglePermissionSelection = (key: string) => {
    setSelectedPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  return (
    <main className="min-h-screen text-main p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1320px] space-y-4">
        <GlassPanel strong className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Admin command center</h1>
              <p className="text-sm text-muted">Live analytics, trends, and platform activity overview.</p>
            </div>
            <div className="hidden sm:flex gap-2">
              <AnimatedButton
                type="button"
                onClick={() => router.push('/dashboard')}
                className="h-10 rounded-xl border border-white/30 bg-white/5 px-4 text-sm"
              >
                Dashboard
              </AnimatedButton>
              <AnimatedButton
                type="button"
                onClick={() => void logout()}
                className="h-10 rounded-xl border border-white/30 bg-white/5 px-4 text-sm"
              >
                Logout
              </AnimatedButton>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 flex gap-2 overflow-x-auto pb-1">
              <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
                Analytics
              </TabButton>
              <TabButton active={activeTab === 'roles'} onClick={() => setActiveTab('roles')}>
                Roles
              </TabButton>
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                Users
              </TabButton>
              <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>
                Audit
              </TabButton>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="sm:hidden shrink-0 rounded-lg border border-white/25 px-3 py-2 text-xs"
            >
              ⋯
            </button>
          </div>
          {portalMounted &&
            mobileMenuOpen &&
            createPortal(
              <div
                className="fixed inset-0 z-[999] sm:hidden bg-black/45 backdrop-blur-[1px]"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden
              >
                <div
                  className="absolute left-3 right-3 top-16 rounded-2xl border border-white/15 bg-black p-3 text-slate-100 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <AnimatedButton
                      type="button"
                      onClick={() => {
                        router.push('/dashboard');
                        setMobileMenuOpen(false);
                      }}
                      className="h-11 flex-1 justify-center rounded-xl border border-white/30 bg-white/5 px-3 text-xs text-slate-100"
                    >
                      Dashboard
                    </AnimatedButton>
                    <AnimatedButton
                      type="button"
                      onClick={() => {
                        void logout();
                        setMobileMenuOpen(false);
                      }}
                      className="h-11 flex-1 justify-center rounded-xl border border-white/30 bg-white/5 px-3 text-xs text-slate-100"
                    >
                      Logout
                    </AnimatedButton>
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </GlassPanel>

        {loading && (
          <GlassPanel strong className="p-5 space-y-3">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-2/3" />
            <SkeletonLine className="w-1/2" />
          </GlassPanel>
        )}

        {!loading && stats && activeTab === 'analytics' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard
                label="Total users"
                value={stats.kpis.totalUsers}
                hue="from-cyan-400/30 to-blue-500/10"
                tooltip="All registered accounts in the system."
              />
              <KpiCard
                label="Admins"
                value={stats.kpis.totalAdmins}
                hue="from-violet-400/30 to-fuchsia-500/10"
                tooltip="Users with elevated admin access."
              />
              <KpiCard
                label="Chats"
                value={stats.kpis.totalChats}
                hue="from-emerald-400/30 to-lime-500/10"
                tooltip="Total number of created chat threads."
              />
              <KpiCard
                label="Messages"
                value={stats.kpis.totalMessages}
                hue="from-amber-300/30 to-orange-500/10"
                tooltip="All user + assistant messages stored."
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
              <GlassPanel strong className="p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Messages trend (7 days)</h2>
                  <span className="text-xs text-muted">Updated: {new Date(stats.generatedAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 h-56 items-end pb-5">
                  {stats.activity.dailyMessages.map((point, index) => {
                    const height = Math.max(8, (point.messages / activityMax) * 100);
                    const shortDate = point.date.slice(5).replace('-', '.');
                    return (
                      <HoverTooltip
                        key={point.date}
                        content={`${point.date}: ${point.messages} messages`}
                        className="w-full h-full flex items-end"
                      >
                        <motion.div
                          initial={{ height: 0, opacity: 0.3 }}
                          animate={{ height: `${height}%`, opacity: 1 }}
                          transition={{ delay: index * 0.06, duration: 0.45 }}
                          className="relative w-full rounded-xl bg-gradient-to-t from-sky-500/75 to-indigo-400/80"
                        >
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] leading-none text-muted whitespace-nowrap">
                            {shortDate}
                          </span>
                        </motion.div>
                      </HoverTooltip>
                    );
                  })}
                </div>
              </GlassPanel>

              <GlassPanel strong className="p-4 sm:p-5">
                <h2 className="text-lg font-semibold mb-4">Role distribution</h2>
                <DonutChart items={stats.distributions.roles} />
                <div className="mt-4 space-y-2">
                  {stats.distributions.roles.map((item, index) => (
                    <HoverTooltip
                      key={item.name}
                      content={`${item.name}: ${item.value} users`}
                      className="block"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                          {item.name}
                        </span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    </HoverTooltip>
                  ))}
                </div>
              </GlassPanel>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <GlassPanel strong className="p-4 sm:p-5 xl:col-span-2">
                <h2 className="text-lg font-semibold mb-3">Top chats by message volume</h2>
                <div className="space-y-2">
                  {stats.rankings.topChats.map((chat, index) => (
                    <HoverTooltip
                      key={chat.id}
                      content={`Chat "${chat.title}" has ${chat.messages} messages`}
                      className="block"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.25 }}
                        className="rounded-xl glass-panel px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <span className="truncate text-sm">{chat.title}</span>
                        <span className="text-xs text-muted">{chat.messages} msgs</span>
                      </motion.div>
                    </HoverTooltip>
                  ))}
                </div>
              </GlassPanel>

              <GlassPanel strong className="p-4 sm:p-5">
                <h2 className="text-lg font-semibold mb-3">System pulse</h2>
                <div className="space-y-3">
                  <HoverTooltip content="Synthetic health score from activity and load balance." className="block">
                    <div>
                      <RadialMeter value={stats.systemHealth} />
                    </div>
                  </HoverTooltip>
                  <div className="space-y-1 text-xs text-muted">
                    <HoverTooltip
                      content="User messages versus assistant messages ratio."
                      className="block"
                    >
                      <p>Message balance: {stats.distributions.messageRoles[0]?.value ?? 0} user / {stats.distributions.messageRoles[1]?.value ?? 0} ai</p>
                    </HoverTooltip>
                    <HoverTooltip content="Most active chat creator in current dataset." className="block">
                      <p>Top creator: {stats.rankings.topUsers[0]?.email ?? 'n/a'}</p>
                    </HoverTooltip>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </>
        )}

        {!loading && activeTab === 'roles' && (
          <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
            <GlassPanel strong className="p-4 sm:p-5">
              <h2 className="text-lg font-semibold mb-3">Create role</h2>
              {!hasPermission('roles.create') && (
                <p className="text-sm text-muted mb-3">
                  You do not have permission to create roles.
                </p>
              )}
              <div className="space-y-3">
                <input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Role name (e.g. ANALYST)"
                  disabled={!hasPermission('roles.create')}
                  className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none disabled:opacity-60"
                />
                <input
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Description"
                  disabled={!hasPermission('roles.create')}
                  className="h-11 w-full rounded-xl glass-panel px-3 text-sm outline-none disabled:opacity-60"
                />
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {permissions.map((permission) => {
                    const checked = selectedPermissionKeys.includes(permission.key);
                    return (
                      <label
                        key={permission.id}
                        className="flex items-start gap-2 rounded-lg glass-panel px-3 py-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!hasPermission('roles.create')}
                          onChange={() => togglePermissionSelection(permission.key)}
                          className="mt-1"
                        />
                        <span className="text-xs">
                          <span className="font-medium">{permission.key}</span>
                          {permission.description ? (
                            <span className="block text-muted">{permission.description}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <AnimatedButton
                  type="button"
                  onClick={createRole}
                  disabled={!hasPermission('roles.create')}
                  className="h-10 rounded-xl bg-cyan-500/20 border border-cyan-300/35 px-4 text-sm disabled:opacity-50"
                >
                  Create role
                </AnimatedButton>
              </div>
            </GlassPanel>

            <GlassPanel strong className="p-4 sm:p-5">
              <h2 className="text-lg font-semibold mb-3">Role catalog</h2>
              <div className="space-y-3">
                {roles.map((role, index) => (
                  <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="rounded-xl glass-panel p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2">
                        <p className="text-sm font-semibold">{role.name}</p>
                        <p className="text-xs text-muted">{role.description || 'No description'}</p>
                      </span>
                      <div className="flex items-center gap-2">
                        {role.isSystem && (
                          <span className="text-[10px] rounded-full border border-white/25 px-2 py-0.5 text-muted">
                            system
                          </span>
                        )}
                        {role.isImmutable && (
                          <span className="text-[10px] rounded-full border border-amber-300/35 px-2 py-0.5 text-amber-300">
                            immutable
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteRole(role.id)}
                          disabled={!hasPermission('roles.delete') || role.isSystem || role.isImmutable}
                          className="rounded-lg border border-red-300/35 px-2 py-1 text-xs text-red-300 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((relation) => (
                        <span
                          key={`${role.id}-${relation.permission.id}`}
                          className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-muted"
                        >
                          {relation.permission.key}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted">
                      Assigned users: {role.users.length}
                    </p>
                  </motion.div>
                ))}
              </div>
            </GlassPanel>
          </div>
        )}

        {!loading && activeTab === 'users' && (
          <GlassPanel strong className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg font-semibold">Users and access matrix</h2>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email"
                className="h-10 w-full sm:w-80 rounded-xl glass-panel px-3 text-sm outline-none"
              />
            </div>
            <div className="space-y-2">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="rounded-xl glass-panel p-3 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{user.email}</p>
                      <p className="text-xs text-muted">
                        Legacy role: {user.role} · verified: {user.emailVerified ? 'yes' : 'no'}
                      </p>
                    </div>
                    <PrettySelect
                      value={roleDraftByUser[user.id] ?? ''}
                      options={roleOptions}
                      disabled={!hasPermission('users.roles.assign')}
                      onChange={(nextRoleId) => {
                        setRoleDraftByUser((prev) => ({ ...prev, [user.id]: nextRoleId }));
                        if (!nextRoleId) return;
                        void assignRole(user.id, nextRoleId);
                        setRoleDraftByUser((prev) => ({ ...prev, [user.id]: '' }));
                      }}
                      className="min-h-0 h-9 min-w-[170px] rounded-lg px-2 text-xs disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {user.assignedRoles.map((relation) => (
                      <span
                        key={`${user.id}-${relation.role.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-white/25 px-2 py-0.5 text-[10px]"
                      >
                        {relation.role.name}
                        <button
                          type="button"
                          onClick={() => void removeRole(user.id, relation.role.id)}
                          disabled={!hasPermission('users.roles.remove')}
                          className="text-red-300 disabled:opacity-50"
                        >
                          x
                        </button>
                      </span>
                    ))}
                    {user.assignedRoles.length === 0 && (
                      <span className="text-[10px] text-muted">No assigned RBAC roles</span>
                    )}
                  </div>
                </motion.div>
              ))}
              {!filteredUsers.length && (
                <p className="text-sm text-muted">No users found.</p>
              )}
            </div>
          </GlassPanel>
        )}

        {!loading && activeTab === 'audit' && (
          <GlassPanel strong className="p-5">
            <h2 className="text-lg font-semibold">Audit feed</h2>
            <div className="mt-3 space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl glass-panel px-3 py-2 text-xs"
                >
                  <p className="text-main">
                    <span className="font-semibold">{log.action}</span> on{' '}
                    <span className="text-cyan-300">
                      {log.resourceType}
                      {log.resourceId ? `:${log.resourceId}` : ''}
                    </span>
                  </p>
                  <p className="text-muted">
                    by {log.actor?.email ?? 'system'} ·{' '}
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {!auditLogs.length && (
                <p className="text-sm text-muted">No audit events yet.</p>
              )}
            </div>
          </GlassPanel>
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-xl border px-4 py-2 text-sm transition ${
        active
          ? 'border-cyan-300/40 bg-cyan-500/20'
          : 'border-white/25 bg-white/5 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  hue,
  tooltip,
}: {
  label: string;
  value: number;
  hue: string;
  tooltip: string;
}) {
  return (
    <HoverTooltip content={tooltip} className="block">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className={`rounded-2xl border border-white/15 bg-gradient-to-br ${hue} p-4 shadow-[0_14px_35px_rgba(0,0,0,0.24)]`}
      >
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-2 text-3xl font-semibold">{value.toLocaleString()}</p>
      </motion.div>
    </HoverTooltip>
  );
}

function DonutChart({ items }: { items: Array<{ name: string; value: number }> }) {
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);
  let cumulative = 0;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;

  return (
    <HoverTooltip content="Share of users per role category." className="block">
      <div className="relative mx-auto h-40 w-40">
        <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="16" />
          {items.map((item, index) => {
            const length = (item.value / total) * circumference;
            const segment = (
              <motion.circle
                key={item.name}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={PIE_COLORS[index % PIE_COLORS.length]}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-cumulative}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${length} ${circumference - length}` }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                strokeLinecap="round"
              />
            );
            cumulative += length;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <p className="text-xs text-muted">Total</p>
          <p className="text-xl font-semibold">{items.reduce((sum, item) => sum + item.value, 0)}</p>
        </div>
      </div>
    </HoverTooltip>
  );
}

function RadialMeter({ value }: { value: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, value));
  const length = (progress / 100) * circumference;

  return (
    <div className="mx-auto h-32 w-32 relative">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="10" />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${length} ${circumference - length}` }}
          transition={{ duration: 0.8 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <p className="text-2xl font-semibold">{progress}%</p>
      </div>
    </div>
  );
}

function HoverTooltip({
  content,
  children,
  className = '',
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative ${className}`}>
      {children}
      <div className="pointer-events-none absolute left-1/2 top-0 z-20 w-max max-w-[260px] -translate-x-1/2 -translate-y-[110%] rounded-lg border border-white/20 bg-black/90 px-2 py-1 text-[11px] text-white opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100">
        {content}
      </div>
    </div>
  );
}
