export type CaptchaMode = 'NONE' | 'PUZZLE' | 'CLICK_TEXT';

export const authSecurityConfig = {
  captchaMode: 'PUZZLE' as CaptchaMode,
  maxLoginFailures: 5,
  lockSeconds: 60,
  shortSessionHours: 2,
  rememberSessionDays: 7,
};
