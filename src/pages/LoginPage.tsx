import { Eye, Fingerprint, KeyRound, Mail, ShieldAlert, X } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchCurrentUser, login } from '../api';
import { CaptchaChallenge } from '../components/CaptchaChallenge';
import { authSecurityConfig } from '../config';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setLoginResult = useAuthStore((state) => state.setLoginResult);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const [account, setAccount] = useState('admin');
  const [password, setPassword] = useState('mirage@2026');
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(authSecurityConfig.captchaMode === 'NONE');
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const captchaAutoSubmitRef = useRef(false);

  const now = Date.now();
  const isLocked = lockedUntil > now;
  const lockRemainSeconds = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const redirectTo = useMemo(() => {
    const state = location.state as { redirectTo?: string } | null;
    return state?.redirectTo ?? '/portal';
  }, [location.state]);

  const submitLogin = useCallback(async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await login({
        username: account,
        password,
      });
      setLoginResult(result, rememberMe);
      try {
        const currentUser = await fetchCurrentUser();
        setCurrentUser(currentUser);
      } catch {
        // 登录响应已经足够建立前端会话，当前用户接口失败时不中断登录。
      }
      setFailedAttempts(0);
      navigate(redirectTo);
    } catch {
      setFailedAttempts((current) => {
        const nextFailedAttempts = current + 1;
        if (nextFailedAttempts >= authSecurityConfig.maxLoginFailures) {
          setLockedUntil(Date.now() + authSecurityConfig.lockSeconds * 1000);
        }
        return nextFailedAttempts;
      });
      captchaAutoSubmitRef.current = false;
      setCaptchaVerified(authSecurityConfig.captchaMode === 'NONE');
      setError('登录失败，请检查账号、密码或后端服务状态。');
    } finally {
      setSubmitting(false);
    }
  }, [account, navigate, password, redirectTo, rememberMe, setCurrentUser, setLoginResult]);

  useEffect(() => {
    if (!captchaOpen || !captchaVerified || submitting || captchaAutoSubmitRef.current) {
      return;
    }
    captchaAutoSubmitRef.current = true;
    setCaptchaOpen(false);
    void submitLogin();
  }, [captchaOpen, captchaVerified, submitting, submitLogin]);

  const handleCaptchaChange = useCallback((verified: boolean) => {
    setCaptchaVerified(verified);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLocked) {
      setError(`账户已短时锁定，请 ${lockRemainSeconds} 秒后再试。`);
      return;
    }
    if (authSecurityConfig.captchaMode !== 'NONE' && !captchaVerified) {
      setError('');
      captchaAutoSubmitRef.current = false;
      setCaptchaVerified(false);
      setCaptchaOpen(true);
      return;
    }
    await submitLogin();
  }

  function closeCaptcha() {
    setCaptchaOpen(false);
    captchaAutoSubmitRef.current = false;
    setCaptchaVerified(authSecurityConfig.captchaMode === 'NONE');
  }

  return (
    <section className="login-stage">
      <div className="login-art">
        <div className="orbital-lock">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="lock-core">
            <Fingerprint size={58} />
          </div>
        </div>
        <div className="login-art-copy">
          <span>Mirage Identity</span>
          <h1>统一认证中心</h1>
        </div>
      </div>

      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="eyebrow">Secure Sign In</span>
          <h2>登录控制台</h2>
        </div>

        {isLocked ? (
          <div className="security-warning">
            <ShieldAlert size={18} />
            <span>失败次数过多，剩余锁定 {lockRemainSeconds} 秒</span>
          </div>
        ) : null}

        <label className="field-line">
          <span>账号</span>
          <div>
            <Mail size={18} />
            <input
              autoComplete="username"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="用户名或邮箱"
            />
          </div>
        </label>

        <label className="field-line">
          <span>密码</span>
          <div>
            <KeyRound size={18} />
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Eye size={18} />
          </div>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="submit-button" type="submit" disabled={submitting || isLocked}>
          {submitting ? '登录中...' : '登录并进入门户'}
        </button>

        <div className="login-options">
          <label>
            <input
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
            />
            <span>{rememberMe ? '长会话 7 天' : '保持会话 2 小时'}</span>
          </label>
          <Link to="/register">注册账号</Link>
        </div>
      </form>

      {captchaOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="captcha-modal" role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Verification</span>
                <h2>{authSecurityConfig.captchaMode === 'PUZZLE' ? '完成拼图验证' : '完成文字点击验证'}</h2>
              </div>
              <button className="icon-button" onClick={closeCaptcha} type="button">
                <X size={16} />
              </button>
            </div>
            <CaptchaChallenge
              mode={authSecurityConfig.captchaMode}
              onVerifiedChange={handleCaptchaChange}
            />
            <div className="modal-actions">
              <span className="captcha-auto-note">验证通过后自动登录</span>
              <button className="secondary-button" onClick={closeCaptcha} type="button">取消</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
