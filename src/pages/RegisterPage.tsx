import { CheckCircle2, Fingerprint, KeyRound, UserPlus } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api';

const strengthRules = [
  { label: '至少 8 位', test: (value: string) => value.length >= 8 },
  { label: '包含字母', test: (value: string) => /[a-zA-Z]/.test(value) },
  { label: '包含数字', test: (value: string) => /\d/.test(value) },
  { label: '包含符号', test: (value: string) => /[^a-zA-Z0-9]/.test(value) },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [checkPassword, setCheckPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passedRules = useMemo(
    () => strengthRules.filter((rule) => rule.test(password)),
    [password],
  );
  const strength = passedRules.length;
  const passwordReady = strength >= 3;
  const passwordMatched = password.length > 0 && password === checkPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordReady) {
      setError('密码强度不足，请至少满足 3 项强度规则。');
      return;
    }
    if (!passwordMatched) {
      setError('两次输入的密码不一致。');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await register({
        username,
        password,
        checkPassword,
      });
      navigate('/login');
    } catch {
      setError('注册失败，请检查用户名或后端服务状态。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="login-stage">
      <div className="login-art register-art">
        <div className="orbital-lock">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="lock-core">
            <UserPlus size={58} />
          </div>
        </div>
        <div className="login-art-copy">
          <span>Account Enrollment</span>
          <h1>注册普通用户</h1>
          <p>新用户注册后默认进入普通用户角色，后续可由管理员分配应用访问权限。</p>
        </div>
      </div>

      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="form-heading">
          <span className="eyebrow">Create Account</span>
          <h2>创建账号</h2>
        </div>

        <label className="field-line">
          <span>用户名</span>
          <div>
            <Fingerprint size={18} />
            <input
              autoComplete="username"
              minLength={3}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="mirage-user"
              required
              value={username}
            />
          </div>
        </label>

        <label className="field-line">
          <span>密码</span>
          <div>
            <KeyRound size={18} />
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
        </label>

        <label className="field-line">
          <span>确认密码</span>
          <div>
            <KeyRound size={18} />
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setCheckPassword(event.target.value)}
              required
              type="password"
              value={checkPassword}
            />
          </div>
        </label>

        <div className="strength-panel">
          <div className={`strength-bars level-${strength}`}>
            {[0, 1, 2, 3].map((item) => (
              <span key={item} />
            ))}
          </div>
          <div className="strength-rules">
            {strengthRules.map((rule) => {
              const passed = rule.test(password);
              return (
                <span className={passed ? 'passed' : ''} key={rule.label}>
                  <CheckCircle2 size={14} />
                  {rule.label}
                </span>
              );
            })}
            <span className={passwordMatched ? 'passed' : ''}>
              <CheckCircle2 size={14} />
              两次一致
            </span>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button className="submit-button" type="submit" disabled={submitting}>
          {submitting ? '注册中...' : '注册并返回登录'}
        </button>

        <div className="login-options">
          <Link to="/login">去登录</Link>
        </div>
      </form>
    </section>
  );
}
