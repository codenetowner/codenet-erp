import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { salesmanApi } from '../lib/api';
import { 
  ClipboardList, 
  Users, 
  UserPlus, 
  Package,
  Plus,
  TrendingUp,
  MapPin
} from 'lucide-react';

interface Dashboard {
  tasksCreatedToday: number;
  totalTasksCreated: number;
  leadsToday: number;
  totalLeads: number;
  customersToday: number;
  totalCustomers: number;
  visitTasksToday: number;
  visitTasksPending: number;
  visitTasksCompleted: number;
  totalVisitTasks: number;
}

export default function Home() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await salesmanApi.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold">مرحباً {user?.name}</h1>
        <p className="text-primary-100 mt-1">{user?.companyName}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/tasks/create"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Plus className="h-6 w-6 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">إنشاء مهمة</span>
        </Link>

        <Link
          to="/customers/add"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-green-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">إضافة عميل</span>
        </Link>

        <Link
          to="/leads/add"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">عميل محتمل</span>
        </Link>

        <Link
          to="/products"
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Package className="h-6 w-6 text-orange-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">المنتجات</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">إحصائياتي</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {/* Tasks */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">المهام</p>
                  <p className="text-lg font-bold text-gray-800">{dashboard?.totalTasksCreated || 0}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">اليوم</p>
                <p className="text-lg font-semibold text-blue-600">+{dashboard?.tasksCreatedToday || 0}</p>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">العملاء</p>
                  <p className="text-lg font-bold text-gray-800">{dashboard?.totalCustomers || 0}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">اليوم</p>
                <p className="text-lg font-semibold text-green-600">+{dashboard?.customersToday || 0}</p>
              </div>
            </div>
          </div>

          {/* Visit Tasks */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">مهام الزيارة</p>
                  <p className="text-lg font-bold text-gray-800">{dashboard?.totalVisitTasks || 0}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">معلقة</p>
                <p className="text-lg font-semibold text-indigo-600">{dashboard?.visitTasksPending || 0}</p>
              </div>
            </div>
          </div>

          {/* Leads */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">العملاء المحتملين</p>
                  <p className="text-lg font-bold text-gray-800">{dashboard?.totalLeads || 0}</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-400">اليوم</p>
                <p className="text-lg font-semibold text-purple-600">+{dashboard?.leadsToday || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
