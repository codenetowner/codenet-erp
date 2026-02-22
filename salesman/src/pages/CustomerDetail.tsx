import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { ArrowRight, Users, Phone, Mail, MapPin, CreditCard, ClipboardList } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  customerType: string | null;
  paymentTerms: string | null;
  creditLimit: number;
  debtBalance: number;
  notes: string | null;
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCustomer(parseInt(id));
    }
  }, [id]);

  const loadCustomer = async (customerId: number) => {
    try {
      const response = await salesmanApi.getCustomer(customerId);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error loading customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">العميل غير موجود</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-100">
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">تفاصيل العميل</h1>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{customer.name}</h2>
            {customer.code && <p className="text-sm text-gray-500">{customer.code}</p>}
            {customer.customerType && (
              <span className="inline-block mt-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                {customer.customerType}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-600">الرصيد المدين</p>
            <p className="text-xl font-bold text-red-700">${customer.debtBalance.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">حد الائتمان</p>
            <p className="text-xl font-bold text-blue-700">${customer.creditLimit.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-3 text-gray-600">
              <Phone className="h-5 w-5 text-gray-400" />
              <span>{customer.phone}</span>
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-3 text-gray-600">
              <Mail className="h-5 w-5 text-gray-400" />
              <span>{customer.email}</span>
            </a>
          )}
          {(customer.address || customer.city) && (
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span>{[customer.address, customer.city, customer.region].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {customer.paymentTerms && (
            <div className="flex items-center gap-3 text-gray-600">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <span>{customer.paymentTerms}</span>
            </div>
          )}
        </div>

        {customer.notes && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">ملاحظات</p>
            <p className="text-gray-700 mt-1">{customer.notes}</p>
          </div>
        )}
      </div>

      <Link
        to={`/tasks/create?customerId=${customer.id}`}
        className="block w-full bg-primary-600 text-white py-3 rounded-xl font-medium text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <ClipboardList className="h-5 w-5" />
          <span>إنشاء مهمة لهذا العميل</span>
        </div>
      </Link>
    </div>
  );
}
