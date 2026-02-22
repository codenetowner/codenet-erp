import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { salesmanApi } from '../lib/api';
import { User, Phone, Mail, Building, LogOut } from 'lucide-react';

interface Profile {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  companyName: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await salesmanApi.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      logout();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const displayProfile = profile || user;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">الملف الشخصي</h1>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-primary-600" />
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-800">{displayProfile?.name}</h2>
          <p className="text-gray-500">مندوب مبيعات</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">اسم المستخدم</p>
              <p className="text-gray-800">{displayProfile?.username}</p>
            </div>
          </div>

          {profile?.phone && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">رقم الهاتف</p>
                <p className="text-gray-800">{profile.phone}</p>
              </div>
            </div>
          )}

          {profile?.email && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">البريد الإلكتروني</p>
                <p className="text-gray-800">{profile.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Building className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">الشركة</p>
              <p className="text-gray-800">{profile?.companyName || displayProfile?.companyName}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
      >
        <LogOut className="h-5 w-5" />
        <span>تسجيل الخروج</span>
      </button>
    </div>
  );
}
