import { KeyRound, Plus, Save, Search } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BackendOrganization,
  BackendRole,
  BackendUser,
  BackendUserStatus,
  createUser,
  fetchOrganizations,
  fetchRoles,
  fetchUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';

interface UserRow {
  id: string;
  username: string;
  password: string;
  nickname: string;
  email: string;
  phone: string;
  avatarUrl: string;
  avatar: string;
  roles: string[];
  role: string;
  organizationId: string;
  department: string;
  status: BackendUserStatus;
  createdAt: string;
  lastLogin: string;
}

const emptyUser: UserRow = {
  id: '',
  username: '',
  password: '',
  nickname: '',
  email: '',
  phone: '',
  avatarUrl: '',
  avatar: '',
  roles: ['USER'],
  role: 'USER',
  organizationId: '',
  department: '',
  status: 'ACTIVE',
  createdAt: '-',
  lastLogin: '-',
};

export function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [organizations, setOrganizations] = useState<BackendOrganization[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<BackendUserStatus | '全部'>('全部');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [resetResult, setResetResult] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    description: string;
    run: () => Promise<void>;
    title: string;
  } | null>(null);
  const pageSize = 5;

  useEffect(() => {
    void loadUsers();
    void loadOptions();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setMessage('');
    try {
      const pageData = await fetchUsers({ page: 1, size: 200 });
      setRows(pageData.items.map(mapUserRow));
    } catch {
      setMessage('用户列表加载失败，请确认后端服务是否可用。');
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      const [roleItems, orgItems] = await Promise.all([fetchRoles(), fetchOrganizations()]);
      setRoles(roleItems);
      setOrganizations(orgItems);
    } catch {
      setMessage('角色或组织选项加载失败，创建和编辑用户可能受影响。');
    }
  }

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const statusMatched = statusFilter === '全部' || row.status === statusFilter;
      const keywordMatched = !normalizedKeyword
        || [row.username, row.nickname, row.email, row.phone, row.role, row.department]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword);
      return statusMatched && keywordMatched;
    });
  }, [keyword, rows, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  function openCreateModal() {
    setResetResult('');
    setEditingUser({ ...emptyUser, roles: roles[0]?.code ? [roles[0].code] : ['USER'] });
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) {
      return;
    }
    const payload = toUserPayload(editingUser);
    setMessage('');
    try {
      if (editingUser.id) {
        await updateUser(editingUser.id, payload);
      } else {
        await createUser({
          ...payload,
          password: editingUser.password || 'Mirage@123456',
        });
      }
      setEditingUser(null);
      await loadUsers();
      setMessage('用户资料已保存。');
    } catch {
      setMessage('用户保存失败，请检查用户名是否重复或必填字段是否完整。');
    }
  }

  function toggleStatus(user: UserRow) {
    const nextStatus: BackendUserStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setConfirmAction({
      title: user.status === 'ACTIVE' ? '确认禁用用户' : '确认启用用户',
      description: `${user.status === 'ACTIVE' ? '禁用' : '启用'} ${user.username} 会影响该用户登录和访问应用。`,
      run: async () => {
        await updateUserStatus(user.id, nextStatus);
        await loadUsers();
        setMessage(`${user.username} 状态已更新为 ${nextStatus}。`);
      },
    });
  }

  function resetPassword(user: UserRow) {
    setConfirmAction({
      title: '确认重置密码',
      description: `将为 ${user.username} 生成新密码，用户需要使用新密码重新登录。`,
      run: async () => {
        const result = await resetUserPassword(user.id);
        setResetResult(`${user.username} 新密码：${result.password}`);
      },
    });
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Users"
        title="用户管理"
        description="管理用户资料、账号状态、角色绑定、所属部门和密码重置。组织结构维护已拆分到独立菜单。"
        actions={
          <button className="primary-button" onClick={openCreateModal} type="button">
            <Plus size={17} />
            新建用户
          </button>
        }
      />

      <section className="toolbar-row">
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索用户"
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder="搜索用户名、昵称、邮箱、手机号、角色"
            value={keyword}
          />
        </div>
        <div className="segmented">
          {(['全部', 'PENDING', 'ACTIVE', 'DISABLED', 'LOCKED', 'DELETED'] as const).map((status) => (
            <button
              className={statusFilter === status ? 'selected' : ''}
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              type="button"
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {message ? (
        <section className="security-warning success">
          <KeyRound size={18} />
          <span>{message}</span>
        </section>
      ) : null}

      {resetResult ? (
        <section className="security-warning success">
          <KeyRound size={18} />
          <span>{resetResult}</span>
        </section>
      ) : null}

      <section>
        <DataTable
          rows={pageRows}
          columns={[
            {
              key: 'username',
              title: '用户',
              render: (row) => (
                <span className="user-cell">
                  {row.avatarUrl ? <img alt="" src={row.avatarUrl} /> : <b>{row.avatar}</b>}
                  <span>{row.username}<small>{row.nickname}</small></span>
                </span>
              ),
            },
            { key: 'email', title: '邮箱' },
            { key: 'phone', title: '手机号' },
            { key: 'role', title: '角色' },
            { key: 'department', title: '部门' },
            {
              key: 'status',
              title: '状态',
              render: (row) => <span className={`table-status ${row.status}`}>{row.status}</span>,
            },
            { key: 'createdAt', title: '注册时间' },
            { key: 'lastLogin', title: '最近登录' },
            {
              key: 'actions',
              title: '操作',
              render: (row) => (
                <div className="table-actions">
                  <button className="text-button" onClick={() => setEditingUser(row)} type="button">编辑</button>
                  <button className="text-button" onClick={() => toggleStatus(row)} type="button">
                    {row.status === 'ACTIVE' ? '禁用' : '启用'}
                  </button>
                  <button className="icon-button" onClick={() => resetPassword(row)} title="重置密码" type="button">
                    <KeyRound size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      <div className="pagination-row">
        <button className="secondary-button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">上一页</button>
        <span>{loading ? '加载中' : `${page} / ${totalPages}`}</span>
        <button className="secondary-button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} type="button">下一页</button>
      </div>

      {editingUser ? (
        <div className="modal-backdrop" role="presentation">
          <form aria-modal="true" className="form-modal wide" onSubmit={saveUser} role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">User Profile</span>
                <h2>{editingUser.id ? '编辑用户' : '创建用户'}</h2>
              </div>
              <button className="icon-button" onClick={() => setEditingUser(null)} type="button">×</button>
            </div>
            <div className="form-grid">
              <FormInput label="用户名" value={editingUser.username} onChange={(value) => setEditingUser({ ...editingUser, username: value })} />
              {!editingUser.id ? (
                <FormInput label="初始密码" type="password" value={editingUser.password} onChange={(value) => setEditingUser({ ...editingUser, password: value })} placeholder="默认 Mirage@123456" />
              ) : null}
              <FormInput label="昵称" value={editingUser.nickname} onChange={(value) => setEditingUser({ ...editingUser, nickname: value })} />
              <FormInput label="邮箱" type="email" value={editingUser.email} onChange={(value) => setEditingUser({ ...editingUser, email: value })} />
              <FormInput label="手机号" value={editingUser.phone} onChange={(value) => setEditingUser({ ...editingUser, phone: value })} />
              <FormInput label="头像地址" value={editingUser.avatarUrl} onChange={(value) => setEditingUser({ ...editingUser, avatarUrl: value })} placeholder="可填写头像 URL 或 data URL" />
              <label className="field-line">
                <span>状态</span>
                <select value={editingUser.status} onChange={(event) => setEditingUser({ ...editingUser, status: event.target.value as BackendUserStatus })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                  <option value="LOCKED">LOCKED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="DELETED">DELETED</option>
                </select>
              </label>
              <label className="field-line">
                <span>角色</span>
                <select
                  value={editingUser.roles[0] ?? ''}
                  onChange={(event) => setEditingUser({ ...editingUser, roles: event.target.value ? [event.target.value] : [] })}
                >
                  {roles.map((role) => (
                    <option key={role.code} value={role.code}>{role.name} / {role.code}</option>
                  ))}
                </select>
              </label>
              <label className="field-line">
                <span>部门</span>
                <select value={editingUser.organizationId} onChange={(event) => setEditingUser({ ...editingUser, organizationId: event.target.value })}>
                  <option value="">未选择</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>{organization.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditingUser(null)} type="button">取消</button>
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
      <input onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
    </label>
  );
}

function mapUserRow(user: BackendUser): UserRow {
  const roles = user.roles?.length ? user.roles : ['USER'];
  return {
    id: String(user.id),
    username: user.username,
    password: '',
    nickname: user.nickname || user.username,
    email: user.email ?? '',
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? '',
    avatar: initials(user.nickname || user.username),
    roles,
    role: roles.join(', '),
    organizationId: user.organizationId ? String(user.organizationId) : '',
    department: user.organizationName ?? '-',
    status: user.status,
    createdAt: '-',
    lastLogin: user.lastLoginAt ? user.lastLoginAt.replace('T', ' ') : '-',
  };
}

function toUserPayload(user: UserRow) {
  return {
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    organizationId: user.organizationId ? Number(user.organizationId) : null,
    roles: user.roles,
    status: user.status,
  };
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
