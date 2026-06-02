import { KeyRound, Plus, Save, Search, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BackendPermission,
  BackendRole,
  RoleStatus,
  createRole,
  deleteRoleById,
  fetchPermissions,
  fetchRoles,
  updateRole,
  updateRolePermissions,
  updateRoleStatus,
} from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';

type RoleRow = BackendRole;

const emptyRole: RoleRow = {
  id: 0,
  code: '',
  name: '',
  description: '',
  status: 'ACTIVE',
  userCount: 0,
  dataScope: '本人',
  permissions: [],
};

export function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<BackendPermission[]>([]);
  const [keyword, setKeyword] = useState('');
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [authorizationDraft, setAuthorizationDraft] = useState<{
    permissions: string[];
    roleId: number;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    description: string;
    run: () => Promise<void>;
    title: string;
  } | null>(null);

  useEffect(() => {
    void loadRoles();
    void loadPermissions();
  }, []);

  async function loadRoles() {
    try {
      setRoles(await fetchRoles());
    } catch {
      setMessage('角色列表加载失败，请确认后端服务是否可用。');
    }
  }

  async function loadPermissions() {
    try {
      setPermissionOptions(await fetchPermissions());
    } catch {
      setMessage('权限选项加载失败，角色授权暂不可用。');
    }
  }

  const filteredRoles = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    if (!value) {
      return roles;
    }
    return roles.filter((role) =>
      [role.code, role.name, role.description, role.dataScope].join(' ').toLowerCase().includes(value),
    );
  }, [keyword, roles]);

  const authorizingRole = roles.find((role) => role.id === authorizationDraft?.roleId);

  function openCreateRole() {
    setEditingRole({ ...emptyRole });
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRole) {
      return;
    }
    setMessage('');
    try {
      const payload = {
        code: editingRole.code,
        name: editingRole.name,
        description: editingRole.description,
        dataScope: editingRole.dataScope,
        status: editingRole.status,
        permissions: editingRole.permissions,
      };
      if (editingRole.id) {
        await updateRole(editingRole.id, payload);
      } else {
        await createRole(payload);
      }
      setEditingRole(null);
      await loadRoles();
      setMessage('角色已保存。');
    } catch {
      setMessage('角色保存失败，请检查编码是否重复或必填字段是否完整。');
    }
  }

  function toggleRoleStatus(role: RoleRow) {
    const nextStatus: RoleStatus = role.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setConfirmAction({
      title: role.status === 'ACTIVE' ? '确认禁用角色' : '确认启用角色',
      description: `${role.status === 'ACTIVE' ? '禁用' : '启用'} ${role.name} 会影响 ${role.userCount} 个绑定用户的菜单和接口访问。`,
      run: async () => {
        await updateRoleStatus(role.id, nextStatus);
        await loadRoles();
        setMessage(`${role.name} 状态已更新为 ${nextStatus}。`);
      },
    });
  }

  function deleteRole(role: RoleRow) {
    setConfirmAction({
      title: '确认删除角色',
      description: role.userCount > 0
        ? `${role.name} 当前仍绑定 ${role.userCount} 个用户，删除会移除这些用户的角色授权。`
        : `删除 ${role.name} 后，该角色配置不可恢复。`,
      run: async () => {
        await deleteRoleById(role.id);
        if (authorizationDraft?.roleId === role.id) {
          setAuthorizationDraft(null);
        }
        await loadRoles();
        setMessage('角色已删除。');
      },
    });
  }

  function openAuthorization(role: RoleRow) {
    setAuthorizationDraft({
      roleId: role.id,
      permissions: [...role.permissions],
    });
  }

  function toggleDraftPermission(permissionCode: string) {
    if (!authorizationDraft) {
      return;
    }
    const exists = authorizationDraft.permissions.includes(permissionCode);
    setAuthorizationDraft({
      ...authorizationDraft,
      permissions: exists
        ? authorizationDraft.permissions.filter((code) => code !== permissionCode)
        : [...authorizationDraft.permissions, permissionCode],
    });
  }

  async function saveAuthorization() {
    if (!authorizationDraft) {
      return;
    }
    try {
      await updateRolePermissions(authorizationDraft.roleId, authorizationDraft.permissions);
      setAuthorizationDraft(null);
      await loadRoles();
      setMessage('角色授权已保存。');
    } catch {
      setMessage('角色授权保存失败，请稍后重试。');
    }
  }

  return (
    <section className="page-stack role-page">
      <PageHeader
        eyebrow="Roles"
        title="角色管理"
        description="独立维护角色编码、角色名称、数据范围、状态和角色授权关系。权限资源定义已拆分到权限管理菜单。"
        actions={
          <button className="primary-button" onClick={openCreateRole} type="button">
            <Plus size={17} />
            创建角色
          </button>
        }
      />

      <section className="toolbar-row">
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索角色"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索角色编码、名称、描述、数据范围"
            value={keyword}
          />
        </div>
      </section>

      {message ? (
        <section className="security-warning success">
          <KeyRound size={18} />
          <span>{message}</span>
        </section>
      ) : null}

      <section className="role-list-panel">
        <DataTable
          rows={filteredRoles}
          columns={[
            { key: 'code', title: '角色编码' },
            { key: 'name', title: '角色名称' },
            { key: 'description', title: '角色描述' },
            { key: 'dataScope', title: '数据范围' },
            { key: 'userCount', title: '绑定用户' },
            {
              key: 'permissionCount',
              title: '已授权限',
              render: (row) => `${row.permissions.length} 项`,
            },
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
                  <button className="text-button" onClick={() => openAuthorization(row)} type="button">授权</button>
                  <button className="text-button" onClick={() => setEditingRole(row)} type="button">编辑</button>
                  <button className="text-button" onClick={() => toggleRoleStatus(row)} type="button">
                    {row.status === 'ACTIVE' ? '禁用' : '启用'}
                  </button>
                  <button className="icon-button danger" onClick={() => deleteRole(row)} title="删除角色" type="button">
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {editingRole ? (
        <div className="modal-backdrop" role="presentation">
          <form aria-modal="true" className="form-modal" onSubmit={saveRole} role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Role</span>
                <h2>{editingRole.id ? '编辑角色' : '创建角色'}</h2>
              </div>
              <button className="icon-button" onClick={() => setEditingRole(null)} type="button">×</button>
            </div>
            <label className="field-line">
              <span>角色编码</span>
              <input value={editingRole.code} onChange={(event) => setEditingRole({ ...editingRole, code: event.target.value })} />
            </label>
            <label className="field-line">
              <span>角色名称</span>
              <input value={editingRole.name} onChange={(event) => setEditingRole({ ...editingRole, name: event.target.value })} />
            </label>
            <label className="field-line">
              <span>角色描述</span>
              <input value={editingRole.description} onChange={(event) => setEditingRole({ ...editingRole, description: event.target.value })} />
            </label>
            <label className="field-line">
              <span>数据范围</span>
              <select value={editingRole.dataScope} onChange={(event) => setEditingRole({ ...editingRole, dataScope: event.target.value })}>
                <option>全部组织</option>
                <option>本部门及下级</option>
                <option>本部门</option>
                <option>本人</option>
              </select>
            </label>
            <label className="field-line">
              <span>状态</span>
              <select value={editingRole.status} onChange={(event) => setEditingRole({ ...editingRole, status: event.target.value as RoleStatus })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditingRole(null)} type="button">取消</button>
              <button className="primary-button" type="submit">
                <Save size={16} />
                保存
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {authorizationDraft && authorizingRole ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="form-modal wide" role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Authorization</span>
                <h2>角色授权</h2>
              </div>
              <button className="icon-button" onClick={() => setAuthorizationDraft(null)} type="button">×</button>
            </div>
            <section className="authorization-summary">
              <div>
                <KeyRound size={20} />
                <span>当前角色</span>
                <strong>{authorizingRole.name}</strong>
              </div>
              <div>
                <KeyRound size={20} />
                <span>角色编码</span>
                <strong>{authorizingRole.code}</strong>
              </div>
              <div>
                <KeyRound size={20} />
                <span>已选权限</span>
                <strong>{authorizationDraft.permissions.length}</strong>
              </div>
            </section>
            <div className="permission-check-list modal-permission-list">
              {permissionOptions.map((permission) => (
                <label key={permission.code}>
                  <input
                    checked={authorizationDraft.permissions.includes(permission.code)}
                    onChange={() => toggleDraftPermission(permission.code)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{permission.name}</strong>
                    <small>{permission.type} · {permission.code}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setAuthorizationDraft(null)} type="button">取消</button>
              <button className="primary-button" onClick={saveAuthorization} type="button">
                <Save size={16} />
                保存授权
              </button>
            </div>
          </section>
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
