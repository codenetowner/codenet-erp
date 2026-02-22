import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { ArrowRight, Save, MapPin } from 'lucide-react';

export default function AddCustomer() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
    customerType: 'retail',
    notes: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('اسم العميل مطلوب');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await salesmanApi.createCustomer(form);
      navigate('/customers');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm({
            ...form,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  // Parse Google Maps link to extract lat/lng
  const parseGoogleMapsLink = (url: string) => {
    try {
      const patterns = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/,           // /@lat,lng
        /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,      // ?q=lat,lng
        /\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/,   // /place/lat,lng
        /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,         // ll=lat,lng
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/        // !3d lat !4d lng
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          setForm({ ...form, latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) });
          return;
        }
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-100">
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">إضافة عميل جديد</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="أدخل اسم العميل"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="أدخل رقم الهاتف"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="أدخل البريد الإلكتروني"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="أدخل العنوان"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المنطقة</label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع العميل</label>
          <select
            value={form.customerType}
            onChange={(e) => setForm({ ...form, customerType: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="retail">تجزئة</option>
            <option value="wholesale">جملة</option>
            <option value="distributor">موزع</option>
          </select>
        </div>


        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📍 رابط خرائط جوجل</label>
          <input
            type="text"
            onChange={(e) => parseGoogleMapsLink(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="الصق رابط خرائط جوجل هنا"
          />
          <span className="text-xs text-gray-500">أو</span>
        </div>
        <div>
          <button
            type="button"
            onClick={getLocation}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg flex items-center justify-center gap-2 text-gray-600"
          >
            <MapPin className="h-5 w-5" />
            {form.latitude ? `تم تحديد الموقع ✓ (${form.latitude.toFixed(4)}, ${form.longitude?.toFixed(4)})` : 'تحديد الموقع الحالي'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>حفظ العميل</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
