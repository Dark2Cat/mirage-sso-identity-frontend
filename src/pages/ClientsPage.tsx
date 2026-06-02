import {
  Copy,
  KeyRound,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BackendClient,
  BackendRole,
  BackendUser,
  ClientStatus,
  ClientType,
  assignAppAccess,
  createClient,
  deleteClientById,
  fetchClients,
  fetchRoles,
  fetchUsers,
  resetClientSecret,
  updateClient,
  updateClientStatus,
} from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';

interface ClientRow {
  id: string;
  name: string;
  code: string;
  type: ClientType;
  clientId: string;
  clientSecret: string;
  redirectUris: string;
  logoutUris: string;
  grantTypes: string;
  scopes: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  requireConsent: boolean;
  status: ClientStatus;
}

const emptyClient: ClientRow = {
  id: '',
  name: '',
  code: '',
  type: 'SPA',
  clientId: '',
  clientSecret: '',
  redirectUris: '',
  logoutUris: '',
  grantTypes: 'authorization_code, refresh_token',
  scopes: 'openid, profile',
  accessTokenTtl: 900,
  refreshTokenTtl: 604800,
  requireConsent: true,
  status: 'ENABLED',
};

export function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [keyword, setKeyword] = useState('');
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [secretResult, setSecretResult] = useState('');
  const [accessTarget, setAccessTarget] = useState('');
  const [accessApps, setAccessApps] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    description: string;
    run: () => Promise<void>;
    title: string;
  } | null>(null);

  useEffect(() => {
    void loadClients();
    void loadAssignmentOptions();
  }, []);

  async function loadClients() {
    try {
      const items = await fetchClients();
      const nextRows = items.map(mapClientRow);
      setRows(nextRows);
      setAccessApps((current) => current.length ? current : nextRows.filter((row) => row.status === 'ENABLED').map((row) => row.code));
    } catch {
      setMessage('客户端列表加载失败，请确认后端服务是否可用。');
    }
  }

  async function loadAssignmentOptions() {
    try {
      const [roleItems, userPage] = await Promise.all([fetchRoles(), fetchUsers({ page: 1, size: 200 })]);
      setRoles(roleItems);
      setUsers(userPage.items);
      setAccessTarget((current) => current || (roleItems[0]?.code ? `role:${roleItems[0].code}` : userPage.items[0]?.id ? `user:${userPage.items[0].id}` : ''));
    } catch {
      setMessage('应用分配对象加载失败。');
    }
  }

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return rows;
    }
    return rows.filter((row) =>
      [row.name, row.code, row.clientId, row.type, row.scopes, row.status]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [keyword, rows]);

  function openCreateModal() {
    setSecretResult('');
    setEditingClient({ ...emptyClient });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingClient) {
      return;
    }
    setMessage('');
    try {
      const payload = {
        clientId: editingClient.clientId,
        clientSecret: editingClient.clientSecret === '******' ? undefined : editingClient.clientSecret,
        clientName: editingClient.name,
        clientType: editingClient.type,
        redirectUris: editingClient.redirectUris,
        postLogoutRedirectUris: editingClient.logoutUris,
        grantTypes: editingClient.grantTypes,
        scopes: editingClient.scopes,
        accessTokenTtl: editingClient.accessTokenTtl,
        refreshTokenTtl: editingClient.refreshTokenTtl,
        requireConsent: editingClient.requireConsent,
        status: editingClient.status,
      };
      if (editingClient.id) {
        await updateClient(editingClient.id, payload);
      } else {
        await createClient(payload);
      }
      setEditingClient(null);
      await loadClients();
      setMessage('客户端配置已保存。');
    } catch {
      setMessage('客户端保存失败，请检查 Client ID 是否重复或必填字段是否完整。');
    }
  }

  function resetSecret(client: ClientRow) {
    setConfirmAction({
      title: '确认重置应用密钥',
      description: `将为 ${client.name} 生成新的 Client Secret，旧密钥会立即失效。`,
      run: async () => {
        const result = await resetClientSecret(client.id);
        setSecretResult(result.secret);
        await loadClients();
      },
    });
  }

  function toggleStatus(client: ClientRow) {
    const nextStatus: ClientStatus = client.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    setConfirmAction({
      title: client.status === 'ENABLED' ? '确认禁用应用' : '确认启用应用',
      description: `${client.status === 'ENABLED' ? '禁用' : '启用'} ${client.name} 会影响该应用的登录接入能力。`,
      run: async () => {
        await updateClientStatus(client.id, nextStatus);
        await loadClients();
        setMessage(`${client.name} 状态已更新为 ${nextStatus}。`);
      },
    });
  }

  function deleteClient(client: ClientRow) {
    setConfirmAction({
      title: '确认删除应用',
      description: `删除 ${client.name} 后，该客户端配置将从列表中移除。`,
      run: async () => {
        await deleteClientById(client.id);
        await loadClients();
        setMessage('客户端已删除。');
      },
    });
  }

  function toggleAccess(appCode: string) {
    setAccessApps((current) =>
      current.includes(appCode)
        ? current.filter((code) => code !== appCode)
        : [...current, appCode],
    );
  }

  async function saveAccessAssignment() {
    const [targetType, targetValue] = accessTarget.split(':');
    try {
      await assignAppAccess({
        roleCode: targetType === 'role' ? targetValue : undefined,
        userId: targetType === 'user' ? Number(targetValue) : undefined,
        appCodes: accessApps,
      });
      setMessage('应用访问分配已保存。');
    } catch {
      setMessage('应用访问分配保存失败，请稍后重试。');
    }
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="OAuth Clients"
        title="应用接入管理"
        description="维护客户端注册、回调白名单、授权模式、Scope、Token 策略、密钥和应用访问分配。"
        actions={
          <button className="primary-button" onClick={openCreateModal} type="button">
            <Plus size={17} />
            注册客户端
          </button>
        }
      />

      <section className="toolbar-row">
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索客户端"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索应用名称、编码、Client ID、Scope"
            value={keyword}
          />
        </div>
      </section>

      {message ? (
        <section className="security-warning success">
          <ShieldCheck size={18} />
          <span>{message}</span>
        </section>
      ) : null}

      {secretResult ? (
        <section className="security-warning success">
          <KeyRound size={18} />
          <span>新密钥：{secretResult}</span>
        </section>
      ) : null}

      <DataTable
        rows={filteredRows}
        columns={[
          { key: 'name', title: '应用名称' },
          { key: 'code', title: '应用编码' },
          { key: 'type', title: '类型' },
          {
            key: 'clientId',
            title: 'Client ID',
            render: (row) => (
              <span className="mono-cell">
                {row.clientId}
                <Copy size={14} />
              </span>
            ),
          },
          { key: 'scopes', title: 'Scopes' },
          {
            key: 'status',
            title: '状态',
            render: (row) => <span className={`table-status ${row.status}`}>{row.status}</span>,
          },
          {
            key: 'actions',
            title: '操作',
            render: (row) => (
              <div className="table-actions">
                <button className="text-button" onClick={() => setEditingClient(row)} type="button">编辑</button>
                <button className="icon-button" onClick={() => resetSecret(row)} title="重置密钥" type="button">
                  <RotateCcw size={16} />
                </button>
                <button className="text-button" onClick={() => toggleStatus(row)} type="button">
                  {row.status === 'ENABLED' ? '禁用' : '启用'}
                </button>
                <button className="icon-button danger" onClick={() => deleteClient(row)} title="删除" type="button">
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <section className="ops-panel">
        <div className="panel-title split-title">
          <div>
            <ShieldCheck size={20} />
            <h2>可访问应用分配</h2>
          </div>
          <button className="primary-button" onClick={saveAccessAssignment} type="button">
            <Save size={16} />
            保存分配
          </button>
        </div>
        <div className="assignment-row">
          <label className="field-line compact">
            <span>分配对象</span>
            <select value={accessTarget} onChange={(event) => setAccessTarget(event.target.value)}>
              {roles.map((role) => (
                <option key={`role-${role.code}`} value={`role:${role.code}`}>角色: {role.name} / {role.code}</option>
              ))}
              {users.map((user) => (
                <option key={`user-${user.id}`} value={`user:${user.id}`}>用户: {user.nickname || user.username}</option>
              ))}
            </select>
          </label>
          <div className="assignment-apps">
            {rows.map((client) => (
              <label key={client.code}>
                <input
                  checked={accessApps.includes(client.code)}
                  onChange={() => toggleAccess(client.code)}
                  type="checkbox"
                />
                <span>{client.name}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {editingClient ? (
        <div className="modal-backdrop" role="presentation">
          <form aria-modal="true" className="form-modal wide" onSubmit={saveClient} role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Client Registry</span>
                <h2>{editingClient.id ? '编辑客户端' : '注册客户端'}</h2>
              </div>
              <button className="icon-button" onClick={() => setEditingClient(null)} type="button">×</button>
            </div>
            <div className="form-grid">
              <FormInput label="应用名称" value={editingClient.name} onChange={(value) => setEditingClient({ ...editingClient, name: value })} />
              <FormInput label="应用编码" value={editingClient.code} onChange={(value) => setEditingClient({ ...editingClient, code: value })} />
              <FormInput label="Client ID" value={editingClient.clientId} onChange={(value) => setEditingClient({ ...editingClient, clientId: value, code: editingClient.code || clientCode(value) })} />
              <label className="field-line">
                <span>应用类型</span>
                <select value={editingClient.type} onChange={(event) => setEditingClient({ ...editingClient, type: event.target.value as ClientType })}>
                  <option value="SPA">SPA</option>
                  <option value="WEB">服务端 Web</option>
                  <option value="SERVICE">后端服务</option>
                  <option value="MOBILE">移动端</option>
                </select>
              </label>
              <FormInput label="Client Secret" value={editingClient.clientSecret} onChange={(value) => setEditingClient({ ...editingClient, clientSecret: value })} placeholder="公共客户端可留空" />
              <label className="field-line">
                <span>启用状态</span>
                <select value={editingClient.status} onChange={(event) => setEditingClient({ ...editingClient, status: event.target.value as ClientStatus })}>
                  <option value="ENABLED">ENABLED</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </label>
              <FormInput label="回调地址白名单" value={editingClient.redirectUris} onChange={(value) => setEditingClient({ ...editingClient, redirectUris: value })} />
              <FormInput label="退出回调地址" value={editingClient.logoutUris} onChange={(value) => setEditingClient({ ...editingClient, logoutUris: value })} />
              <FormInput label="授权模式" value={editingClient.grantTypes} onChange={(value) => setEditingClient({ ...editingClient, grantTypes: value })} />
              <FormInput label="Scope 列表" value={editingClient.scopes} onChange={(value) => setEditingClient({ ...editingClient, scopes: value })} />
              <FormInput label="Access Token TTL 秒" type="number" value={String(editingClient.accessTokenTtl)} onChange={(value) => setEditingClient({ ...editingClient, accessTokenTtl: Number(value) })} />
              <FormInput label="Refresh Token TTL 秒" type="number" value={String(editingClient.refreshTokenTtl)} onChange={(value) => setEditingClient({ ...editingClient, refreshTokenTtl: Number(value) })} />
              <label className="field-line">
                <span>授权确认</span>
                <select value={editingClient.requireConsent ? 'true' : 'false'} onChange={(event) => setEditingClient({ ...editingClient, requireConsent: event.target.value === 'true' })}>
                  <option value="true">需要授权确认</option>
                  <option value="false">无需授权确认</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditingClient(null)} type="button">取消</button>
              <button className="primary-button" type="submit">
                <Save size={16} />
                保存
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmAction ? (
        <ConfirmDialog
          description={confirmAction.description}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            confirmAction.run()
              .catch(() => setMessage('操作失败，请稍后重试。'))
              .finally(() => setConfirmAction(null));
          }}
          title={confirmAction.title}
        />
      ) : null}
    </section>
  );
}

interface FormInputProps {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}

function FormInput({ label, onChange, placeholder, type = 'text', value }: FormInputProps) {
  return (
    <label className="field-line">
      <span>{label}</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={!placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function mapClientRow(client: BackendClient): ClientRow {
  return {
    id: String(client.id),
    name: client.clientName,
    code: clientCode(client.clientId),
    type: client.clientType,
    clientId: client.clientId,
    clientSecret: client.clientType === 'SPA' ? '' : '******',
    redirectUris: client.redirectUris,
    logoutUris: client.postLogoutRedirectUris ?? '',
    grantTypes: client.grantTypes,
    scopes: client.scopes,
    accessTokenTtl: client.accessTokenTtl,
    refreshTokenTtl: client.refreshTokenTtl,
    requireConsent: client.requireConsent,
    status: client.status,
  };
}

function clientCode(clientId: string) {
  return clientId.replace(/^mirage-/, '');
}
