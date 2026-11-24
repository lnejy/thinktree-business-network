import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Layout, { type PageName } from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyCards from './pages/MyCards';
import IncomingCards from './pages/IncomingCards';
import AIRecognition from './pages/AIRecognition';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import OrgChart from './pages/OrgChart';
import BusinessNetwork from './pages/BusinessNetwork';
import Search from './pages/Search';
import Admin from './pages/Admin';
import CardDetail from './pages/CardDetail';
import MobileCapture from './pages/MobileCapture';
import { employees, incomingCards } from './data';
import { isLiveCard, refreshCards, resetCards, RequestError, subscribeCards, cardRevision } from './cardApi';
import { endSession, getSession, type Session } from './authApi';

interface AppState {
  page: PageName;
  params: Record<string, string>;
}

export default function App() {
  useSyncExternalStore(subscribeCards, cardRevision);
  const [connectionError, setConnectionError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState<Session['user'] | null>(null);
  const [state, setState] = useState<AppState>({ page: 'dashboard', params: {} });

  function handleLogin(session: Session) {
    resetCards();
    employees.splice(0, employees.length, ...session.employees);
    setConnectionError('');
    setState({ page: 'dashboard', params: {} });
    setUser(session.user);
  }

  function clearSession() {
    employees.length = 0;
    resetCards();
    setConnectionError('');
    setUser(null);
  }

  useEffect(() => {
    const controller = new AbortController();
    void getSession(controller.signal).then(session => {
      if (!controller.signal.aborted) handleLogin(session);
    }).catch(error => {
      if (!controller.signal.aborted && !(error instanceof RequestError && error.status === 401)) {
        setConnectionError(error.message);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setCheckingSession(false);
    });
    return () => controller.abort();
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const { signal } = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const session = await getSession(signal);
        if (signal.aborted) return;
        if (session.user.id !== userId) {
          handleLogin(session);
          return;
        }
        employees.splice(0, employees.length, ...session.employees);
        setUser(session.user);
        await refreshCards(signal);
        if (!signal.aborted) setConnectionError('');
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof RequestError && error.status === 401) {
          clearSession();
          return;
        }
        setConnectionError((error as Error).message);
      }
      if (!signal.aborted) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [userId]);

  const navigate = (page: PageName, params: Record<string, string> = {}) => {
    setState(s => ({ ...s, page, params }));
    window.scrollTo(0, 0);
  };

  async function handleLogout() {
    try {
      await endSession();
      clearSession();
    } catch (error) {
      setConnectionError((error as Error).message);
    }
  }

  if (checkingSession) return <main role="status" className="p-6 text-sm text-slate-600">로그인 상태를 확인하는 중…</main>;
  if (!user) return <Login onLogin={handleLogin} connectionError={connectionError} />;
  const isAdmin = user.role === 'admin';
  const pendingCount = incomingCards.filter(c => isLiveCard(c.id) && c.status === 'ready_for_review').length;

  const renderPage = () => {
    const { page, params } = state;
    switch (page) {
      case 'dashboard':
        return <Dashboard navigate={navigate} isAdmin={isAdmin} userId={user.id} />;
      case 'my-cards':
        return <MyCards navigate={navigate} userId={user.id} />;
      case 'add-card':
        return <MobileCapture navigate={navigate} />;
      case 'incoming-cards':
        return <IncomingCards key={`${params.ownerId || ''}/${params.status || ''}`} navigate={navigate} initialOwner={params.ownerId} initialStatus={params.status} />;
      case 'ai-recognition':
        return <AIRecognition key={params.cardId} navigate={navigate} cardId={params.cardId} />;
      case 'companies':
        return <Companies navigate={navigate} />;
      case 'company-detail':
        return <CompanyDetail key={params.companyId} navigate={navigate} companyId={params.companyId} />;
      case 'org-chart':
        return <OrgChart navigate={navigate} />;
      case 'business-network':
        return <BusinessNetwork key={`${params.companyId || ''}/${params.scope || ''}`} navigate={navigate} companyName={user.company} userId={user.id} companyId={params.companyId} initialScope={params.scope} />;
      case 'search':
        return <Search navigate={navigate} />;
      case 'admin':
        return <Admin navigate={navigate} isAdmin={isAdmin} />;
      case 'card-detail':
        return <CardDetail key={params.cardId} navigate={navigate} cardId={params.cardId} userId={user.id} isAdmin={isAdmin} />;
      case 'mobile-capture':
        return <MobileCapture navigate={navigate} />;
      default:
        return <Dashboard navigate={navigate} isAdmin={isAdmin} userId={user.id} />;
    }
  };

  return (
    <Layout
      currentPage={state.page}
      navigate={navigate}
      isAdmin={isAdmin}
      userName={user.name}
      onLogout={handleLogout}
      pendingCount={pendingCount}
    >
      {connectionError && <div role="alert" className="px-6 py-3 bg-amber-50 text-amber-800 text-sm">{connectionError}</div>}
      {renderPage()}
    </Layout>
  );
}
