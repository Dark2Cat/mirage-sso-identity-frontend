import { Building2, GitBranch, Plus, Save, Search, Trash2, UsersRound } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BackendOrganization,
  OrganizationStatus,
  createOrganization,
  deleteOrganizationById,
  fetchOrganizations,
  updateOrganization,
  updateOrganizationStatus,
} from '../api';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';

type OrganizationRow = BackendOrganization;

const emptyOrganization: OrganizationRow = {
  id: 0,
  parentId: null,
  name: '',
  code: '',
  manager: '',
  userCount: 0,
  sortOrder: 100,
  status: 'ACTIVE',
};

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [editingOrg, setEditingOrg] = useState<OrganizationRow | null>(null);
  const [message, setMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    description: string;
    run: () => Promise<void>;
    title: string;
  } | null>(null);

  useEffect(() => {
    void loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      const items = await fetchOrganizations();
      setOrganizations(items);
      setSelectedOrgId((current) => current ?? items[0]?.id ?? null);
    } catch {
      setMessage('组织列表加载失败，请确认后端服务是否可用。');
    }
  }

  const filteredOrganizations = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    return organizations
      .filter((org) => !value || [org.name, org.code, org.manager].join(' ').toLowerCase().includes(value))
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }, [keyword, organizations]);

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? organizations[0];
  const childOrganizations = organizations.filter((org) => org.parentId === selectedOrg?.id);
  const activeCount = organizations.filter((org) => org.status === 'ACTIVE').length;
  const totalUsers = organizations.reduce((sum, org) => sum + org.userCount, 0);

  function openCreateOrganization(parentId: number | null = null) {
    setEditingOrg({ ...emptyOrganization, parentId });
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingOrg) {
      return;
    }
    setMessage('');
    try {
      const payload = {
        parentId: editingOrg.parentId,
        name: editingOrg.name,
        code: editingOrg.code,
        manager: editingOrg.manager,
        userCount: editingOrg.userCount,
        sortOrder: editingOrg.sortOrder,
        status: editingOrg.status,
      };
      const saved = editingOrg.id
        ? await updateOrganization(editingOrg.id, payload)
        : await createOrganization(payload);
      setSelectedOrgId(saved.id);
      setEditingOrg(null);
      await loadOrganizations();
      setMessage('组织已保存。');
    } catch {
      setMessage('组织保存失败，请检查编码是否重复或必填字段是否完整。');
    }
  }

  function toggleOrganizationStatus(org: OrganizationRow) {
    const nextStatus: OrganizationStatus = org.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setConfirmAction({
      title: org.status === 'ACTIVE' ? '确认停用组织' : '确认启用组织',
      description: `${org.status === 'ACTIVE' ? '停用' : '启用'} ${org.name} 会影响该组织下用户的部门归属和数据范围。`,
      run: async () => {
        await updateOrganizationStatus(org.id, nextStatus);
        await loadOrganizations();
        setMessage(`${org.name} 状态已更新为 ${nextStatus}。`);
      },
    });
  }

  function deleteOrganization(org: OrganizationRow) {
    const childCount = organizations.filter((item) => item.parentId === org.id).length;
    setConfirmAction({
      title: '确认删除组织',
      description: childCount > 0
        ? `${org.name} 下还有 ${childCount} 个子组织，后端会拒绝删除有子组织的节点。`
        : `删除 ${org.name} 后，该组织不会再出现在用户部门选择中。`,
      run: async () => {
        await deleteOrganizationById(org.id);
        setSelectedOrgId((current) => (current === org.id ? organizations.find((item) => item.id !== org.id)?.id ?? null : current));
        await loadOrganizations();
        setMessage('组织已删除。');
      },
    });
  }

  function parentName(parentId: number | null) {
    if (!parentId) {
      return '无';
    }
    return organizations.find((org) => org.id === parentId)?.name ?? '未知';
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Organizations"
        title="组织管理"
        description="独立维护组织、部门、上下级关系、负责人和组织状态，用户管理页只负责选择归属。"
        actions={
          <button className="primary-button" onClick={() => openCreateOrganization()} type="button">
            <Plus size={17} />
            新建组织
          </button>
        }
      />

      <section className="summary-strip">
        <div>
          <Building2 size={20} />
          <span>组织总数</span>
          <strong>{organizations.length}</strong>
        </div>
        <div>
          <GitBranch size={20} />
          <span>启用组织</span>
          <strong>{activeCount}</strong>
        </div>
        <div>
          <UsersRound size={20} />
          <span>覆盖用户</span>
          <strong>{totalUsers}</strong>
        </div>
      </section>

      <section className="toolbar-row">
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索组织"
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索组织名称、编码、负责人"
            value={keyword}
          />
        </div>
      </section>

      {message ? (
        <section className="security-warning success">
          <Building2 size={18} />
          <span>{message}</span>
        </section>
      ) : null}

      <section className="organization-grid">
        <section className="ops-panel">
          <div className="panel-title">
            <GitBranch size={20} />
            <h2>组织树</h2>
          </div>
          <div className="org-tree">
            {organizations
              .filter((org) => !org.parentId)
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((org) => (
                <OrgTreeNode
                  key={org.id}
                  level={0}
                  node={org}
                  nodes={organizations}
                  onSelect={setSelectedOrgId}
                  selectedId={selectedOrgId}
                />
              ))}
          </div>
        </section>

        <section className="ops-panel">
          <div className="panel-title">
            <Building2 size={20} />
            <h2>组织详情</h2>
          </div>
          {selectedOrg ? (
            <>
              <div className="detail-grid">
                <span>组织名称</span><strong>{selectedOrg.name}</strong>
                <span>组织编码</span><strong>{selectedOrg.code}</strong>
                <span>上级组织</span><strong>{parentName(selectedOrg.parentId)}</strong>
                <span>负责人</span><strong>{selectedOrg.manager}</strong>
                <span>组织人数</span><strong>{selectedOrg.userCount} 人</strong>
                <span>状态</span><strong>{selectedOrg.status}</strong>
              </div>
              <div className="panel-actions">
                <button className="secondary-button" onClick={() => openCreateOrganization(selectedOrg.id)} type="button">新增下级</button>
                <button className="secondary-button" onClick={() => setEditingOrg(selectedOrg)} type="button">编辑组织</button>
                <button className="secondary-button" onClick={() => toggleOrganizationStatus(selectedOrg)} type="button">
                  {selectedOrg.status === 'ACTIVE' ? '停用组织' : '启用组织'}
                </button>
              </div>
              <div className="child-org-list">
                {childOrganizations.length ? childOrganizations.map((org) => (
                  <button key={org.id} onClick={() => setSelectedOrgId(org.id)} type="button">
                    <strong>{org.name}</strong>
                    <span>{org.userCount} 人 · {org.manager}</span>
                  </button>
                )) : <span>暂无下级组织</span>}
              </div>
            </>
          ) : null}
        </section>
      </section>

      <DataTable
        rows={filteredOrganizations}
        columns={[
          { key: 'name', title: '组织名称' },
          { key: 'code', title: '组织编码' },
          {
            key: 'parentId',
            title: '上级组织',
            render: (row) => parentName(row.parentId),
          },
          { key: 'manager', title: '负责人' },
          { key: 'userCount', title: '人数' },
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
                <button className="text-button" onClick={() => setSelectedOrgId(row.id)} type="button">查看</button>
                <button className="text-button" onClick={() => setEditingOrg(row)} type="button">编辑</button>
                <button className="text-button" onClick={() => toggleOrganizationStatus(row)} type="button">
                  {row.status === 'ACTIVE' ? '停用' : '启用'}
                </button>
                <button className="icon-button danger" onClick={() => deleteOrganization(row)} title="删除组织" type="button">
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {editingOrg ? (
        <div className="modal-backdrop" role="presentation">
          <form aria-modal="true" className="form-modal wide" onSubmit={saveOrganization} role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Organization</span>
                <h2>{editingOrg.id ? '编辑组织' : '创建组织'}</h2>
              </div>
              <button className="icon-button" onClick={() => setEditingOrg(null)} type="button">×</button>
            </div>
            <div className="form-grid">
              <label className="field-line">
                <span>组织名称</span>
                <input value={editingOrg.name} onChange={(event) => setEditingOrg({ ...editingOrg, name: event.target.value })} />
              </label>
              <label className="field-line">
                <span>组织编码</span>
                <input value={editingOrg.code} onChange={(event) => setEditingOrg({ ...editingOrg, code: event.target.value })} />
              </label>
              <label className="field-line">
                <span>上级组织</span>
                <select
                  value={editingOrg.parentId ?? ''}
                  onChange={(event) => setEditingOrg({ ...editingOrg, parentId: event.target.value ? Number(event.target.value) : null })}
                >
                  <option value="">无上级</option>
                  {organizations.filter((org) => org.id !== editingOrg.id).map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </label>
              <label className="field-line">
                <span>负责人</span>
                <input value={editingOrg.manager} onChange={(event) => setEditingOrg({ ...editingOrg, manager: event.target.value })} />
              </label>
              <label className="field-line">
                <span>组织人数</span>
                <input min={0} onChange={(event) => setEditingOrg({ ...editingOrg, userCount: Number(event.target.value) })} type="number" value={editingOrg.userCount} />
              </label>
              <label className="field-line">
                <span>排序</span>
                <input min={0} onChange={(event) => setEditingOrg({ ...editingOrg, sortOrder: Number(event.target.value) })} type="number" value={editingOrg.sortOrder} />
              </label>
              <label className="field-line">
                <span>状态</span>
                <select value={editingOrg.status} onChange={(event) => setEditingOrg({ ...editingOrg, status: event.target.value as OrganizationStatus })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setEditingOrg(null)} type="button">取消</button>
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

interface OrgTreeNodeProps {
  level: number;
  node: OrganizationRow;
  nodes: OrganizationRow[];
  onSelect: (id: number) => void;
  selectedId: number | null;
}

function OrgTreeNode({ level, node, nodes, onSelect, selectedId }: OrgTreeNodeProps) {
  const children = nodes
    .filter((item) => item.parentId === node.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <div className="org-tree-node">
      <button
        className={node.id === selectedId ? 'selected' : ''}
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: 14 + level * 18 }}
        type="button"
      >
        <Building2 size={16} />
        <span>{node.name}</span>
        <small>{node.userCount}</small>
      </button>
      {children.map((child) => (
        <OrgTreeNode
          key={child.id}
          level={level + 1}
          node={child}
          nodes={nodes}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
