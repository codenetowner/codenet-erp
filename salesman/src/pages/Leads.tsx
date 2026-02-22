import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { UserPlus, Plus, Phone, MapPin, Clock } from 'lucide-react';

interface Lead {
  id: number;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  businessType: string | null;
  status: string;
  createdAt: string;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeads();
  }, [filter]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const params = filter ? { status: filter } : undefined;
      const response = await salesmanApi.getLeads(params);
      setLeads(response.data);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-600';
      case 'contacted': return 'bg-yellow-100 text-yellow-600';
      case 'converted': return 'bg-green-100 text-green-600';
      case 'rejected': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'جديد';
      case 'contacted': return 'تم التواصل';
      case 'converted': return 'تم التحويل';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">العملاء المحتملين</h1>
        <Link
          to="/leads/add"
          className="bg-primary-600 text-white p-2 rounded-lg"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['', 'new', 'contacted', 'converted'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {status === '' ? 'الكل' : getStatusText(status)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا يوجد عملاء محتملين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{lead.businessName}</h3>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(lead.status)}`}>
                  {getStatusText(lead.status)}
                </span>
              </div>
              {lead.contactName && (
                <p className="text-sm text-gray-600">{lead.contactName}</p>
              )}
              {lead.phone && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                </div>
              )}
              {(lead.city || lead.address) && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin className="h-4 w-4" />
                  <span>{lead.city || lead.address}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                <Clock className="h-3 w-3" />
                <span>{new Date(lead.createdAt).toLocaleDateString('ar')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
