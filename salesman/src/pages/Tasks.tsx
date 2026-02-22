import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { ClipboardList, Plus, Calendar, User, Clock, MapPin, CheckCircle } from 'lucide-react';

interface Task {
  id: number;
  taskNumber: string;
  taskType: string;
  customerName: string | null;
  driverName: string | null;
  scheduledDate: string;
  status: string;
  priority: string | null;
  total: number;
  createdAt: string;
  customerAddress?: string | null;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [markingVisited, setMarkingVisited] = useState<number | null>(null);

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const params = filter ? { status: filter } : undefined;
      const response = await salesmanApi.getTasks(params);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkVisited = async (taskId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMarkingVisited(taskId);
    try {
      await salesmanApi.markTaskVisited(taskId);
      loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.message || 'فشل في تحديث المهمة');
    } finally {
      setMarkingVisited(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-600';
      case 'In Progress': return 'bg-blue-100 text-blue-600';
      case 'Completed': return 'bg-green-100 text-green-600';
      case 'Delivered': return 'bg-green-100 text-green-600';
      case 'Cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending': return 'معلقة';
      case 'In Progress': return 'قيد التنفيذ';
      case 'Completed': return 'مكتملة';
      case 'Delivered': return 'تم التسليم';
      case 'Cancelled': return 'ملغاة';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">المهام</h1>
        <Link
          to="/tasks/create"
          className="bg-primary-600 text-white p-2 rounded-lg"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['', 'Pending', 'In Progress', 'Completed'].map((status) => (
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
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد مهام</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-400">{task.taskNumber}</p>
                  <h3 className="font-semibold text-gray-800">{task.customerName || 'بدون عميل'}</h3>
                  {task.taskType === 'Customer Visit' && (
                    <div className="flex items-center gap-1 text-indigo-600 text-xs mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>زيارة عميل</span>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(task.status)}`}>
                  {getStatusText(task.status)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(task.scheduledDate).toLocaleDateString('ar')}</span>
                </div>
                {task.taskType !== 'Customer Visit' && task.driverName ? (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{task.driverName}</span>
                  </div>
                ) : task.taskType !== 'Customer Visit' ? (
                  <span className="text-orange-500 text-xs">بانتظار تعيين سائق</span>
                ) : null}
              </div>

              {/* Visit button for Customer Visit tasks */}
              {task.taskType === 'Customer Visit' && task.status === 'Pending' && (
                <button
                  onClick={(e) => handleMarkVisited(task.id, e)}
                  disabled={markingVisited === task.id}
                  className="w-full mt-3 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {markingVisited === task.id ? 'جاري التحديث...' : 'تم الزيارة'}
                </button>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(task.createdAt).toLocaleDateString('ar')}</span>
                </div>
                {task.total > 0 && <span className="font-bold text-primary-600">${task.total.toFixed(2)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
