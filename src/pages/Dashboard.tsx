import React, { useState } from 'react';
import GenerateClient from '../components/GenerateClient';
import UpdateProgress from '../components/UpdateProgress';
import ClientList from '../components/ClientList';

interface DashboardProps {
  setIsLoggedIn: (val: boolean) => void;
}

type Tab = 'generate' | 'update' | 'clients';

const Dashboard: React.FC<DashboardProps> = ({ setIsLoggedIn }) => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [jumpToClientId, setJumpToClientId] = useState('');

  const handleClientRowClick = (clientId: string) => {
    setJumpToClientId(clientId);
    setActiveTab('update');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Navbar */}
      <nav className="sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] z-10 flex justify-between items-center px-6 py-3">
        <div className="flex items-center">
          <span className="text-sm font-bold tracking-tighter text-[#F5F0EB]">VULCAN</span>
          <span className="text-[10px] bg-[#E8450A] text-white px-2 py-0.5 rounded ml-2 uppercase">Admin</span>
        </div>
        <div className="flex items-center">
          <span className="text-[10px] text-green-400 uppercase tracking-widest">● LIVE</span>
          <button
            className="text-sm text-[#6B6B6B] hover:text-[#F5F0EB] ml-6 transition-colors"
            onClick={() => setIsLoggedIn(false)}
          >
            Logout
          </button>
        </div>
      </nav>
      {/* Tabs */}
      <div className="bg-[#111111] border-b border-[#2A2A2A] flex">
        <button
          className={`px-6 py-3 text-sm transition-colors ${activeTab === 'generate' ? 'text-[#E8450A] border-b-2 border-[#E8450A] font-medium' : 'text-[#6B6B6B] hover:text-[#F5F0EB]'}`}
          onClick={() => setActiveTab('generate')}
        >
          Generate ID
        </button>
        <button
          className={`px-6 py-3 text-sm transition-colors ${activeTab === 'update' ? 'text-[#E8450A] border-b-2 border-[#E8450A] font-medium' : 'text-[#6B6B6B] hover:text-[#F5F0EB]'}`}
          onClick={() => setActiveTab('update')}
        >
          Update Progress
        </button>
        <button
          className={`px-6 py-3 text-sm transition-colors ${activeTab === 'clients' ? 'text-[#E8450A] border-b-2 border-[#E8450A] font-medium' : 'text-[#6B6B6B] hover:text-[#F5F0EB]'}`}
          onClick={() => setActiveTab('clients')}
        >
          All Clients
        </button>
      </div>
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {activeTab === 'generate' && <GenerateClient />}
        {activeTab === 'update' && (
          <UpdateProgress
            initialClientId={jumpToClientId}
            onJumpConsumed={() => setJumpToClientId('')}
          />
        )}
        {activeTab === 'clients' && <ClientList onClientClick={handleClientRowClick} />}
      </main>
    </div>
  );
};

export default Dashboard;
