import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { Search, Users, Plus, Phone, MapPin } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  code: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  customerType: string | null;
  debtBalance: number;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const params = search ? { search } : undefined;
      const response = await salesmanApi.getCustomers(params);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">العملاء</h1>
        <Link
          to="/customers/add"
          className="bg-primary-600 text-white p-2 rounded-lg"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن عميل..."
          className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا يوجد عملاء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                  {customer.code && (
                    <p className="text-xs text-gray-400 mt-1">{customer.code}</p>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {(customer.city || customer.address) && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="h-4 w-4" />
                      <span>{customer.city || customer.address}</span>
                    </div>
                  )}
                </div>
                {customer.debtBalance > 0 && (
                  <span className="text-red-600 font-medium text-sm">
                    ${customer.debtBalance.toFixed(2)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
