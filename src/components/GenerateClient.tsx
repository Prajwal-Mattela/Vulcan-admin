import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { STAGES, PACKAGES, SERVICE_TYPES, getDeadlineDays } from '../constants/stages';

const generateClientId = (): string => {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `VLX-${year}-${random}`;
};

const initialForm = {
  clientName: '',
  serviceType: '',
  packageTier: PACKAGES[0],
  note: '',
};

interface SuccessData {
  clientId: string;
  clientName: string;
  serviceType: string;
  packageTier: string;
}

const GenerateClient: React.FC = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePackage = (pkg: string) => setForm(f => ({ ...f, packageTier: pkg }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessData(null);
    const id = generateClientId();
    try {
      await setDoc(doc(collection(db, 'clients'), id), {
        clientId: id,
        clientName: form.clientName,
        serviceType: form.serviceType,
        packageTier: form.packageTier,
        packageDeadlineDays: getDeadlineDays(form.packageTier),
        currentStage: 0,
        currentStageName: STAGES[0],
        stageHistory: [{
          stage: 0,
          stageName: STAGES[0],
          updatedAt: new Date().toISOString(),
          note: form.note || 'Project created',
        }],
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        status: 'active',
      });
      // Capture success data BEFORE resetting the form
      setSuccessData({
        clientId: id,
        clientName: form.clientName,
        serviceType: form.serviceType,
        packageTier: form.packageTier,
      });
      setForm(initialForm);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!successData) return;
    navigator.clipboard.writeText(successData.clientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSuccessData(null);
    setCopied(false);
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-[#F5F0EB]">Generate Client ID</h2>
      <div className="text-sm text-[#6B6B6B] mt-1 mb-8">Fill in the client details to create a new tracking ID</div>

      <form className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 flex flex-col gap-6" onSubmit={handleSubmit}>
        {/* Client Name */}
        <div>
          <label className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2 block">Client Name</label>
          <input
            type="text"
            name="clientName"
            placeholder="e.g. Rajesh Kumar or Infosys Ltd."
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A] transition-colors"
            value={form.clientName}
            onChange={handleChange}
            required
          />
        </div>

        {/* Service Type */}
        <div>
          <label className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2 block">Service Type</label>
          <select
            name="serviceType"
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A] transition-colors"
            value={form.serviceType}
            onChange={handleChange}
            required
          >
            <option value="">Select a service...</option>
            {SERVICE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Package Tier */}
        <div>
          <label className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2 block">Package Tier</label>
          <div className="grid grid-cols-3 gap-3">
            {PACKAGES.map((pkg, i) => (
              <div
                key={pkg}
                className={`relative bg-[#111111] border ${form.packageTier === pkg ? 'border-[#E8450A] bg-[#E8450A]/5' : 'border-[#2A2A2A] hover:border-[#3A3A3A]'} rounded-lg p-4 cursor-pointer text-center transition-all`}
                onClick={() => handlePackage(pkg)}
              >
                <div className="text-xs text-[#6B6B6B] uppercase tracking-widest">{pkg.split(' ')[0]}</div>
                <div className="text-2xl font-bold text-[#F5F0EB] my-1">{pkg.match(/₹[\d,]+/)?.[0]}</div>
                <div className="text-xs text-[#6B6B6B]">{i === 0 ? 'Basic' : i === 1 ? 'Standard' : 'Premium'}</div>
                {i === 1 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#E8450A] text-white text-[9px] px-2 py-0.5 rounded uppercase whitespace-nowrap">Popular</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Initial Note */}
        <div>
          <label className="text-xs text-[#6B6B6B] uppercase tracking-wider mb-2 block">Initial Note (optional)</label>
          <textarea
            name="note"
            placeholder="Any additional info about this project..."
            rows={3}
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-lg px-4 py-3 text-[#F5F0EB] text-sm focus:outline-none focus:border-[#E8450A] transition-colors resize-none"
            value={form.note}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          className={`w-full bg-[#E8450A] text-white font-semibold py-4 rounded-lg text-sm tracking-wide hover:bg-[#FF6B35] transition-colors ${(!form.clientName || !form.serviceType || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!form.clientName || !form.serviceType || loading}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full"></span> Generating...</span>
            : 'Generate Client ID →'
          }
        </button>
      </form>

      {/* Success State */}
      {successData && (
        <div className="border border-green-500/50 bg-green-900/10 rounded-xl p-6 mt-6">
          <div className="text-green-400 font-semibold text-sm mb-4">✓ Client ID Generated Successfully</div>
          <div className="bg-[#0A0A0A] border border-[#E8450A] rounded-lg p-4 text-center">
            <div className="font-mono text-3xl font-bold text-[#E8450A] tracking-widest">{successData.clientId}</div>
          </div>
          <div className="mt-3 text-xs text-[#6B6B6B] text-center">
            <span className="text-[#F5F0EB]">{successData.clientName}</span>
            {' '}&bull;{' '}
            {successData.serviceType}
            {' '}&bull;{' '}
            <span className="text-[#E8450A]">{successData.packageTier}</span>
          </div>
          <div className="flex gap-3 mt-4 justify-center">
            <button
              className="bg-[#E8450A] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#FF6B35] transition-colors"
              onClick={handleCopy}
            >
              {copied ? 'Copied ✓' : 'Copy ID'}
            </button>
            <button
              className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F0EB] px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#111111] transition-colors"
              onClick={handleReset}
            >
              Generate Another
            </button>
          </div>
          <div className="text-xs text-[#6B6B6B] text-center mt-4">
            Share this ID with your client. They can track their project progress at:<br />
            <span className="text-[#E8450A]">vulcanagency.com/track</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default GenerateClient;
