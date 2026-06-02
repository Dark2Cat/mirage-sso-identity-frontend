import { AlertCircle, CheckCircle2, Clock3, ImageUp, Info, KeyRound, Save, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { isAxiosError } from 'axios';
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiResponse,
  assignAppAccess,
  changeMyPassword,
  fetchAuditLogs,
  fetchCurrentUser,
  fetchPortalApps,
  updateMyProfile,
} from '../api';
import { PageHeader } from '../components/PageHeader';
import { useAuthStore } from '../stores/authStore';
import type { AuditLog, PortalApp } from '../types';

const MAX_AVATAR_SIZE_BYTES = 1024 * 1024;
const MAX_AVATAR_SIZE_MB = MAX_AVATAR_SIZE_BYTES / 1024 / 1024;
const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_HELP_TEXT = `支持 JPG、PNG、WebP、GIF，文件不超过 ${MAX_AVATAR_SIZE_MB}MB；选择后点击“保存资料”上传。`;

interface ProfileForm {
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
  avatarUrl: string;
}

type NoticeType = 'success' | 'error' | 'info';

interface Notice {
  text: string;
  type: NoticeType;
}

export function ProfilePage() {
  const user = useAuthStore();
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [profile, setProfile] = useState<ProfileForm>({
    nickname: user.displayName,
    email: user.email || `${user.username}@mirage.local`,
    phone: user.phone,
    avatar: avatarText(user.displayName),
    avatarUrl: user.avatarUrl,
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [authorizedApps, setAuthorizedApps] = useState<PortalApp[]>([]);
  const [loginLogs, setLoginLogs] = useState<AuditLog[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadProfileData = useCallback(async () => {
    try {
      const [currentUser, apps, logs] = await Promise.all([
        fetchCurrentUser(),
        fetchPortalApps(),
        fetchAuditLogs({ page: 1, size: 5, eventType: 'LOGIN', keyword: user.username }),
      ]);
      setCurrentUser(currentUser);
      setProfile({
        nickname: currentUser.nickname || currentUser.username,
        email: currentUser.email ?? '',
        phone: currentUser.phone ?? '',
        avatar: avatarText(currentUser.nickname || currentUser.username),
        avatarUrl: currentUser.avatarUrl ?? '',
      });
      setAuthorizedApps(apps.filter((app) => currentUser.apps.includes(app.code)));
      setLoginLogs(logs.items);
    } catch {
      setNotice({ type: 'error', text: '个人中心数据加载失败，请确认后端服务是否可用。' });
    }
  }, [setCurrentUser, user.username]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const result = await updateMyProfile({
        nickname: profile.nickname,
        email: profile.email,
        phone: profile.phone,
        avatarUrl: avatarFile ? undefined : profile.avatarUrl,
        avatar: avatarFile,
      });
      const currentUser = await fetchCurrentUser();
      setCurrentUser(currentUser);
      setProfile((current) => ({
        ...current,
        nickname: currentUser.nickname || result.nickname || current.nickname,
        email: currentUser.email ?? result.email ?? current.email,
        phone: currentUser.phone ?? result.phone ?? current.phone,
        avatar: avatarText(currentUser.nickname || result.nickname || current.nickname),
        avatarUrl: currentUser.avatarUrl ?? result.avatarUrl ?? current.avatarUrl,
      }));
      setAvatarFile(null);
      setAvatarPreviewUrl('');
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
      setNotice({ type: 'success', text: '个人资料已保存。' });
    } catch (error) {
      setNotice({ type: 'error', text: apiErrorMessage(error, '个人资料保存失败，请稍后重试。') });
    }
  }

  function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      event.target.value = '';
      setNotice({ type: 'error', text: '头像格式不支持，请选择 JPG、PNG、WebP 或 GIF 图片。' });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      event.target.value = '';
      setNotice({
        type: 'error',
        text: `头像文件过大，当前 ${formatFileSize(file.size)}，限制 ${MAX_AVATAR_SIZE_MB}MB。`,
      });
      return;
    }
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setNotice({ type: 'info', text: '头像已选择，点击“保存资料”后上传到后端。' });
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setProfile((current) => ({
      ...current,
      avatarUrl: '',
    }));
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice({ type: 'error', text: '两次输入的新密码不一致。' });
      return;
    }
    try {
      await changeMyPassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordModalOpen(false);
      setNotice({ type: 'success', text: '密码已修改。' });
    } catch (error) {
      setNotice({ type: 'error', text: apiErrorMessage(error, '密码修改失败，请检查原密码是否正确。') });
    }
  }

  async function revokeApp(appCode: string) {
    if (!user.id) {
      setNotice({ type: 'error', text: '当前用户缺少后端 ID，无法撤销应用授权。' });
      return;
    }
    const nextApps = authorizedApps.filter((app) => app.code !== appCode).map((app) => app.code);
    try {
      await assignAppAccess({ userId: user.id, appCodes: nextApps });
      setAuthorizedApps((current) => current.filter((app) => app.code !== appCode));
      setNotice({ type: 'success', text: '已撤销应用授权。' });
    } catch (error) {
      setNotice({ type: 'error', text: apiErrorMessage(error, '撤销应用授权失败，请稍后重试。') });
    }
  }

  const profileAvatarUrl = avatarPreviewUrl || profile.avatarUrl;
  const NoticeIcon = notice?.type === 'success' ? CheckCircle2 : notice?.type === 'error' ? AlertCircle : Info;

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Account Center"
        title="个人中心"
        description="维护头像、基础资料、登录凭证和应用授权。"
      />

      {notice ? (
        <section className={`security-warning ${notice.type}`}>
          <NoticeIcon size={18} />
          <span>{notice.text}</span>
        </section>
      ) : null}

      <section className="profile-editor-layout">
        <section className="profile-card">
          <div className="profile-avatar profile-avatar-large">
            {profileAvatarUrl ? (
              <img alt="用户头像预览" src={profileAvatarUrl} />
            ) : (
              profile.avatar
            )}
          </div>
          <h2>{profile.nickname}</h2>
          <p>{profile.email}</p>
          <div className="avatar-upload-actions">
            <input
              accept="image/*"
              aria-label="上传头像"
              hidden
              onChange={uploadAvatar}
              ref={avatarInputRef}
              type="file"
            />
            <button className="secondary-button" onClick={() => avatarInputRef.current?.click()} type="button">
              <ImageUp size={16} />
              上传头像
            </button>
            {profileAvatarUrl ? (
              <button className="icon-button danger" onClick={removeAvatar} title="移除头像" type="button">
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>
          <p className="avatar-upload-hint">{AVATAR_HELP_TEXT}</p>
          <div className="profile-meta-list">
            <span>账号：{user.username || 'admin'}</span>
            <span>角色：{user.role}</span>
            <span>会话：{user.sessionLabel}</span>
          </div>
        </section>

        <form className="ops-panel profile-form-panel" onSubmit={saveProfile}>
          <div className="panel-title split-title">
            <div>
              <UserRound size={20} />
              <h2>资料维护</h2>
            </div>
            <button className="secondary-button" onClick={() => setPasswordModalOpen(true)} type="button">
              <KeyRound size={16} />
              修改密码
            </button>
          </div>
          <div className="form-grid">
            <label className="field-line">
              <span>昵称</span>
              <input value={profile.nickname} onChange={(event) => setProfile({ ...profile, nickname: event.target.value })} />
            </label>
            <label className="field-line">
              <span>头像缩写</span>
              <input
                disabled={Boolean(profileAvatarUrl)}
                value={profile.avatar}
                onChange={(event) => setProfile({ ...profile, avatar: event.target.value.slice(0, 2).toUpperCase() })}
              />
            </label>
            <label className="field-line">
              <span>邮箱</span>
              <input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
            </label>
            <label className="field-line">
              <span>手机号</span>
              <input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
            </label>
          </div>
          <button className="primary-button" type="submit">
            <Save size={16} />
            保存资料
          </button>
        </form>
      </section>

      <section className="ops-layout">
        <section className="ops-panel">
          <div className="panel-title">
            <ShieldCheck size={20} />
            <h2>已授权应用</h2>
          </div>
          {authorizedApps.length ? authorizedApps.map((app) => (
            <div className="authorized-app" key={app.code}>
              <div>
                <strong>{app.name}</strong>
                <span>{app.category} / {app.tags.join(', ')}</span>
              </div>
              <button className="text-button" onClick={() => revokeApp(app.code)} type="button">撤销授权</button>
            </div>
          )) : <div className="health-row"><span>暂无已授权应用</span><strong>-</strong></div>}
        </section>

        <section className="ops-panel">
          <div className="panel-title">
            <Clock3 size={20} />
            <h2>最近登录记录</h2>
          </div>
          {loginLogs.length ? loginLogs.map((log) => (
            <div className="health-row" key={log.id}>
              <span>{log.time} / {log.ip}</span>
              <strong>{log.result}</strong>
            </div>
          )) : <div className="health-row"><span>暂无登录记录</span><strong>-</strong></div>}
        </section>
      </section>

      {passwordModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form aria-modal="true" className="form-modal" onSubmit={changePassword} role="dialog">
            <div className="modal-title">
              <div>
                <span className="eyebrow">Credential</span>
                <h2>修改密码</h2>
              </div>
              <button className="icon-button" onClick={() => setPasswordModalOpen(false)} type="button">×</button>
            </div>
            <label className="field-line">
              <span>原密码</span>
              <input type="password" value={passwordForm.oldPassword} onChange={(event) => setPasswordForm({ ...passwordForm, oldPassword: event.target.value })} />
            </label>
            <label className="field-line">
              <span>新密码</span>
              <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
            </label>
            <label className="field-line">
              <span>确认新密码</span>
              <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} />
            </label>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordModalOpen(false);
                }}
                type="button"
              >
                取消
              </button>
              <button className="primary-button" type="submit">
                <KeyRound size={16} />
                确认修改
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function avatarText(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ME';
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  }
  return `${Math.ceil(size / 1024)}KB`;
}
