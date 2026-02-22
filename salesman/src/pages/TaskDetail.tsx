import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { ArrowRight, ClipboardList, User, Calendar, MapPin, Phone, Package } from 'lucide-react';

interface TaskItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface TaskDetail {
  id: number;
  taskNumber: string;
  taskType: string;
  customerId: number | null;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  driverName: string | null;
  scheduledDate: string;
  status: string;
  priority: string | null;
  total: number;
  notes: string | null;
  createdAt: string;
  items: TaskItem[];
}

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTask(parseInt(id));
    }
  }, [id]);

  const loadTask = async (taskId: number) => {
    try {
      const response = await salesmanApi.getTask(taskId);
      setTask(response.data);
    } catch (error) {
      console.error('Error loading task:', error);
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">المهمة غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-100">
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">تفاصيل المهمة</h1>
      </div>

      {/* Task Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-gray-400">{task.taskNumber}</p>
            <h2 className="text-lg font-bold text-gray-800">{task.customerName || 'بدون عميل'}</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(task.status)}`}>
            {getStatusText(task.status)}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-gray-600">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span>{new Date(task.scheduledDate).toLocaleDateString('ar')}</span>
          </div>

          {task.driverName ? (
            <div className="flex items-center gap-3 text-gray-600">
              <User className="h-5 w-5 text-gray-400" />
              <span>{task.driverName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-orange-500">
              <User className="h-5 w-5" />
              <span>بانتظار تعيين سائق</span>
            </div>
          )}

          {task.customerAddress && (
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="h-5 w-5 text-gray-400" />
              <span>{task.customerAddress}</span>
            </div>
          )}

          {task.customerPhone && (
            <a href={`tel:${task.customerPhone}`} className="flex items-center gap-3 text-gray-600">
              <Phone className="h-5 w-5 text-gray-400" />
              <span>{task.customerPhone}</span>
            </a>
          )}
        </div>

        {task.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">ملاحظات</p>
            <p className="text-gray-700 mt-1">{task.notes}</p>
          </div>
        )}
      </div>

      {/* Task Items */}
      {task.items && task.items.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            المنتجات
          </h3>
          <div className="space-y-3">
            {task.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{item.productName}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} × ${item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold text-primary-600">${item.subtotal.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <span className="font-semibold text-gray-800">الإجمالي</span>
            <span className="text-xl font-bold text-primary-600">${task.total.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
