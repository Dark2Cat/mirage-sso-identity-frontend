import { Download, Eye, Search, ShieldAlert, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAuditLogs } from '../api';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import type { AuditLog } from '../types';

type SortMode = 'time_desc' | 'time_asc' | 'event_asc';

const pageSize = 6;

export function AuditPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<AuditLog['type'] | '全部'>('全部');
  const [resultFilter, setResultFilter] = useState<AuditLog['result'] | '全部'>('全部');
  const [sortMode, setSortMode] = useState<SortMode>('time_desc');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [message, setMessage] = useState('');

  const loadAuditLogs = useCallback(async () => {
    try {
      const result = await fetchAuditLogs({
        page,
        size: pageSize,
        eventType: typeFilter === '全部' ? undefined : typeFilter,
        result: resultFilter === '全部' ? undefined : resultFilter,
        keyword: keyword.trim() || undefined,
      });
      setRows(result.items);
      setTotal(result.total);
    } catch {
      setMessage('审计日志加载失败，请确认后端服务是否可用。');
    }
  }, [keyword, page, resultFilter, typeFilter]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortMode === 'event_asc') {
        return a.event.localeCompare(b.event);
      }
      return sortMode === 'time_asc'
        ? a.time.localeCompare(b.time)
        : b.time.localeCompare(a.time);
    });
  }, [rows, sortMode]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const failedCount = rows.filter((row) => row.result === 'FAILED').length;
  const securityCount = rows.filter((row) => row.type === 'SECURITY').length;

  function downloadCsv() {
    const csv = [
      ['日志 ID', '操作人', '类型', '事件', '对象', '时间', 'IP', 'User-Agent', '结果', '失败原因'],
      ...sortedRows.map((row) => [
        row.id,
        row.actor,
        row.type,
        row.event,
        row.target,
        row.time,
        row.ip,
        row.userAgent,
        row.result,
        row.failureReason,
      ]),
    ].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mirage-audit.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Security Audit"
        title="审计与安全日志"
        description="追踪登录、退出、Token 签发/刷新/撤销、管理员操作和异常安全事件。"
        actions={
          <button className="secondary-button" onClick={downloadCsv} type="button">
            <Download size={17} />
            下载 CSV
          </button>
        }
      />

      <section className="metric-grid">
        <AuditMetric label="日志总数" value={String(total)} hint="后端分页返回的总日志数" />
        <AuditMetric label="当前页失败" value={String(failedCount)} hint="当前筛选页内失败事件" />
        <AuditMetric label="当前页安全事件" value={String(securityCount)} hint="当前筛选页内安全事件" />
        <AuditMetric label="当前页结果" value={String(rows.length)} hint="本页日志数量" />
      </section>

      <section className="toolbar-row">
        <div className="search-box">
          <Search size={18} />
          <input
            aria-label="搜索审计日志"
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder="搜索操作人、事件、对象、IP、User-Agent、失败原因"
            value={keyword}
          />
        </div>
        <div className="segmented">
          {(['全部', 'LOGIN', 'TOKEN', 'ADMIN', 'SECURITY'] as const).map((type) => (
            <button
              className={typeFilter === type ? 'selected' : ''}
              key={type}
              onClick={() => {
                setTypeFilter(type);
                setPage(1);
              }}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar-row compact-toolbar">
        <div className="segmented">
          {(['全部', 'SUCCESS', 'FAILED'] as const).map((result) => (
            <button
              className={resultFilter === result ? 'selected' : ''}
              key={result}
              onClick={() => {
                setResultFilter(result);
                setPage(1);
              }}
              type="button"
            >
              {result}
            </button>
          ))}
        </div>
        <label className="field-line compact">
          <span>排序</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="time_desc">操作时间倒序</option>
            <option value="time_asc">操作时间正序</option>
            <option value="event_asc">事件名称升序</option>
          </select>
        </label>
      </section>

      {message ? (
        <section className="security-warning">
          <ShieldAlert size={18} />
          <span>{message}</span>
        </section>
      ) : null}

      <DataTable
        rows={sortedRows}
        columns={[
          { key: 'id', title: '日志 ID' },
          { key: 'actor', title: '操作人' },
          { key: 'type', title: '类型' },
          { key: 'event', title: '操作类型' },
          { key: 'target', title: '操作对象' },
          { key: 'time', title: '操作时间' },
          { key: 'ip', title: 'IP 地址' },
          {
            key: 'result',
            title: '结果',
            render: (row) => <span className={`table-status ${row.result}`}>{row.result}</span>,
          },
          {
            key: 'actions',
            title: '详情',
            render: (row) => (
              <button className="icon-button" onClick={() => setDetail(row)} type="button">
                <Eye size={16} />
              </button>
            ),
          },
        ]}
      />

      <div className="pagination-row">
        <button className="secondary-button" disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">上一页</button>
        <span>{page} / {totalPages}</span>
        <button className="secondary-button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} type="button">下一页</button>
      </div>

      {detail ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="form-modal" role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Audit Detail</span>
                <h2>{detail.event}</h2>
              </div>
              <button className="icon-button" onClick={() => setDetail(null)} type="button">
                <X size={16} />
              </button>
            </div>
            <div className="detail-grid">
              <span>操作人</span><strong>{detail.actor}</strong>
              <span>操作类型</span><strong>{detail.event}</strong>
              <span>操作对象</span><strong>{detail.target}</strong>
              <span>操作时间</span><strong>{detail.time}</strong>
              <span>IP 地址</span><strong>{detail.ip}</strong>
              <span>User-Agent</span><strong>{detail.userAgent}</strong>
              <span>操作结果</span><strong>{detail.result}</strong>
              <span>失败原因</span><strong>{detail.failureReason || '-'}</strong>
            </div>
            {detail.result === 'FAILED' ? (
              <div className="security-warning">
                <ShieldAlert size={18} />
                <span>{detail.failureReason || '该事件失败，需要排查。'}</span>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function AuditMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="metric-card">
      <ShieldAlert size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}
