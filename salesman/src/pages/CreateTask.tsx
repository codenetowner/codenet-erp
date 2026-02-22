import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { ArrowRight, Save, Search, Plus, Minus, Trash2, Package, ShoppingCart, X, Gift, Star, UserPlus, MapPin } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  code: string | null;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  salePrice: number;
  categoryId: number | null;
  imageUrl?: string | null;
  piecesPerBox: number;
  secondUnit: string;
  boxPrice: number;
}

interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitType: 'single' | 'box';
  piecesPerBox: number;
}

interface CustomerPrice {
  productId: number;
  retailPrice: number;
  wholesalePrice: number;
  boxRetailPrice: number;
  boxWholesalePrice: number;
  specialPrice: number | null;
  boxSpecialPrice: number | null;
  hasSpecialPrice: boolean;
  hasBoxSpecialPrice: boolean;
}

export default function CreateTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedCustomerId = searchParams.get('customerId');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showCustomers, setShowCustomers] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPrices, setCustomerPrices] = useState<CustomerPrice[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bonusCart, setBonusCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [showBonusPicker, setShowBonusPicker] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addCustomerLoading, setAddCustomerLoading] = useState(false);
  const [addCustomerForm, setAddCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    customerType: 'retail',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [form, setForm] = useState({
    taskType: 'delivery',
    scheduledDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    notes: '',
  });

  // Quantity selection modal state
  const [qtyModal, setQtyModal] = useState<{ product: Product; unitType: 'single' | 'box' } | null>(null);
  const [customQty, setCustomQty] = useState('');

  useEffect(() => {
    loadCustomers();
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    if (preSelectedCustomerId) {
      loadCustomerById(parseInt(preSelectedCustomerId));
    }
  }, [preSelectedCustomerId]);

  const loadCustomers = async () => {
    try {
      const response = await salesmanApi.getCustomers({ search: customerSearch });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await salesmanApi.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async (categoryId?: number | null, search?: string) => {
    try {
      const params: { search?: string; categoryId?: number } = {};
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      const response = await salesmanApi.getProducts(params);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCustomerById = async (id: number) => {
    try {
      const response = await salesmanApi.getCustomer(id);
      setSelectedCustomer(response.data);
      loadCustomerPrices(id);
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const loadCustomerPrices = async (customerId: number) => {
    try {
      const response = await salesmanApi.getCustomerPrices(customerId);
      setCustomerPrices(response.data);
    } catch (error) {
      console.error('Error loading customer prices:', error);
      setCustomerPrices([]);
    }
  };

  // Get effective price for a product (special price if available, otherwise regular)
  const getEffectivePrice = (product: Product, unitType: 'single' | 'box'): { price: number; isSpecial: boolean } => {
    const customerPrice = customerPrices.find(cp => cp.productId === product.id);
    
    if (unitType === 'box') {
      if (customerPrice?.hasBoxSpecialPrice && customerPrice.boxSpecialPrice != null) {
        return { price: customerPrice.boxSpecialPrice, isSpecial: true };
      }
      return { price: product.salePrice, isSpecial: false };
    } else {
      if (customerPrice?.hasSpecialPrice && customerPrice.specialPrice != null) {
        return { price: customerPrice.specialPrice, isSpecial: true };
      }
      return { price: product.boxPrice, isSpecial: false };
    }
  };

  useEffect(() => {
    if (customerSearch) {
      loadCustomers();
    }
  }, [customerSearch]);

  // Load products when category or search changes
  useEffect(() => {
    loadProducts(selectedCategory, productSearch);
  }, [selectedCategory, productSearch]);

  const addToCart = (product: Product, unitType: 'single' | 'box' = 'single', qty: number = 1) => {
    const { price } = getEffectivePrice(product, unitType);
    const existing = cart.find(item => item.productId === product.id && item.unitType === unitType);
    
    if (existing) {
      setCart(cart.map(item =>
        item.productId === product.id && item.unitType === unitType
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: price,
        unitType,
        piecesPerBox: product.piecesPerBox,
      }]);
    }
  };

  const openQtyModal = (product: Product, unitType: 'single' | 'box') => {
    setQtyModal({ product, unitType });
    setCustomQty('');
  };

  const handleQtySelect = (qty: number) => {
    if (qtyModal) {
      addToCart(qtyModal.product, qtyModal.unitType, qty);
      setQtyModal(null);
      setCustomQty('');
    }
  };

  const getCartQuantity = (productId: number, unitType: 'single' | 'box') => {
    const item = cart.find(i => i.productId === productId && i.unitType === unitType);
    return item?.quantity || 0;
  };

  const updateCartQuantity = (productId: number, unitType: 'single' | 'box', delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId && item.unitType === unitType) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: number, unitType: 'single' | 'box') => {
    setCart(cart.filter(item => !(item.productId === productId && item.unitType === unitType)));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const getBonusCredit = () => {
    return (getTotal() * discountPercent) / 100;
  };

  const getBonusTotal = () => {
    return bonusCart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const getRemainingCredit = () => {
    return getBonusCredit() - getBonusTotal();
  };

  // Extra amount that exceeds the credit - gets added to the bill
  const getExtraCharge = () => {
    const remaining = getRemainingCredit();
    return remaining < 0 ? Math.abs(remaining) : 0;
  };

  // Final total customer pays = cart total + extra charge
  const getFinalTotal = () => {
    return getTotal() + getExtraCharge();
  };

  const addToBonusCart = (product: Product, unitType: 'single' | 'box' = 'single') => {
    const { price } = getEffectivePrice(product, unitType);
    
    // Allow adding even if exceeds credit - extra will be charged
    const existing = bonusCart.find(item => item.productId === product.id && item.unitType === unitType);
    
    if (existing) {
      setBonusCart(bonusCart.map(item =>
        item.productId === product.id && item.unitType === unitType
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setBonusCart([...bonusCart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: price,
        unitType,
        piecesPerBox: product.piecesPerBox,
      }]);
    }
    setError('');
  };

  const updateBonusQuantity = (productId: number, unitType: 'single' | 'box', delta: number) => {
    // Allow increasing even if exceeds credit - extra will be charged
    setBonusCart(bonusCart.map(item => {
      if (item.productId === productId && item.unitType === unitType) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
    setError('');
  };

  const removeFromBonusCart = (productId: number, unitType: 'single' | 'box') => {
    setBonusCart(bonusCart.filter(item => !(item.productId === productId && item.unitType === unitType)));
  };

  const handleAddCustomer = async () => {
    if (!addCustomerForm.name.trim()) {
      setError('اسم العميل مطلوب');
      return;
    }
    setAddCustomerLoading(true);
    setError('');
    try {
      const res = await salesmanApi.createCustomer(addCustomerForm);
      const newCustomer = res.data;
      setSelectedCustomer({ id: newCustomer.id, name: newCustomer.name, code: newCustomer.code || null });
      loadCustomerPrices(newCustomer.id);
      setShowAddCustomer(false);
      setAddCustomerForm({ name: '', phone: '', address: '', customerType: 'retail', latitude: null, longitude: null });
      loadCustomers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'حدث خطأ في إضافة العميل');
    } finally {
      setAddCustomerLoading(false);
    }
  };

  const getAddCustomerLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAddCustomerForm(f => ({
            ...f,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (err) => console.error('Error getting location:', err)
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setError('يرجى اختيار عميل');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Combine regular items and bonus items (bonus items have unitPrice = 0)
      const allItems = [
        ...cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitType: item.unitType === 'box' ? 'Box' : 'Piece',
          isBonus: false,
        })),
        ...bonusCart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: 0, // Bonus items are free
          unitType: item.unitType === 'box' ? 'Box' : 'Piece',
          isBonus: true,
        })),
      ];

      await salesmanApi.createTask({
        customerId: selectedCustomer.id,
        taskType: form.taskType,
        scheduledDate: form.scheduledDate,
        priority: form.priority,
        notes: form.notes,
        discountPercent: discountPercent,
        extraCharge: getExtraCharge(),
        items: allItems,
      });
      navigate('/tasks');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-gray-100">
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">إنشاء مهمة جديدة</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-600" />
              <label className="text-sm font-medium text-gray-700">المنتجات</label>
            </div>
            {cart.length > 0 && (
              <div className="flex items-center gap-2 bg-primary-50 px-3 py-1 rounded-full">
                <ShoppingCart className="h-4 w-4 text-primary-600" />
                <span className="text-sm font-medium text-primary-600">{cart.reduce((sum, i) => sum + i.quantity, 0)} منتج</span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="p-3 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                placeholder="ابحث عن منتج..."
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="border-b overflow-x-auto">
            <div className="flex p-2 gap-2 min-w-max">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === null
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                الكل
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid - Card Style */}
          <div className="p-3 max-h-[400px] overflow-y-auto bg-gray-50">
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const singleQty = getCartQuantity(product.id, 'single');
                  const boxQty = getCartQuantity(product.id, 'box');
                  const totalQty = singleQty + boxQty;
                  const singlePrice = getEffectivePrice(product, 'single');
                  const boxPrice = getEffectivePrice(product, 'box');
                  
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col relative"
                    >
                      {/* Quantity Badge */}
                      {totalQty > 0 && (
                        <span className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                          {totalQty}
                        </span>
                      )}
                      
                      {/* Special Price Badge */}
                      {(singlePrice.isSpecial || boxPrice.isSpecial) && (
                        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500 text-white flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5 fill-white" />
                          خاص
                        </span>
                      )}
                      
                      {/* Product Image */}
                      <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-10 w-10 text-gray-300" />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="p-2 flex-1 flex flex-col">
                        <h3 className="font-medium text-xs text-gray-900 line-clamp-2 mb-1 min-h-[2rem]">{product.name}</h3>
                        
                        {/* Price Display */}
                        <div className="mb-2">
                          <p className={`text-sm font-bold ${singlePrice.isSpecial ? 'text-amber-600' : 'text-primary-600'}`}>
                            ${singlePrice.price.toFixed(3)}
                          </p>
                          <p className="text-[10px] text-gray-400">per piece</p>
                          {product.piecesPerBox > 1 && product.boxPrice > 0 && (
                            <p className={`text-[10px] ${boxPrice.isSpecial ? 'text-amber-600' : 'text-green-600'}`}>
                              ${boxPrice.price.toFixed(3)} / box
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Add Buttons */}
                      <div className="p-2 bg-gray-50 border-t flex gap-1">
                        <button
                          type="button"
                          onClick={() => openQtyModal(product, 'single')}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                            singleQty > 0 
                              ? 'bg-primary-600 text-white' 
                              : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          }`}
                        >
                          + قطعة
                          {singleQty > 0 && <span className="bg-white/20 px-1.5 rounded">{singleQty}</span>}
                        </button>
                        {product.piecesPerBox > 1 && product.boxPrice > 0 && (
                          <button
                            type="button"
                            onClick={() => openQtyModal(product, 'box')}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                              boxQty > 0 
                                ? 'bg-green-600 text-white' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            + box
                            {boxQty > 0 && <span className="bg-white/20 px-1.5 rounded">{boxQty}</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">لا توجد منتجات</p>
            )}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t bg-gray-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">المنتجات المختارة ({cart.length})</span>
                <button
                  type="button"
                  onClick={() => setShowProductPicker(!showProductPicker)}
                  className="text-sm text-primary-600 font-medium"
                >
                  {showProductPicker ? 'إخفاء' : 'عرض'}
                </button>
              </div>
              
              {showProductPicker && (
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={`${item.productId}-${item.unitType}`} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{item.productName}</p>
                        <p className="text-gray-500">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${item.unitType === 'box' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.unitType === 'box' ? 'كرتون' : 'قطعة'}
                          </span>
                          {' '}${item.unitPrice.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mr-2">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.unitType, -1)}
                          className="p-1 rounded bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.unitType, 1)}
                          className="p-1 rounded bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId, item.unitType)}
                          className="p-1 rounded text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Discount Slider - Simple */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">هدايا للعميل</span>
                  <span className="text-lg font-bold text-orange-600">{discountPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={discountPercent}
                  onChange={(e) => {
                    const newPercent = parseInt(e.target.value);
                    setDiscountPercent(newPercent);
                    if (newPercent === 0) {
                      setBonusCart([]);
                    }
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                {discountPercent > 0 && (
                  <p className="text-xs text-orange-600 mt-1 text-center">
                    رصيد الهدايا: ${getBonusCredit().toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bonus Products Section - Only show if discount > 0 */}
        {discountPercent > 0 && cart.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-orange-600" />
                <span className="font-bold text-orange-800">اختر الهدايا</span>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${getRemainingCredit() >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {getRemainingCredit() >= 0 ? `متاح: $${getRemainingCredit().toFixed(2)}` : `زيادة: $${Math.abs(getRemainingCredit()).toFixed(2)}`}
              </span>
            </div>

            {/* Selected Bonus Items */}
            {bonusCart.length > 0 && (
              <div className="mb-3 space-y-2">
                {bonusCart.map((item) => (
                  <div key={`bonus-${item.productId}-${item.unitType}`} className="flex items-center justify-between p-2 bg-white rounded-lg text-sm shadow-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-orange-600 text-xs mr-2">({item.unitType === 'box' ? 'كرتون' : 'قطعة'})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateBonusQuantity(item.productId, item.unitType, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center font-bold">{item.quantity}</span>
                      <button type="button" onClick={() => updateBonusQuantity(item.productId, item.unitType, 1)} className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </button>
                      <span className="text-orange-600 font-bold w-16 text-left">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      <button type="button" onClick={() => removeFromBonusCart(item.productId, item.unitType)} className="text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Bonus Button */}
            <button
              type="button"
              onClick={() => setShowBonusPicker(!showBonusPicker)}
              className="w-full py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 flex items-center justify-center gap-2"
            >
              {showBonusPicker ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showBonusPicker ? 'إغلاق' : 'إضافة هدايا'}
            </button>

            {/* Bonus Product Picker - Card Grid */}
            {showBonusPicker && (
              <div className="mt-3 max-h-64 overflow-y-auto bg-white/50 rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2">
                  {products.map((product) => {
                    const singlePrice = getEffectivePrice(product, 'single');
                    return (
                      <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                        {/* Product Image */}
                        <div className="h-16 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Gift className="h-6 w-6 text-orange-300" />
                          )}
                        </div>
                        <div className="p-2">
                          <p className="font-medium text-xs text-gray-800 line-clamp-1 mb-1">{product.name}</p>
                          <p className="text-[10px] text-orange-600 mb-2">${singlePrice.price.toFixed(2)}</p>
                          <div className="flex gap-1">
                            <button 
                              type="button" 
                              onClick={() => addToBonusCart(product, 'single')} 
                              className="flex-1 py-1 rounded text-[10px] font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
                            >
                              + قطعة
                            </button>
                            {product.piecesPerBox > 1 && product.boxPrice > 0 && (
                              <button 
                                type="button" 
                                onClick={() => addToBonusCart(product, 'box')} 
                                className="flex-1 py-1 rounded text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200"
                              >
                                + box
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FINAL INVOICE SUMMARY - Clear and Simple */}
        {cart.length > 0 && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 text-white">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              ملخص الفاتورة
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-90">المنتجات ({cart.reduce((sum, item) => sum + item.quantity, 0)} قطعة)</span>
                <span className="font-bold">${getTotal().toFixed(2)}</span>
              </div>
              
              {bonusCart.length > 0 && (
                <div className="flex justify-between text-orange-200">
                  <span>🎁 هدايا ({bonusCart.reduce((sum, item) => sum + item.quantity, 0)} قطعة)</span>
                  <span className="font-bold">مجاناً</span>
                </div>
              )}
              
              {getExtraCharge() > 0 && (
                <div className="flex justify-between text-yellow-200">
                  <span>+ تكلفة إضافية للهدايا</span>
                  <span className="font-bold">+${getExtraCharge().toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/30 flex justify-between items-center">
              <span className="text-lg">المبلغ المطلوب</span>
              <span className="text-2xl font-bold">${getFinalTotal().toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Customer Selection */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">العميل *</label>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
              <div>
                <p className="font-medium text-primary-700">{selectedCustomer.name}</p>
                {selectedCustomer.code && (
                  <p className="text-xs text-primary-500">{selectedCustomer.code}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerPrices([]);
                }}
                className="text-red-500 text-sm"
              >
                تغيير
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomers(true);
                  }}
                  onFocus={() => setShowCustomers(true)}
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-lg"
                  placeholder="ابحث عن عميل..."
                />
                {showCustomers && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          loadCustomerPrices(customer.id);
                          setShowCustomers(false);
                          setCustomerSearch('');
                        }}
                        className="w-full text-right px-4 py-2 hover:bg-gray-50"
                      >
                        <p className="font-medium">{customer.name}</p>
                        {customer.code && <p className="text-xs text-gray-400">{customer.code}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomer(true)}
                className="px-3 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                title="إضافة عميل جديد"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Add Customer Modal */}
        {showAddCustomer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold text-gray-800">إضافة عميل جديد</h3>
                <button type="button" onClick={() => setShowAddCustomer(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    value={addCustomerForm.name}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    placeholder="أدخل اسم العميل"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={addCustomerForm.phone}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    placeholder="أدخل رقم الهاتف"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <input
                    type="text"
                    value={addCustomerForm.address}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                    placeholder="أدخل العنوان"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع العميل</label>
                  <select
                    value={addCustomerForm.customerType}
                    onChange={(e) => setAddCustomerForm({ ...addCustomerForm, customerType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg"
                  >
                    <option value="retail">تجزئة</option>
                    <option value="wholesale">جملة</option>
                    <option value="distributor">موزع</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={getAddCustomerLocation}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg flex items-center justify-center gap-2 text-gray-600"
                >
                  <MapPin className="h-5 w-5" />
                  {addCustomerForm.latitude ? 'تم تحديد الموقع ✓' : 'تحديد الموقع الحالي'}
                </button>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-lg text-gray-600 font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomer}
                  disabled={addCustomerLoading}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addCustomerLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      حفظ واختيار
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Details */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع المهمة</label>
            <select
              value={form.taskType}
              onChange={(e) => setForm({ ...form, taskType: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            >
              <option value="delivery">توصيل</option>
              <option value="collection">تحصيل</option>
              <option value="return">مرتجع</option>
              <option value="visit">زيارة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ المهمة</label>
            <input
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            >
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>إنشاء المهمة</span>
            </>
          )}
        </button>
      </form>

      {/* Quantity Selection Modal */}
      {qtyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden">
            <div className="bg-primary-600 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{qtyModal.product.name}</h3>
                <p className="text-sm opacity-80">
                  {qtyModal.unitType === 'box' ? 'كرتون (Box)' : 'قطعة (Piece)'}
                </p>
              </div>
              <button onClick={() => setQtyModal(null)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-3 text-center">اختر الكمية</p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {qtyModal.unitType === 'box' ? (
                  // Box: show 1-10
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => handleQtySelect(qty)}
                      className="py-3 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 font-medium transition-colors"
                    >
                      {qty}
                    </button>
                  ))
                ) : (
                  // Piece: show increments up to piecesPerBox, then Box button
                  <>
                    {[1, 6, 12, 18, 24, 30, 36, 42, 48]
                      .filter(qty => qty <= qtyModal.product.piecesPerBox)
                      .map(qty => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => handleQtySelect(qty)}
                          className="py-3 rounded-lg bg-primary-100 hover:bg-primary-200 text-primary-800 font-medium transition-colors"
                        >
                          {qty}
                        </button>
                      ))}
                    {/* Box button - adds 1 box instead */}
                    {qtyModal.product.piecesPerBox > 1 && qtyModal.product.boxPrice > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          addToCart(qtyModal.product, 'box', 1);
                          setQtyModal(null);
                          setCustomQty('');
                        }}
                        className="py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors col-span-2"
                      >
                        📦 Box
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  placeholder="كمية أخرى..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-center"
                  min="1"
                />
                <button
                  type="button"
                  onClick={() => {
                    const qty = parseInt(customQty);
                    if (qty > 0) handleQtySelect(qty);
                  }}
                  disabled={!customQty || parseInt(customQty) <= 0}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
