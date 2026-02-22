import { Outlet, NavLink } from 'react-router-dom';
import { Home, Package, Users, UserPlus, ClipboardList, User } from 'lucide-react';

export default function Layout() {
  const navItems = [
    { path: '/', icon: Home, label: 'الرئيسية' },
    { path: '/products', icon: Package, label: 'المنتجات' },
    { path: '/customers', icon: Users, label: 'العملاء' },
    { path: '/leads', icon: UserPlus, label: 'العملاء المحتملين' },
    { path: '/tasks', icon: ClipboardList, label: 'المهام' },
    { path: '/profile', icon: User, label: 'الملف' },
  ];

  return (
    <div className="min-h-screen pb-20 rtl">
      <main className="p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-3 py-2 text-xs ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
