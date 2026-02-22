import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salesmanApi } from '../lib/api';
import { ArrowRight, Package, Tag, Box } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  unitName: string | null;
  salePrice: number;
  wholesalePrice: number | null;
  imageUrl: string | null;
  description: string | null;
  piecesPerBox: number;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProduct(parseInt(id));
    }
  }, [id]);

  const loadProduct = async (productId: number) => {
    try {
      const response = await salesmanApi.getProduct(productId);
      setProduct(response.data);
    } catch (error) {
      console.error('Error loading product:', error);
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

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">المنتج غير موجود</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-gray-100"
        >
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">تفاصيل المنتج</h1>
      </div>

      {/* Product Image */}
      <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-16 w-16 text-gray-300" />
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
          {product.categoryName && (
            <p className="text-sm text-gray-500 mt-1">{product.categoryName}</p>
          )}
        </div>

        {product.description && (
          <p className="text-gray-600">{product.description}</p>
        )}

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="bg-primary-50 rounded-lg p-3">
            <p className="text-xs text-primary-600">سعر البيع</p>
            <p className="text-xl font-bold text-primary-700">${product.salePrice.toFixed(2)}</p>
          </div>
          {product.piecesPerBox > 1 && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600">سعر القطعة الواحدة</p>
              <p className="text-xl font-bold text-green-700">${(product.salePrice / product.piecesPerBox).toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3 pt-4 border-t">
          {product.sku && (
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">رمز المنتج</p>
                <p className="text-gray-800">{product.sku}</p>
              </div>
            </div>
          )}
          {product.barcode && (
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">الباركود</p>
                <p className="text-gray-800">{product.barcode}</p>
              </div>
            </div>
          )}
          {product.unitName && (
            <div className="flex items-center gap-3">
              <Box className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">الوحدة</p>
                <p className="text-gray-800">{product.unitName}</p>
              </div>
            </div>
          )}
          {product.piecesPerBox > 1 && (
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">القطع في الكرتون</p>
                <p className="text-gray-800">{product.piecesPerBox}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
