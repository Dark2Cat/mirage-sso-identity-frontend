import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchConsentContext, submitConsentDecision } from '../api';
import { PageHeader } from '../components/PageHeader';
import { useAuthStore } from '../stores/authStore';

type ConsentDecision = 'idle' | 'approved' | 'denied';

interface ScopeItem {
  code: string;
  description: string;
  required: boolean;
  risk: 'low' | 'medium' | 'high';
  title: string;
}

export function ConsentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore();
  const clientId = searchParams.get('client_id') ?? 'mirage-oa';
  const [client, setClient] = useState<{
    name: string;
    owner: string;
    redirectUri: string;
    homepage: string;
  }>({
    name: '加载中',
    owner: '-',
    redirectUri: '-',
    homepage: '-',
  });
  const [requestedScopes, setRequestedScopes] = useState<ScopeItem[]>([]);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [decision, setDecision] = useState<ConsentDecision>('idle');
  const [message, setMessage] = useState('');

  const loadConsentContext = useCallback(async () => {
    try {
      const context = await fetchConsentContext(clientId);
      setClient(context.client);
      setRequestedScopes(context.scopes);
      setSelectedScopes(context.scopes.filter((scope) => scope.required || scope.risk !== 'high').map((scope) => scope.code));
    } catch {
      setMessage('授权上下文加载失败，请确认 client_id 是否正确或后端服务是否可用。');
    }
  }, [clientId]);

  useEffect(() => {
    void loadConsentContext();
  }, [loadConsentContext]);

  const optionalScopes = useMemo(
    () => requestedScopes.filter((scope) => !scope.required),
    [requestedScopes],
  );
  const requiredScopeCodes = useMemo(
    () => requestedScopes.filter((scope) => scope.required).map((scope) => scope.code),
    [requestedScopes],
  );
  const selectedOptionalCount = optionalScopes.filter((scope) => selectedScopes.includes(scope.code)).length;
  const highRiskSelected = requestedScopes.some((scope) => scope.risk === 'high' && selectedScopes.includes(scope.code));

  function toggleScope(scope: ScopeItem) {
    if (scope.required) {
      return;
    }
    setSelectedScopes((current) =>
      current.includes(scope.code)
        ? current.filter((code) => code !== scope.code)
        : [...current, scope.code],
    );
  }

  async function approveConsent() {
    try {
      await submitConsentDecision({
        clientId,
        approved: true,
        scopes: selectedScopes,
      });
      setDecision('approved');
    } catch {
      setMessage('授权提交失败，请稍后重试。');
    }
  }

  async function denyConsent() {
    try {
      await submitConsentDecision({
        clientId,
        approved: false,
        scopes: requiredScopeCodes,
      });
      setSelectedScopes(requiredScopeCodes);
      setDecision('denied');
    } catch {
      setMessage('拒绝授权提交失败，请稍后重试。');
    }
  }

  function resetDecision() {
    setDecision('idle');
  }

  return (
    <section className="page-stack narrow">
      <PageHeader
        eyebrow="OAuth Consent"
        title="授权确认"
        description="业务应用请求访问你的账号信息时，在这里确认授权范围；同意后认证中心会带着授权结果返回业务应用。"
      />

      {message ? (
        <section className="security-warning">
          <AlertTriangle size={18} />
          <span>{message}</span>
        </section>
      ) : null}

      <div className="consent-panel">
        <div className="client-badge">
          <div>
            <ShieldQuestion size={30} />
          </div>
          <section>
            <span>请求接入</span>
            <h2>{client.name}</h2>
            <p>{client.redirectUri}</p>
          </section>
        </div>

        <section className="consent-context-grid">
          <div>
            <span>当前账号</span>
            <strong>{user.displayName}</strong>
            <small>{user.email || `${user.username}@mirage.local`}</small>
          </div>
          <div>
            <span>应用方</span>
            <strong>{client.owner}</strong>
            <small>{client.homepage}</small>
          </div>
          <div>
            <span>授权范围</span>
            <strong>{selectedScopes.length} 项</strong>
            <small>{selectedOptionalCount} 项可选权限已勾选</small>
          </div>
        </section>

        {highRiskSelected ? (
          <section className="security-warning">
            <AlertTriangle size={18} />
            <span>当前包含离线访问权限，应用可在会话外刷新令牌。</span>
          </section>
        ) : null}

        <div className="scope-list enhanced-scope-list">
          {requestedScopes.map((scope) => {
            const selected = selectedScopes.includes(scope.code);
            return (
              <label className={selected ? 'selected' : ''} key={scope.code}>
                <input
                  checked={selected}
                  disabled={scope.required}
                  onChange={() => toggleScope(scope)}
                  type="checkbox"
                />
                <span>
                  <strong>{scope.title}</strong>
                  <small>{scope.code} · {scope.description}</small>
                </span>
                <em className={`risk-badge ${scope.risk}`}>{scope.required ? '必选' : riskText(scope.risk)}</em>
              </label>
            );
          })}
        </div>

        {decision !== 'idle' ? (
          <section className={`consent-result ${decision}`}>
            {decision === 'approved' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            <div>
              <strong>{decision === 'approved' ? '已同意授权' : '已拒绝授权'}</strong>
              <span>
                {decision === 'approved'
                  ? `将授权 ${selectedScopes.join(', ')} 并返回 ${client.name}。`
                  : `${client.name} 不会获得新的授权，业务应用应收到 access_denied。`}
              </span>
            </div>
          </section>
        ) : null}

        <div className="consent-footer">
          {decision === 'idle' ? (
            <>
              <button className="secondary-button" onClick={denyConsent} type="button">
                <ArrowLeft size={17} />
                拒绝
              </button>
              <button className="primary-button" onClick={approveConsent} type="button">
                <KeyRound size={17} />
                同意授权
              </button>
            </>
          ) : (
            <>
              <button className="secondary-button" onClick={resetDecision} type="button">
                重新选择
              </button>
              <button className="primary-button" onClick={() => navigate('/portal')} type="button">
                {decision === 'approved' ? <Check size={17} /> : <LockKeyhole size={17} />}
                返回门户
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function riskText(risk: ScopeItem['risk']) {
  if (risk === 'high') {
    return '高风险';
  }
  if (risk === 'medium') {
    return '可选';
  }
  return '低风险';
}
