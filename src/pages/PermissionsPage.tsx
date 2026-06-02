import { KeyRound, Plus, Save, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackendPermission,
  PermissionType,
  RoleStatus,
  createPermission,
  deletePermissionById,
  fetchPermissions,
  updatePermission,
  updatePermissionStatus,
} from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';

type PermissionRow = BackendPermission;

const emptyPermission: PermissionRow = {
  id: 0,
  code: '',
  name: '',
  type: 'API',
  parentId: null,
  resource: '',
  description: '',
  sortOrder: 100,
  status: 'ACTIVE',
};

export function PermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<PermissionType | '全部'>('全部');
  const [editingPermission, setEditingPermission] = useState<PermissionRow | null>(null);
  const [message, setMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    description: string;
    run: () => Promise<void>;
    title: string;
  } | null>(null);

  const loadPermissions = useCallback(async () => {
    try {
      const items = await fetchPermissions(typeFilter === '全部' ? undefined : typeFilter);
      setPermissions(items);
    } catch {
      setMessage('权限列表加载失败，请确认后端服务是否可用。');
    }
  }, [typeFilter]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const filteredPermissions = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    return permissions
      .filter((permission) =>
        !value || [
          permission.code,
          permission.name,
          permission.type,
          permission.resource,
          permission.description,
        ].join(' ').toLowerCase().includes(value),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }, [keyword, permissions]);

  const enabledCount = permissions.filter((permission) => permission.status === 'ACTIVE').length;
  const apiCount = permissions.filter((permission) => permission.type === 'API').length;

  function openCreatePermission() {
    setEditingPermission({ ...emptyPermission });
  }

  async function savePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPermission) {
      return;
    }
    setMessage('');
    try {
      const payload = {
        code: editingPermission.code,
        name: editingPermission.name,
        type: editingPermission.type,
        parentId: editingPermission.parentId,
        resource: editingPermission.resource,
        description: editingPermission.description,
        sortOrder: editingPermission.sortOrder,
        status: editingPermission.status,
      };
      if (editingPermission.id) {
        await updatePermission(editingPermission.id, payload);
      } else {
        await createPermission(payload);
      }
      setEditingPermission(null);
      await loadPermissions();
      setMessage('权限已保存。');
    } catch {
      setMessage('权限保存失败，请检查编码是否重复或必填字段是否完整。');
    }
  }

  function togglePermissionStatus(permission: PermissionRow) {
    const nextStatus: RoleStatus = permission.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setConfirmAction({
      title: permission.status === 'ACTIVE' ? '确认禁用权限' : '确认启用权限',
      description: `${permission.status === 'ACTIVE' ? '禁用' : '启用'} ${permission.code} 会影响所有绑定该权限的角色。`,
      run: async () => {
        await updatePermissionStatus(permission.id, nextStatus);
        await loadPermissions();
        setMessage(`${permission.code} 状态已更新为 ${nextStatus}。`);
      },
    });
  }

  function deletePermission(permission: PermissionRow) {
    setConfirmAction({
      title: '确认删除权限',
      description: `删除 ${permission.code} 后，相关角色授权会失效。`,
      run: async () => {
        await deletePermissionById(permission.id);
        await loadPermissions();
        setMessage('权限已删除。');
      },
    });
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Permissions"
        title="权限管理"
        description="独立维护应用、菜单、页面、按钮和 API 资源权限，供角色管理菜单绑定使用。"
        actions={
          <button className="primary-button" onClick={openCreatePermission} type="button">
            <Plus size={17} />
            新建权限
          </button>
        }
      />

      <section className="summary-strip">
        <div>
          <KeyRound size={20} />
          <span>权限总数</span>
          <strong>{permissions.length}</strong>
        </div>
        <div>
          <SlidersHorizontal size={20} />
          <span>启用权限</span>
          <strong>{enabledCount}</strong>
        </div>
        <div>
          <KeyRound size={20} />
          <span>API 权限</span>
          <strong>{apiCount}</strong>
        </div>
      </section>

      <section className="toolbar-row">
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索权限"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索权限编码、名称、资源、描述"
            value={keyword}
          />
        </div>
        <div className="segmented">
          {['全部', 'APP', 'MENU', 'PAGE', 'ACTION', 'API'].map((type) => (
            <button
              className={typeFilter === type ? 'selected' : ''}
              key={type}
              onClick={() => setTypeFilter(type as PermissionType | '全部')}
              type="button"
            >
              {type}
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

      <DataTable
        rows={filteredPermissions}
        columns={[
          { key: 'code', title: '权限编码' },
          { key: 'name', title: '权限名称' },
          { key: 'type', title: '类型' },
          { key: 'resource', title: '资源' },
          { key: 'sortOrder', title: '排序' },
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
                <button className="text-button" onClick={() => setEditingPermission(row)} type="button">编辑</button>
                <button className="text-button" onClick={() => togglePermissionStatus(row)} type="button">
                  {row.status === 'ACTIVE' ? '禁用' : '启用'}
                </button>
                <button className="icon-button danger" onClick={() => deletePermission(row)} title="删除权限" type="button">
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {editingPermission ? (
        <div className="modal-backdrop" role="presentation">
          <form aria-modal="true" className="form-modal wide" onSubmit={savePermission} role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Permission</span>
                <h2>{editingPermission.id ? '编辑权限' : '创建权限'}</h2>
              </div>
              <button className="icon-button" onClick={() => setEditingPermission(null)} type="button">×</button>
            </div>
            <div className="form-grid">
              <label className="field-line">
                <span>权限编码</span>
                <input value={editingPermission.code} onChange={(event) => setEditingPermission({ ...editingPermission, code: event.target.value })} />
              </label>
              <label className="field-line">
                <span>权限名称</span>
                <input value={editingPermission.name} onChange={(event) => setEditingPermission({ ...editingPermission, name: event.target.value })} />
              </label>
              <label className="field-line">
                <span>权限类型</span>
                <select value={editingPermission.type} onChange={(event) => setEditingPermission({ ...editingPermission, type: event.target.value as PermissionType })}>
                  <option value="APP">APP</option>
                  <option value="MENU">MENU</option>
                  <option value="PAGE">PAGE</option>
                  <option value="ACTION">ACTION</option>
                  <option value="API">API</option>
                </select>
              </label>
              <label className="field-line">
                <span>上级权限</span>
                <select
                  value={editingPermission.parentId ?? ''}
                  onChange={(event) => setEditingPermission({ ...editingPermission, parentId: event.target.value ? Number(event.target.value) : null })}
                >
                  <option value="">无上级</option>
                  {permissions.filter((permission) => permission.id !== editingPermission.id).map((permission) => (
                    <option key={permission.id} value={permission.id}>{permission.name}</option>
                  ))}
                </select>
              </label>
              <label className="field-line">
                <span>资源标识</span>
                <input value={editingPermission.resource} onChange={(event) => setEditingPermission({ ...editingPermission, resource: event.target.value })} />
              </label>
              <label className="field-line">
                <span>排序</span>
                <input
                  min={0}
                  onChange={(event) => setEditingPermission({ ...editingPermission, sortOrder: Number(event.target.value) })}
                  type="number"
                  value={editingPermission.sortOrder}
                />
              </label>
              <label className="field-line">
                <span>状态</span>
                <select value={editingPermission.status} onChange={(event) => setEditingPermission({ ...editingPermission, status: event.target.value as RoleStatus })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </label>
              <label className="field-line">
                <span>描述</span>
                <input value={editingPermission.description} onChange={(event) => setEditingPermission({ ...editingPermission, description: event.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditingPermission(null)} type="button">取消</button>
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
