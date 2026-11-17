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
import { incomingCards } from './data';
import { isLiveCard, refreshCards, subscribeCards, cardRevision } from './cardApi';

interface AppState {
  page: PageName;
  params: Record<string, string>;
  isLoggedIn: boolean;
  isAdmin: boolean;
  userName: string;
  userId: string;
}

export default function App() {
  useSyncExternalStore(subscribeCards, cardRevision);
  const [connectionError, setConnectionError] = useState('');
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { await refreshCards(); if (!stopped) setConnectionError(''); }
      catch (e) { if (!stopped) setConnectionError((e as Error).message); }
      if (!stopped) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);
  const [state, setState] = useState<AppState>({
    page: 'login',
    params: {},
    isLoggedIn: false,
    isAdmin: false,
    userName: '',
    userId: 'e1',
  });

  const navigate = (page: PageName, params: Record<string, string> = {}) => {
    setState(s => ({ ...s, page, params }));
    window.scrollTo(0, 0);
  };

  const handleLogin = (email: string, isAdmin: boolean) => {
    const userMap: Record<string, { name: string; id: string }> = {
      'minsu.kim@cardsync.io': { name: '김민수', id: 'e1' },
      'jiyoung.lee@cardsync.io': { name: '이지영', id: 'e2' },
      'sungho.park@cardsync.io': { name: '박성호', id: 'e3' },
      'yerin.choi@cardsync.io': { name: '최예린', id: 'e4' },
      'hyunwoo.jung@cardsync.io': { name: '정현우', id: 'e5' },
    };
    const user = userMap[email] || { name: email.split('@')[0], id: 'e1' };
    setState(s => ({
      ...s,
      isLoggedIn: true,
      isAdmin,
      userName: user.name,
      userId: user.id,
      page: 'dashboard',
      params: {},
    }));
  };

  if (!state.isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const pendingCount = incomingCards.filter(c => isLiveCard(c.id) && c.status === 'ready_for_review').length;

  const renderPage = () => {
    const { page, params } = state;
    switch (page) {
      case 'dashboard':
        return <Dashboard navigate={navigate} isAdmin={state.isAdmin} userId={state.userId} />;
      case 'my-cards':
        return <MyCards navigate={navigate} userId={state.userId} />;
      case 'add-card':
        return <MobileCapture navigate={navigate} userId={state.userId} />;
      case 'incoming-cards':
        return <IncomingCards navigate={navigate} />;
      case 'ai-recognition':
        return <AIRecognition key={params.cardId} navigate={navigate} cardId={params.cardId} />;
      case 'companies':
        return <Companies navigate={navigate} />;
      case 'company-detail':
        return <CompanyDetail navigate={navigate} companyId={params.companyId} />;
      case 'org-chart':
        return <OrgChart navigate={navigate} />;
      case 'business-network':
        return <BusinessNetwork navigate={navigate} />;
      case 'search':
        return <Search navigate={navigate} />;
      case 'admin':
        return <Admin navigate={navigate} isAdmin={state.isAdmin} />;
      case 'card-detail':
        return <CardDetail navigate={navigate} cardId={params.cardId} />;
      case 'mobile-capture':
        return <MobileCapture navigate={navigate} userId={state.userId} />;
      default:
        return <Dashboard navigate={navigate} isAdmin={state.isAdmin} userId={state.userId} />;
    }
  };

  return (
    <Layout
      currentPage={state.page}
      navigate={navigate}
      isAdmin={state.isAdmin}
      userName={state.userName}
      pendingCount={pendingCount}
    >
      {connectionError && <div role="alert" className="px-6 py-3 bg-amber-50 text-amber-800 text-sm">{connectionError}</div>}
      {renderPage()}
    </Layout>
  );
}
