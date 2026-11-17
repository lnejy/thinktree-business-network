import { useState, type FormEvent } from 'react';
import { submitCredentials, type Session } from '../authApi';
import { IconCard } from '../icons';

export default function Login({ onLogin, connectionError }: {
  onLogin: (session: Session) => void;
  connectionError: string;
}) {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const username = String(data.get('username'));
    const password = String(data.get('password'));
    setBusy(true);
    setError('');
    try {
      onLogin(await submitCredentials(signup ? {
        username, password, name: String(data.get('name')), inviteCode: String(data.get('inviteCode')),
      } : { username, password }, signup));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-2 focus:outline-blue-600';
  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="grid size-9 place-items-center rounded-lg bg-blue-600 text-white"><IconCard size={18} /></span>
          ThinkTree
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">{signup ? 'ThinkTree 팀에 가입' : 'ThinkTree 로그인'}</h1>
        <p className="mt-2 text-sm text-slate-600">{signup ? '팀에서 받은 초대 코드로 내 계정을 만드세요.' : '받은 명함과 팀의 비즈니스 네트워크를 확인하세요.'}</p>
        <form key={String(signup)} className="mt-6 space-y-4" onSubmit={submit}>
          {signup && <label className="block text-sm font-medium text-slate-800">이름
            <input name="name" autoComplete="name" maxLength={50} required className={inputClass} />
          </label>}
          <label className="block text-sm font-medium text-slate-800">아이디
            <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32} required className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-slate-800">비밀번호
            <input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 10 : undefined} maxLength={128} required className={inputClass} />
            {signup && <span className="mt-1 block text-xs text-slate-500">10자 이상 입력하세요.</span>}
          </label>
          {signup && <label className="block text-sm font-medium text-slate-800">회사 초대 코드
            <input name="inviteCode" type="password" autoComplete="off" maxLength={128} required className={inputClass} />
          </label>}
          {(error || connectionError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error || connectionError}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {busy ? '확인 중…' : signup ? '계정 만들기' : '로그인'}
          </button>
        </form>
        <button type="button" disabled={busy} onClick={() => { setSignup(!signup); setError(''); }} className="mt-5 rounded px-1 text-sm font-medium text-blue-700 hover:underline">
          {signup ? '이미 계정이 있어요. 로그인' : '처음이신가요? 회원가입'}
        </button>
      </section>
    </main>
  );
}
