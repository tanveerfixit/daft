import { useState, useEffect } from 'react';
import { Building, MapPin, Phone, Mail, Globe, ArrowLeft, Package, Clock } from 'lucide-react';

interface PublicBusiness {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  branches: any[];
}

export default function PublicProfile({ slug, onBack }: { slug: string, onBack?: () => void }) {
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/business/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Business not found');
        return res.json();
      })
      .then(data => {
        setBusiness(data);
        if (data?.name) {
          document.title = data.name;
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
          <Building size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Business Not Found</h1>
        <p className="text-slate-500 mb-8 max-w-md">The profile you are looking for does not exist or is currently inactive.</p>
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-2 text-slate-900 font-bold hover:underline">
            <ArrowLeft size={16} /> Back to Home
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Hero Header */}
      <header className="bg-white border-b border-slate-200 pt-12 pb-8">
        <div className="max-w-4xl mx-auto px-6">
          {onBack && (
            <button onClick={onBack} className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-bold uppercase tracking-wider">
              <ArrowLeft size={16} /> Back
            </button>
          )}
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-4xl font-black">
                {business.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{business.name}</h1>
                <div className="flex items-center gap-4 text-slate-500 text-sm font-medium">
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {business.city || 'Location N/A'}</span>
                  <span className="flex items-center gap-1.5"><Globe size={14} /> Verified Profile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-8">
            <section className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Building size={20} className="text-slate-400" /> About Business
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Welcome to {business.name}. We are committed to providing exceptional service and quality products. 
                Visit one of our branches listed below to experience our professional care first-hand.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={20} className="text-slate-400" /> Our Branches
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {business.branches.length > 0 ? business.branches.map((br, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">{br.name}</h3>
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-1 rounded uppercase">Open</span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-500">
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="mt-0.5 shrink-0" />
                        <span>{br.address || 'Address not listed'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="shrink-0" />
                        <span>{br.phone || 'Phone not listed'}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center">
                    <p className="text-slate-400 text-sm font-medium">No public branch information available.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-8">
              <h3 className="font-black text-xl mb-6">Contact Us</h3>
              <div className="space-y-4 text-sm font-medium text-slate-300">
                {business.email && (
                  <a href={`mailto:${business.email}`} className="flex items-center gap-3 hover:text-white transition-colors">
                    <Mail size={16} /> {business.email}
                  </a>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-center gap-3 hover:text-white transition-colors">
                    <Phone size={16} /> {business.phone}
                  </a>
                )}
              </div>
              <button className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl mt-8 hover:bg-slate-100 transition-all">
                Send Inquiry
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Business Details</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded flex items-center justify-center text-slate-400">
                    <Package size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Status</div>
                    <div className="text-xs font-bold text-slate-900 uppercase">Verified Active</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 rounded flex items-center justify-center text-slate-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Response Time</div>
                    <div className="text-xs font-bold text-slate-900">Typically within 24h</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Powered by EPOS Lab</p>
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-900">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span className="text-slate-200">•</span>
            <a href="#" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
