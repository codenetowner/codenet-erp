import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit, Trash2, X, Loader2, Package, AlertTriangle, CheckCircle, Eye, TrendingUp, Warehouse, Truck, FileText, Printer, Check, Barcode, Image, Download, Upload, ArrowUpDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { productsApi, categoriesApi, warehousesApi, unitsApi, currenciesApi } from '../lib/api'
import api from '../lib/api'
import { PERMISSIONS } from '../contexts/PermissionContext'
import { PermissionGate } from '../components/PermissionGate'

interface WarehouseInventory {
  warehouseId: number
  warehouseName: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  lastCountedAt: string | null
  updatedAt: string
}

interface VanInventoryItem {
  vanId: number
  vanName: string
  plateNumber: string | null
  quantity: number
  loadedAt: string
  updatedAt: string
}

interface ProductInventory {
  productId: number
  productName: string
  productSku: string
  baseUnit: string
  secondUnit: string | null
  unitsPerSecond: number
  lowStockAlert: number
  totalQuantity: number
  totalWarehouseQuantity: number
  totalVanQuantity: number
  totalReservedQuantity: number
  totalAvailableQuantity: number
  warehouseInventory: WarehouseInventory[]
  vanInventory: VanInventoryItem[]
  isLowStock: boolean
}

interface CostHistoryEntry {
  id: number
  supplierName: string
  cost: number
  recordedDate: string
  notes: string | null
}

interface ProductSalesData {
  totalQuantitySold: number
  totalRevenue: number
  totalCost: number
  profit: number
  orderCount: number
}

interface ProductReportOptions {
  showSummary: boolean
  showPricing: boolean
  showInventory: boolean
  showCostTimeline: boolean
  showSalesHistory: boolean
}

interface ProductVariant {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  retailPrice: number | null
  wholesalePrice: number | null
  costPrice: number | null
  boxRetailPrice: number | null
  boxWholesalePrice: number | null
  boxCostPrice: number | null
  imageUrl: string | null
  color: string | null
  size: string | null
  weight: number | null
  length: number | null
  height: number | null
  quantity: number
  isActive: boolean
}

interface Product {
  id: number
  sku: string
  barcode: string | null
  boxBarcode: string | null
  name: string
  nameAr?: string | null
  description: string | null
  categoryId: number | null
  categoryName: string | null
  imageUrl: string | null
  baseUnit: string
  secondUnit: string | null
  unitsPerSecond: number
  currency: string
  defaultWarehouseId: number | null
  defaultWarehouseName: string | null
  retailPrice: number
  wholesalePrice: number
  superWholesalePrice: number
  costPrice: number
  boxRetailPrice: number
  boxWholesalePrice: number
  boxSuperWholesalePrice: number
  boxCostPrice: number
  lowStockAlert: number
  lowStockAlertBox: number
  isActive: boolean
  showInOnlineShop: boolean
  color?: string
  size?: string
  weight?: number
  length?: number
  height?: number
  variants?: ProductVariant[]
}

interface Category { id: number; name: string }
interface Warehouse { id: number; name: string }
interface Unit { id: number; name: string; symbol: string | null; isActive: boolean }
interface Currency { id: number; code: string; name: string; symbol: string; exchangeRate: number; isBase: boolean; isActive: boolean }

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [_showAdvanced, setShowAdvanced] = useState(false)
  void _showAdvanced
  const [showSecondUnit, setShowSecondUnit] = useState(false)
  const [showCostTimeline, setShowCostTimeline] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [costHistory, setCostHistory] = useState<CostHistoryEntry[]>([])
  const [loadingCostHistory, setLoadingCostHistory] = useState(false)
  
  // Inventory Modal State
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [inventoryData, setInventoryData] = useState<ProductInventory | null>(null)
  const [loadingInventory, setLoadingInventory] = useState(false)
  
  // Report State
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportProduct, setReportProduct] = useState<Product | null>(null)
  const [reportCostHistory, setReportCostHistory] = useState<CostHistoryEntry[]>([])
  const [reportInventory, setReportInventory] = useState<ProductInventory | null>(null)
  const [reportSalesData, setReportSalesData] = useState<ProductSalesData | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportOptions, setReportOptions] = useState<ProductReportOptions>({
    showSummary: true,
    showPricing: true,
    showInventory: true,
    showCostTimeline: true,
    showSalesHistory: true
  })
  const chartRef = useRef<HTMLDivElement>(null)
  
  const [formData, setFormData] = useState({
    sku: '', barcode: '', boxBarcode: '', name: '', nameAr: '', description: '', categoryId: '',
    baseUnit: 'Piece', secondUnit: '', unitsPerSecond: 0, currency: 'USD', defaultWarehouseId: '',
    retailPrice: 0, wholesalePrice: 0, superWholesalePrice: 0, costPrice: 0,
    boxRetailPrice: 0, boxWholesalePrice: 0, boxSuperWholesalePrice: 0, boxCostPrice: 0,
    isActive: true, showInOnlineShop: false, imageUrl: '',
    color: '', size: '', weight: '', length: '', height: '',
    initialQuantity: 0, initialQuantityBox: 0
  })
  const [existingProductStock, setExistingProductStock] = useState<{ baseQty: number; boxQty: number; warehouseName: string } | null>(null)
  
  // Quick Stock Adjust
  const [showQuickAdjust, setShowQuickAdjust] = useState(false)
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<Product | null>(null)
  const [quickAdjustType, setQuickAdjustType] = useState<'add' | 'subtract'>('add')
  const [quickAdjustQty, setQuickAdjustQty] = useState('')
  const [quickAdjustSecondQty, setQuickAdjustSecondQty] = useState('')
  const [quickAdjustWarehouse, setQuickAdjustWarehouse] = useState<number | ''>('')
  const [quickAdjustReason, setQuickAdjustReason] = useState('')
  const [quickAdjustSaving, setQuickAdjustSaving] = useState(false)
  const [quickAdjustVariants, setQuickAdjustVariants] = useState<ProductVariant[]>([])
  const [quickAdjustVariantId, setQuickAdjustVariantId] = useState<number | ''>('')
  const [quickAdjustLoadingVariants, setQuickAdjustLoadingVariants] = useState(false)

  const handleQuickAdjust = async (product: Product) => {
    setQuickAdjustProduct(product)
    setQuickAdjustType('add')
    setQuickAdjustQty('')
    setQuickAdjustSecondQty('')
    setQuickAdjustWarehouse(warehouses.length === 1 ? (warehouses[0] as any).id : '')
    setQuickAdjustReason('')
    setQuickAdjustVariantId('')
    setQuickAdjustVariants([])
    setShowQuickAdjust(true)
    // Load variants if product has any
    if (product.variants && product.variants.length > 0) {
      setQuickAdjustLoadingVariants(true)
      try {
        const res = await productsApi.getVariants(product.id)
        setQuickAdjustVariants(res.data)
      } catch {}
      finally { setQuickAdjustLoadingVariants(false) }
    }
  }

  const submitQuickAdjust = async () => {
    if (!quickAdjustProduct || !quickAdjustWarehouse || !quickAdjustQty) return
    setQuickAdjustSaving(true)
    try {
      await productsApi.adjustStock({
        productId: quickAdjustProduct.id,
        warehouseId: quickAdjustWarehouse,
        variantId: quickAdjustVariantId !== '' ? quickAdjustVariantId : null,
        adjustmentType: quickAdjustType,
        baseUnitQuantity: parseFloat(quickAdjustQty) || 0,
        secondUnitQuantity: quickAdjustSecondQty ? parseFloat(quickAdjustSecondQty) : null,
        reason: quickAdjustReason || null,
      })
      setShowQuickAdjust(false)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to adjust stock')
    } finally {
      setQuickAdjustSaving(false)
    }
  }

  // Variants Modal
  const [showVariantsModal, setShowVariantsModal] = useState(false)
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [savingVariant, setSavingVariant] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [variantForm, setVariantForm] = useState({ name: '', sku: '', barcode: '', retailPrice: '', wholesalePrice: '', costPrice: '', boxRetailPrice: '', boxWholesalePrice: '', boxCostPrice: '', color: '', size: '', weight: '', length: '', height: '', quantity: '', isActive: true })

  const openVariantsModal = async (product: Product) => {
    setVariantsProduct(product)
    setVariants(product.variants || [])
    setShowVariantsModal(true)
    setEditingVariant(null)
    resetVariantForm()
    // Reload from server
    setLoadingVariants(true)
    try {
      const res = await productsApi.getVariants(product.id)
      setVariants(res.data)
    } catch (e) {
      console.error('Failed to load variants:', e)
    } finally {
      setLoadingVariants(false)
    }
  }

  const resetVariantForm = () => {
    setVariantForm({ name: '', sku: '', barcode: '', retailPrice: '', wholesalePrice: '', costPrice: '', boxRetailPrice: '', boxWholesalePrice: '', boxCostPrice: '', color: '', size: '', weight: '', length: '', height: '', quantity: '', isActive: true })
    setEditingVariant(null)
  }

  const editVariant = (v: ProductVariant) => {
    setEditingVariant(v)
    setVariantForm({
      name: v.name,
      sku: v.sku || '',
      barcode: v.barcode || '',
      retailPrice: v.retailPrice?.toString() || '',
      wholesalePrice: v.wholesalePrice?.toString() || '',
      costPrice: v.costPrice?.toString() || '',
      boxRetailPrice: v.boxRetailPrice?.toString() || '',
      boxWholesalePrice: v.boxWholesalePrice?.toString() || '',
      boxCostPrice: v.boxCostPrice?.toString() || '',
      color: v.color || '',
      size: v.size || '',
      weight: v.weight?.toString() || '',
      length: v.length?.toString() || '',
      height: v.height?.toString() || '',
      quantity: v.quantity?.toString() || '',
      isActive: v.isActive
    })
  }

  const saveVariant = async () => {
    if (!variantsProduct) return
    setSavingVariant(true)
    try {
      const payload = {
        name: variantsProduct.name,
        sku: variantForm.sku || null,
        barcode: variantForm.barcode || null,
        retailPrice: variantForm.retailPrice ? parseFloat(variantForm.retailPrice) : null,
        wholesalePrice: variantForm.wholesalePrice ? parseFloat(variantForm.wholesalePrice) : null,
        costPrice: variantForm.costPrice ? parseFloat(variantForm.costPrice) : null,
        boxRetailPrice: variantForm.boxRetailPrice ? parseFloat(variantForm.boxRetailPrice) : null,
        boxWholesalePrice: variantForm.boxWholesalePrice ? parseFloat(variantForm.boxWholesalePrice) : null,
        boxCostPrice: variantForm.boxCostPrice ? parseFloat(variantForm.boxCostPrice) : null,
        color: variantForm.color || null,
        size: variantForm.size || null,
        weight: variantForm.weight ? parseFloat(variantForm.weight) : null,
        length: variantForm.length ? parseFloat(variantForm.length) : null,
        height: variantForm.height ? parseFloat(variantForm.height) : null,
        quantity: variantForm.quantity ? parseFloat(variantForm.quantity) : 0,
        isActive: variantForm.isActive
      }
      if (editingVariant) {
        await productsApi.updateVariant(variantsProduct.id, editingVariant.id, payload)
      } else {
        await productsApi.createVariant(variantsProduct.id, payload)
      }
      // Reload variants
      const res = await productsApi.getVariants(variantsProduct.id)
      setVariants(res.data)
      resetVariantForm()
      loadData() // Refresh products list to update variant counts
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save variant')
    } finally {
      setSavingVariant(false)
    }
  }

  const deleteVariant = async (variantId: number) => {
    if (!variantsProduct || !confirm('Delete this variant?')) return
    try {
      await productsApi.deleteVariant(variantsProduct.id, variantId)
      const res = await productsApi.getVariants(variantsProduct.id)
      setVariants(res.data)
      loadData()
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete variant')
    }
  }

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const uploadImageToCloudinary = async (file: File): Promise<string | null> => {
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)
    formData.append('folder', 'Catalyst/products')
    
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (data.secure_url) {
        return data.secure_url
      }
      return null
    } catch (error) {
      console.error('Image upload failed:', error)
      return null
    }
  }
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }
    
    setUploadingImage(true)
    const imageUrl = await uploadImageToCloudinary(file)
    setUploadingImage(false)
    
    if (imageUrl) {
      setFormData(prev => ({ ...prev, imageUrl }))
    } else {
      alert('Failed to upload image. Please try again.')
    }
  }
  
  // Quick Add Category
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [savingCategory, setSavingCategory] = useState(false)

  // Product Search State
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearchMode, setProductSearchMode] = useState<'new' | 'existing'>('new')

  useEffect(() => { loadData() }, [])

  // Auto-calculate second unit values when first unit values change
  useEffect(() => {
    if (showSecondUnit && formData.unitsPerSecond > 0) {
      setFormData(prev => ({
        ...prev,
        initialQuantityBox: prev.initialQuantity * prev.unitsPerSecond,
        boxCostPrice: parseFloat((prev.costPrice / prev.unitsPerSecond).toFixed(3)),
        boxRetailPrice: parseFloat((prev.retailPrice / prev.unitsPerSecond).toFixed(3)),
        boxWholesalePrice: parseFloat((prev.wholesalePrice / prev.unitsPerSecond).toFixed(3)),
        boxSuperWholesalePrice: parseFloat((prev.superWholesalePrice / prev.unitsPerSecond).toFixed(3))
      }))
    }
  }, [showSecondUnit, formData.initialQuantity, formData.costPrice, formData.retailPrice, formData.wholesalePrice, formData.superWholesalePrice, formData.unitsPerSecond])

  const loadData = async () => {
    try {
      setLoading(true)
      const [prodRes, catRes, whRes, unitsRes, curRes] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
        warehousesApi.getAll(),
        unitsApi.getAll({ activeOnly: true }),
        currenciesApi.getAll()
      ])
      setProducts(prodRes.data)
      setCategories(catRes.data || [])
      setWarehouses(whRes.data || [])
      setUnits(unitsRes.data || [])
      setCurrencies(curRes.data || [])
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode?.toLowerCase().includes(search.toLowerCase())
    const matchesWarehouse = !warehouseFilter || p.defaultWarehouseId?.toString() === warehouseFilter
    return matchesSearch && matchesWarehouse
  })

  const stats = {
    total: products.length,
    active: products.filter(p => p.isActive).length,
    lowStock: 0
  }

  const generateBarcode = () => {
    // Generate EAN-13 format barcode
    const prefix = '200' // Internal use prefix
    const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
    const code = prefix + random
    // Calculate check digit
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3)
    }
    const checkDigit = (10 - (sum % 10)) % 10
    return code + checkDigit
  }

  const resetForm = () => {
    setFormData({
      sku: '', barcode: '', boxBarcode: '', name: '', nameAr: '', description: '', categoryId: '',
      baseUnit: 'Piece', secondUnit: '', unitsPerSecond: 0, currency: 'USD', defaultWarehouseId: '',
      retailPrice: 0, wholesalePrice: 0, superWholesalePrice: 0, costPrice: 0,
      boxRetailPrice: 0, boxWholesalePrice: 0, boxSuperWholesalePrice: 0, boxCostPrice: 0,
      isActive: true, showInOnlineShop: false, imageUrl: '',
      color: '', size: '', weight: '', length: '', height: '',
      initialQuantity: 0, initialQuantityBox: 0
    })
    setShowAdvanced(false)
    setShowSecondUnit(false)
    setExistingProductStock(null)
  }

  const openAddModal = () => {
    resetForm()
    setProductSearchQuery('')
    setShowProductSearch(true)
    setProductSearchMode('new')
    setExistingProductStock(null)
    setShowModal(true)
  }

  const loadProductStock = async (product: Product) => {
    try {
      const invRes = await productsApi.getInventory(product.id)
      const totalQty = invRes.data.totalQuantity || 0
      const whName = invRes.data.warehouseInventory?.[0]?.warehouseName || 'N/A'
      const boxQty = (product.unitsPerSecond && product.unitsPerSecond > 0) ? totalQty * product.unitsPerSecond : 0
      setExistingProductStock({ baseQty: totalQty, boxQty, warehouseName: whName })
    } catch {
      setExistingProductStock({ baseQty: 0, boxQty: 0, warehouseName: 'N/A' })
    }
  }

  const handleProductSearch = (query: string) => {
    setProductSearchQuery(query)
    if (!query.trim()) return
    
    const found = products.find(p => 
      p.barcode === query || 
      p.boxBarcode === query || 
      p.sku.toLowerCase() === query.toLowerCase()
    )
    
    if (found) {
      fillFormFromProduct(found)
      setSelectedProduct(found)
      setProductSearchMode('existing')
      loadProductStock(found)
    }
  }

  const fillFormFromProduct = (product: Product) => {
    setFormData({
      sku: product.sku || '',
      barcode: product.barcode || '',
      boxBarcode: product.boxBarcode || '',
      name: product.name,
      nameAr: product.nameAr || '',
      description: product.description || '',
      categoryId: product.categoryId?.toString() || '',
      baseUnit: product.baseUnit || 'Piece',
      secondUnit: product.secondUnit || '',
      unitsPerSecond: product.unitsPerSecond || 0,
      currency: product.currency || 'USD',
      defaultWarehouseId: product.defaultWarehouseId?.toString() || '',
      retailPrice: product.retailPrice || 0,
      wholesalePrice: product.wholesalePrice || 0,
      superWholesalePrice: product.superWholesalePrice || 0,
      costPrice: product.costPrice || 0,
      boxRetailPrice: product.boxRetailPrice || 0,
      boxWholesalePrice: product.boxWholesalePrice || 0,
      boxSuperWholesalePrice: product.boxSuperWholesalePrice || 0,
      boxCostPrice: product.boxCostPrice || 0,
      isActive: product.isActive,
      showInOnlineShop: product.showInOnlineShop || false,
      imageUrl: product.imageUrl || '',
      color: product.color || '',
      size: product.size || '',
      weight: product.weight?.toString() || '',
      length: product.length?.toString() || '',
      height: product.height?.toString() || '',
      initialQuantity: 0,
      initialQuantityBox: 0
    })
    setShowAdvanced(true)
    setShowSecondUnit(!!(product.secondUnit && product.secondUnit.trim() !== '' && product.unitsPerSecond > 0))
  }

  const selectExistingProduct = (productId: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    fillFormFromProduct(product)
    setSelectedProduct(product)
    setProductSearchMode('existing')
    setShowProductSearch(false)
    loadProductStock(product)
  }

  const startNewProduct = () => {
    resetForm()
    setSelectedProduct(null)
    setProductSearchMode('new')
    setShowProductSearch(false)
  }

  const filteredSearchProducts = products.filter(p => {
    if (!productSearchQuery.trim()) return true
    const q = productSearchQuery.toLowerCase()
    return p.name.toLowerCase().includes(q) || 
           p.sku.toLowerCase().includes(q) || 
           p.barcode?.toLowerCase().includes(q) ||
           p.boxBarcode?.toLowerCase().includes(q)
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate initial quantity requires warehouse
    if ((formData.initialQuantity > 0 || formData.initialQuantityBox > 0) && !formData.defaultWarehouseId) {
      alert('Please select a warehouse to add stock')
      return
    }
    
    setSaving(true)
    try {
      if (selectedProduct && productSearchMode === 'existing') {
        // Existing product: update product info (exclude stock fields - handled by adjustStock)
        const { initialQuantity: _iq, initialQuantityBox: _iqb, ...updateData } = formData
        await productsApi.update(selectedProduct.id, {
          ...updateData,
          categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
          defaultWarehouseId: formData.defaultWarehouseId ? parseInt(formData.defaultWarehouseId) : null,
          initialQuantity: 0,
          initialWarehouseId: null,
          weight: formData.weight ? parseFloat(formData.weight as string) : null,
          length: formData.length ? parseFloat(formData.length as string) : null,
          height: formData.height ? parseFloat(formData.height as string) : null,
        })
        // Increment stock if quantity entered (creates walk-in supplier purchase invoice)
        if ((formData.initialQuantity > 0 || formData.initialQuantityBox > 0) && formData.defaultWarehouseId) {
          await productsApi.adjustStock({
            productId: selectedProduct.id,
            warehouseId: parseInt(formData.defaultWarehouseId),
            variantId: null,
            adjustmentType: 'add',
            baseUnitQuantity: formData.initialQuantity || 0,
            secondUnitQuantity: formData.initialQuantityBox > 0 ? formData.initialQuantityBox : null,
            reason: 'Stock added from Products page',
            createPurchaseInvoice: true,
          })
        }
      } else {
        // New product: create with initial quantity
        await productsApi.create({
          ...formData,
          categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
          defaultWarehouseId: formData.defaultWarehouseId ? parseInt(formData.defaultWarehouseId) : null,
          initialQuantity: formData.initialQuantity || 0,
          initialWarehouseId: formData.defaultWarehouseId ? parseInt(formData.defaultWarehouseId) : null,
          weight: formData.weight ? parseFloat(formData.weight as string) : null,
          length: formData.length ? parseFloat(formData.length as string) : null,
          height: formData.height ? parseFloat(formData.height as string) : null,
        })
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct) return
    setSaving(true)
    try {
      await productsApi.update(selectedProduct.id, {
        ...formData,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        defaultWarehouseId: formData.defaultWarehouseId ? parseInt(formData.defaultWarehouseId) : null,
        weight: formData.weight ? parseFloat(formData.weight as string) : null,
        length: formData.length ? parseFloat(formData.length as string) : null,
        height: formData.height ? parseFloat(formData.height as string) : null,
      })
      setShowEditModal(false)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await productsApi.delete(id)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete product')
    }
  }

  const handleCostTimeline = async (product: Product) => {
    setSelectedProduct(product)
    setShowCostTimeline(true)
    setLoadingCostHistory(true)
    try {
      const res = await productsApi.getCostHistory(product.id)
      setCostHistory(res.data)
    } catch (error) {
      console.error('Failed to load cost history:', error)
      setCostHistory([])
    } finally {
      setLoadingCostHistory(false)
    }
  }

  const handleViewInventory = async (product: Product) => {
    setSelectedProduct(product)
    setShowInventoryModal(true)
    setLoadingInventory(true)
    try {
      const res = await productsApi.getInventory(product.id)
      setInventoryData(res.data)
    } catch (error) {
      console.error('Failed to load inventory:', error)
      setInventoryData(null)
    } finally {
      setLoadingInventory(false)
    }
  }

  const getCostStats = () => {
    if (costHistory.length === 0) return null
    const costs = costHistory.map(h => h.cost)
    const minCost = Math.min(...costs)
    const maxCost = Math.max(...costs)
    const increase = maxCost - minCost
    const increasePercent = minCost > 0 ? ((increase / minCost) * 100).toFixed(1) : '0'
    return { minCost, maxCost, increase, increasePercent }
  }

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setSavingCategory(true)
    try {
      const res = await categoriesApi.create({ name: newCategoryName.trim() })
      const newCat = res.data
      setCategories([...categories, newCat])
      setFormData({ ...formData, categoryId: newCat.id.toString() })
      setNewCategoryName('')
      setShowQuickCategory(false)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create category')
    } finally {
      setSavingCategory(false)
    }
  }

  // Report Functions
  const handleOpenReport = async (product: Product) => {
    setReportProduct(product)
    setShowReportModal(true)
    setLoadingReport(true)
    
    // Fetch each data source independently to prevent one failure from affecting others
    try {
      const costRes = await productsApi.getCostHistory(product.id)
      setReportCostHistory(costRes.data || [])
    } catch (error) {
      console.error('Failed to load cost history:', error)
      setReportCostHistory([])
    }
    
    try {
      const inventoryRes = await productsApi.getInventory(product.id)
      setReportInventory(inventoryRes.data || null)
    } catch (error) {
      console.error('Failed to load inventory:', error)
      setReportInventory(null)
    }
    
    try {
      const salesRes = await api.get(`/reports/product-sales/${product.id}`)
      setReportSalesData(salesRes.data || null)
    } catch (error) {
      console.error('Failed to load sales data:', error)
      setReportSalesData(null)
    }
    
    setLoadingReport(false)
  }

  const formatCurrency = (amount: number, currency?: string) => `${currency || ''} ${amount.toFixed(3)}`.trim()
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

  const generateProductReport = () => {
    if (!reportProduct) return
    
    const costStats = reportCostHistory.length > 0 ? {
      minCost: Math.min(...reportCostHistory.map(h => h.cost)),
      maxCost: Math.max(...reportCostHistory.map(h => h.cost)),
      currentCost: reportProduct.costPrice
    } : null
    
    const printWindow = window.open('', '_blank', 'width=1000,height=800')
    if (!printWindow) {
      alert('Please allow popups to print report')
      return
    }
    
    // Generate cost timeline chart as SVG data points for the report
    const chartPoints = reportCostHistory.length > 0 
      ? reportCostHistory.map((h, i) => ({
          x: (i / Math.max(reportCostHistory.length - 1, 1)) * 100,
          y: costStats ? 100 - ((h.cost - costStats.minCost) / Math.max(costStats.maxCost - costStats.minCost, 1)) * 80 : 50,
          cost: h.cost,
          date: formatDate(h.recordedDate)
        }))
      : []
    
    const svgPath = chartPoints.length > 1 
      ? chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 4} ${p.y}`).join(' ')
      : ''
    
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Product Report - ${reportProduct.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .product-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .product-info h2 { font-size: 18px; margin-bottom: 10px; }
          .product-info .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .product-info .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .product-info .value { font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { border: 1px solid #ddd; padding: 12px; border-radius: 5px; text-align: center; }
          .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }
          .summary-card .value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          .summary-card .value.green { color: #22c55e; }
          .summary-card .value.red { color: #ef4444; }
          .summary-card .value.blue { color: #3b82f6; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .pricing-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px; }
          .pricing-card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
          .pricing-card h3 { background: #f5f5f5; padding: 10px; font-size: 14px; }
          .pricing-card .prices { padding: 15px; }
          .pricing-card .price-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; }
          .chart-container { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
          .chart-container h3 { margin-bottom: 15px; }
          .chart { height: 150px; position: relative; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Product Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="product-info">
          <h2>${reportProduct.name}</h2>
          <div class="grid">
            <div class="item">
              <div class="label">Product Code</div>
              <div class="value">${reportProduct.sku}</div>
            </div>
            <div class="item">
              <div class="label">Barcode</div>
              <div class="value">${reportProduct.barcode || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Category</div>
              <div class="value">${reportProduct.categoryName || '-'}</div>
            </div>
            <div class="item">
              <div class="label">Base Unit</div>
              <div class="value">${reportProduct.baseUnit}</div>
            </div>
            <div class="item">
              <div class="label">Second Unit</div>
              <div class="value">${reportProduct.secondUnit && reportProduct.unitsPerSecond > 0 ? `${reportProduct.secondUnit} (${reportProduct.unitsPerSecond} ${reportProduct.baseUnit}s)` : '-'}</div>
            </div>
            <div class="item">
              <div class="label">Status</div>
              <div class="value">${reportProduct.isActive ? 'Active' : 'Inactive'}</div>
            </div>
          </div>
        </div>
        
        ${reportOptions.showSummary && reportInventory ? `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Stock</div>
            <div class="value blue">${reportInventory.totalQuantity.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="label">In Warehouses</div>
            <div class="value">${reportInventory.totalWarehouseQuantity.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="label">In Vans</div>
            <div class="value">${reportInventory.totalVanQuantity.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="label">Available</div>
            <div class="value green">${reportInventory.totalAvailableQuantity.toLocaleString()}</div>
          </div>
        </div>
        ` : ''}
        
        ${reportOptions.showPricing ? `
        <div class="section">
          <h2>Pricing Information</h2>
          <div class="pricing-grid">
            <div class="pricing-card">
              <h3>${reportProduct.baseUnit} Prices</h3>
              <div class="prices">
                <div class="price-row"><span>Retail Price</span><strong>${formatCurrency(reportProduct.retailPrice, reportProduct.currency)}</strong></div>
                <div class="price-row"><span>Wholesale Price</span><strong>${formatCurrency(reportProduct.wholesalePrice, reportProduct.currency)}</strong></div>
                <div class="price-row"><span>Super Wholesale</span><strong>${formatCurrency(reportProduct.superWholesalePrice, reportProduct.currency)}</strong></div>
                <div class="price-row"><span>Cost Price</span><strong style="color: #ef4444">${formatCurrency(reportProduct.costPrice, reportProduct.currency)}</strong></div>
              </div>
            </div>
            ${reportProduct.secondUnit && reportProduct.unitsPerSecond > 0 ? `
            <div class="pricing-card">
              <h3>${reportProduct.secondUnit} Prices</h3>
              <div class="prices">
                <div class="price-row"><span>Retail Price</span><strong>${formatCurrency(reportProduct.boxRetailPrice, reportProduct.currency)}</strong></div>
                <div class="price-row"><span>Wholesale Price</span><strong>${formatCurrency(reportProduct.boxWholesalePrice, reportProduct.currency)}</strong></div>
                <div class="price-row"><span>Super Wholesale</span><strong>${formatCurrency(reportProduct.boxSuperWholesalePrice, reportProduct.currency)}</strong></div>
                <div class="price-row"><span>Cost Price</span><strong style="color: #ef4444">${formatCurrency(reportProduct.boxCostPrice, reportProduct.currency)}</strong></div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        ${reportOptions.showCostTimeline && reportCostHistory.length > 0 ? `
        <div class="section">
          <h2>Cost Timeline</h2>
          <div class="chart-container">
            <svg width="100%" height="150" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
                  <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
                </linearGradient>
              </defs>
              ${svgPath ? `<path d="${svgPath}" fill="none" stroke="#3b82f6" stroke-width="2" />` : ''}
              ${chartPoints.map(p => `<circle cx="${p.x * 4}" cy="${p.y}" r="4" fill="#3b82f6" />`).join('')}
            </svg>
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; color: #666;">
              ${chartPoints.length > 0 ? `<span>${chartPoints[0].date}</span>` : ''}
              ${chartPoints.length > 1 ? `<span>${chartPoints[chartPoints.length - 1].date}</span>` : ''}
            </div>
          </div>
          ${costStats ? `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;">
            <div style="text-align: center; padding: 10px; background: #f0fdf4; border-radius: 5px;">
              <div style="font-size: 10px; color: #666;">Min Cost</div>
              <div style="font-size: 16px; font-weight: bold; color: #22c55e;">${formatCurrency(costStats.minCost, reportProduct.currency)}</div>
            </div>
            <div style="text-align: center; padding: 10px; background: #fef2f2; border-radius: 5px;">
              <div style="font-size: 10px; color: #666;">Max Cost</div>
              <div style="font-size: 16px; font-weight: bold; color: #ef4444;">${formatCurrency(costStats.maxCost, reportProduct.currency)}</div>
            </div>
            <div style="text-align: center; padding: 10px; background: #eff6ff; border-radius: 5px;">
              <div style="font-size: 10px; color: #666;">Current Cost</div>
              <div style="font-size: 16px; font-weight: bold; color: #3b82f6;">${formatCurrency(costStats.currentCost, reportProduct.currency)}</div>
            </div>
          </div>
          ` : ''}
          <table style="margin-top: 15px;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th class="text-right">Cost</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportCostHistory.map(entry => `
                <tr>
                  <td>${formatDate(entry.recordedDate)}</td>
                  <td>${entry.supplierName}</td>
                  <td class="text-right">${formatCurrency(entry.cost)}</td>
                  <td>${entry.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        ${reportOptions.showInventory && reportInventory ? `
        <div class="section">
          <h2>Inventory Details</h2>
          ${reportInventory.warehouseInventory.length > 0 ? `
          <h3 style="font-size: 14px; margin: 10px 0;">Warehouse Stock</h3>
          <table>
            <thead>
              <tr>
                <th>Warehouse</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Reserved</th>
                <th class="text-right">Available</th>
              </tr>
            </thead>
            <tbody>
              ${reportInventory.warehouseInventory.map(wh => `
                <tr>
                  <td>${wh.warehouseName}</td>
                  <td class="text-right">${wh.quantity.toLocaleString()}</td>
                  <td class="text-right">${wh.reservedQuantity.toLocaleString()}</td>
                  <td class="text-right" style="color: #22c55e; font-weight: bold;">${wh.availableQuantity.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
          ${reportInventory.vanInventory.length > 0 ? `
          <h3 style="font-size: 14px; margin: 15px 0 10px;">Van Stock</h3>
          <table>
            <thead>
              <tr>
                <th>Van</th>
                <th>Plate Number</th>
                <th class="text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${reportInventory.vanInventory.map(van => `
                <tr>
                  <td>${van.vanName}</td>
                  <td>${van.plateNumber || '-'}</td>
                  <td class="text-right" style="color: #8b5cf6; font-weight: bold;">${van.quantity.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </div>
        ` : ''}
        
        ${reportOptions.showSalesHistory && reportSalesData ? `
        <div class="section">
          <h2>Sales Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Orders</div>
              <div class="value">${reportSalesData.orderCount}</div>
            </div>
            <div class="summary-card">
              <div class="label">Qty Sold</div>
              <div class="value blue">${reportSalesData.totalQuantitySold.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="label">Revenue</div>
              <div class="value">${formatCurrency(reportSalesData.totalRevenue)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Profit</div>
              <div class="value green">${formatCurrency(reportSalesData.profit)}</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Catalyst Product Report - Confidential</p>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(reportHTML)
    printWindow.document.close()
    
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
    }
  }

  const [importResult, setImportResult] = useState<any>(null)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [bulkAssignCategory, setBulkAssignCategory] = useState<number | ''>('')
  const [bulkAssignWarehouse, setBulkAssignWarehouse] = useState<number | ''>('')
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set())

  const handleExportTemplate = () => {
    const templateHeaders = [
      'SKU', 'Name', 'Description', 'Category', 'Barcode', 'BoxBarcode',
      'BaseUnit', 'SecondUnit', 'UnitsPerSecond', 'Currency',
      'RetailPrice', 'WholesalePrice', 'SuperWholesalePrice', 'CostPrice',
      'BoxRetailPrice', 'BoxWholesalePrice', 'BoxSuperWholesalePrice', 'BoxCostPrice',
      'LowStockAlert', 'LowStockAlertBox', 'InitialStock', 'Warehouse'
    ]
    const exampleRow = [
      'SKU-001', 'Sample Product', 'Product description', 'Category Name', '1234567890', '',
      'Piece', 'Box', 12, 'USD',
      10.00, 8.00, 7.00, 5.00,
      120.00, 96.00, 84.00, 60.00,
      10, 2, 100, 'Main Warehouse'
    ]
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, exampleRow])
    // Set column widths
    ws['!cols'] = templateHeaders.map(h => ({ wch: Math.max(h.length + 2, 15) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, 'products_import_template.xlsx')
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected

    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)

      if (rows.length === 0) {
        alert('Excel file is empty')
        return
      }

      const str = (v: any) => v == null ? '' : String(v).trim()
      const num = (v: any, def = 0) => { const n = Number(v); return isNaN(n) ? def : n }

      const products = rows.map(row => ({
        sku: str(row['SKU'] ?? row['sku']),
        name: str(row['Name'] ?? row['name']),
        description: str(row['Description'] ?? row['description']),
        categoryName: str(row['Category'] ?? row['category'] ?? row['CategoryName']),
        barcode: str(row['Barcode'] ?? row['barcode']),
        boxBarcode: str(row['BoxBarcode'] ?? row['boxBarcode']),
        baseUnit: str(row['BaseUnit'] ?? row['baseUnit']) || 'Piece',
        secondUnit: str(row['SecondUnit'] ?? row['secondUnit']),
        unitsPerSecond: num(row['UnitsPerSecond'] ?? row['unitsPerSecond'], 1),
        currency: str(row['Currency'] ?? row['currency']) || 'USD',
        retailPrice: num(row['RetailPrice'] ?? row['retailPrice']),
        wholesalePrice: num(row['WholesalePrice'] ?? row['wholesalePrice']),
        superWholesalePrice: num(row['SuperWholesalePrice'] ?? row['superWholesalePrice']),
        costPrice: num(row['CostPrice'] ?? row['costPrice']),
        boxRetailPrice: num(row['BoxRetailPrice'] ?? row['boxRetailPrice']),
        boxWholesalePrice: num(row['BoxWholesalePrice'] ?? row['boxWholesalePrice']),
        boxSuperWholesalePrice: num(row['BoxSuperWholesalePrice'] ?? row['boxSuperWholesalePrice']),
        boxCostPrice: num(row['BoxCostPrice'] ?? row['boxCostPrice']),
        lowStockAlert: num(row['LowStockAlert'] ?? row['lowStockAlert'], 10),
        lowStockAlertBox: num(row['LowStockAlertBox'] ?? row['lowStockAlertBox'], 2),
        initialStock: num(row['InitialStock'] ?? row['initialStock'] ?? row['Stock'] ?? row['stock'] ?? row['Quantity'] ?? row['quantity']),
        warehouseName: str(row['Warehouse'] ?? row['warehouse'] ?? row['WarehouseName']),
      }))

      const res = await productsApi.bulkImport({ products })
      setImportResult(res.data)
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to import products')
    }
  }

  const toggleSelectProduct = (id: number) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const handleBulkAssign = async () => {
    if (!bulkAssignCategory && !bulkAssignWarehouse) {
      alert('Please select at least a category or warehouse')
      return
    }
    if (selectedProducts.size === 0) {
      alert('Please select at least one product')
      return
    }
    setBulkAssigning(true)
    try {
      const res = await productsApi.bulkAssign({
        categoryId: bulkAssignCategory || null,
        warehouseId: bulkAssignWarehouse || null,
        productIds: Array.from(selectedProducts),
      })
      alert(res.data.message)
      setShowBulkAssign(false)
      setSelectedProducts(new Set())
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to bulk assign')
    } finally {
      setBulkAssigning(false)
    }
  }

  const handleBulkOnlineShop = async (show: boolean) => {
    const target = selectedProducts.size > 0 ? 'selected' : 'all active'
    if (!confirm(`${show ? 'Show' : 'Hide'} ${target} products in online store?`)) return
    try {
      const res = await productsApi.bulkOnlineShop({
        showInOnlineShop: show,
        productIds: selectedProducts.size > 0 ? Array.from(selectedProducts) : null,
      })
      alert(res.data.message)
      setSelectedProducts(new Set())
      loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update')
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={32} /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportTemplate} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200">
            <Download size={18} /> Excel Template
          </button>
          <PermissionGate permission={PERMISSIONS.CREATE_PRODUCTS}>
            <label className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 border border-orange-200 cursor-pointer">
              <Upload size={18} /> Import Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
            </label>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.CREATE_PRODUCTS}>
            <button onClick={() => { if (selectedProducts.size === 0) { alert('Please select products first using the checkboxes'); return; } setShowBulkAssign(true) }} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${selectedProducts.size > 0 ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700' : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'}`}>
              <Warehouse size={18} /> Bulk Assign {selectedProducts.size > 0 && `(${selectedProducts.size})`}
            </button>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.CREATE_PRODUCTS}>
            <button onClick={() => handleBulkOnlineShop(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 border border-teal-200">
              <Eye size={18} /> {selectedProducts.size > 0 ? `Show (${selectedProducts.size}) in Store` : 'Show All in Store'}
            </button>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.CREATE_PRODUCTS}>
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
              <Plus size={20} /> Add or Edit Product
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Import Result Banner */}
      {importResult && (
        <div className={`mb-4 p-4 rounded-lg border ${
          importResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{importResult.message}</p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  {importResult.errors.slice(0, 5).map((e: string, i: number) => <li key={i}>• {e}</li>)}
                  {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more</li>}
                </ul>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* Selection Toolbar */}
      {selectedProducts.size > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check size={18} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-800">{selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBulkAssign(true)} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center gap-1">
              <Warehouse size={14} /> Bulk Assign
            </button>
            <button onClick={() => setSelectedProducts(new Set())} className="px-3 py-1.5 bg-white text-gray-600 text-sm rounded-lg hover:bg-gray-100 border">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Bulk Assign Products</h2>
              <button onClick={() => setShowBulkAssign(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-purple-800">{selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected</p>
            </div>
            <p className="text-sm text-gray-500 mb-4">Assign category and/or warehouse to the selected products.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category (for products without one)</label>
                <select value={bulkAssignCategory} onChange={e => setBulkAssignCategory(e.target.value ? Number(e.target.value) : '')} className="w-full border rounded-lg px-3 py-2">
                  <option value="">-- Skip --</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse (add missing products)</label>
                <select value={bulkAssignWarehouse} onChange={e => setBulkAssignWarehouse(e.target.value ? Number(e.target.value) : '')} className="w-full border rounded-lg px-3 py-2">
                  <option value="">-- Skip --</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <button
                onClick={handleBulkAssign}
                disabled={bulkAssigning || (!bulkAssignCategory && !bulkAssignWarehouse)}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bulkAssigning ? <><Loader2 size={16} className="animate-spin" /> Assigning...</> : 'Assign Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Package className="text-blue-600" size={24} /></div>
          <div><p className="text-sm text-gray-500">Total Products</p><p className="text-2xl font-bold">{stats.total}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="text-green-600" size={24} /></div>
          <div><p className="text-sm text-gray-500">Active Products</p><p className="text-2xl font-bold">{stats.active}</p></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg"><AlertTriangle className="text-yellow-600" size={24} /></div>
          <div><p className="text-sm text-gray-500">Low Stock</p><p className="text-2xl font-bold">{stats.lowStock}</p></div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by name, code, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="">All Warehouses</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 w-10">
                <input type="checkbox" checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Codes</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Units</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">First Unit Prices</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Second Unit Prices</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Warehouse</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">No products found</td></tr>
            ) : filteredProducts.map((product) => (
              <tr key={product.id} className={`hover:bg-gray-50 ${selectedProducts.has(product.id) ? 'bg-purple-50' : ''}`}>
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleSelectProduct(product.id)} className="rounded border-gray-300" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.categoryName || '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm">
                  <div className="font-medium">SKU: {product.sku}</div>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Barcode size={12} className="text-gray-400" />
                      <span className="text-xs text-blue-600 font-medium">{product.baseUnit}:</span>
                      <span className="text-gray-600">{product.barcode || '-'}</span>
                    </div>
                    {product.secondUnit && product.unitsPerSecond > 0 && (
                      <div className="flex items-center gap-1">
                        <Barcode size={12} className="text-gray-400" />
                        <span className="text-xs text-blue-600 font-medium">{product.secondUnit}:</span>
                        <span className="text-gray-600">{product.boxBarcode || '-'}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm">
                  <div>{product.baseUnit}</div>
                  {product.secondUnit && product.unitsPerSecond > 0 ? (
                    <div className="text-gray-500">{product.unitsPerSecond} per {product.secondUnit}</div>
                  ) : (
                    <div className="text-gray-400 text-xs">No second unit</div>
                  )}
                </td>
                <td className="px-3 py-3 text-sm">
                  <div className="text-xs font-medium text-blue-600 mb-1">{product.baseUnit}</div>
                  <div>R: {product.currency} {product.retailPrice.toFixed(3)}</div>
                  <div className="text-gray-500">W: {product.currency} {product.wholesalePrice.toFixed(3)}</div>
                  <div className="text-gray-500">S: {product.currency} {product.superWholesalePrice.toFixed(3)}</div>
                  <div className="text-gray-500">C: {product.currency} {product.costPrice.toFixed(3)}</div>
                </td>
                <td className="px-3 py-3 text-sm">
                  {product.secondUnit && product.unitsPerSecond > 0 ? (
                    <>
                      <div className="text-xs font-medium text-blue-600 mb-1">{product.secondUnit}</div>
                      <div>R: {product.currency} {product.boxRetailPrice.toFixed(3)}</div>
                      <div className="text-gray-500">W: {product.currency} {product.boxWholesalePrice.toFixed(3)}</div>
                      <div className="text-gray-500">S: {product.currency} {product.boxSuperWholesalePrice.toFixed(3)}</div>
                      <div className="text-gray-500">C: {product.currency} {product.boxCostPrice.toFixed(3)}</div>
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs">N/A</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <button 
                    onClick={() => handleViewInventory(product)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Eye size={14} /> {product.defaultWarehouseName || 'View Stock'}
                  </button>
                </td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <PermissionGate permission={PERMISSIONS.MANAGE_COST_HISTORY}>
                      <button onClick={() => handleCostTimeline(product)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Cost Timeline"><TrendingUp size={16} /></button>
                    </PermissionGate>
                    <button onClick={() => handleOpenReport(product)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Print Report"><FileText size={16} /></button>
                    <button onClick={() => openVariantsModal(product)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Variants">
                      <Package size={16} />
                      {product.variants && product.variants.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{product.variants.length}</span>
                      )}
                    </button>
                    <PermissionGate permission={PERMISSIONS.ADJUST_STOCK_LEVELS}>
                      <button onClick={() => handleQuickAdjust(product)} className="p-1 text-orange-600 hover:bg-orange-50 rounded" title="Adjust Stock"><ArrowUpDown size={16} /></button>
                    </PermissionGate>
                    <PermissionGate permission={PERMISSIONS.DELETE_PRODUCTS}>
                      <button onClick={() => handleDelete(product.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16} /></button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">
                {showEditModal ? 'Edit Product' : (showProductSearch ? 'Find or Add Product' : 'Add New Product')}
              </h2>
              <button onClick={() => { setShowModal(false); setShowEditModal(false); setShowProductSearch(false) }}><X size={24} /></button>
            </div>
            
            {/* Product Search Section - Only show for Add modal */}
            {showModal && !showEditModal && showProductSearch && (
              <div className="p-4 border-b bg-blue-50">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scan Barcode or Enter Item Code</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => handleProductSearch(e.target.value)}
                      placeholder="Scan barcode or enter SKU..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                      autoFocus
                    />
                  </div>
                </div>
                
                {productSearchQuery && filteredSearchProducts.length > 0 && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Or Select Existing Product to Edit</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {filteredSearchProducts.slice(0, 10).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectExistingProduct(p.id)}
                          className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b last:border-b-0 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-xs text-gray-500">SKU: {p.sku} {p.barcode && `| Barcode: ${p.barcode}`}</div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-green-600">{p.currency} {p.costPrice.toFixed(3)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startNewProduct}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Create New Product
                  </button>
                </div>
                
                {productSearchMode === 'existing' && selectedProduct && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Check size={18} />
                      <span className="font-medium">Product found: {selectedProduct.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectExistingProduct(selectedProduct.id)}
                      className="mt-2 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Edit This Product
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={showEditModal ? handleEditSubmit : handleAdd} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Back to Search button */}
              {showModal && !showEditModal && !showProductSearch && (
                <button type="button" onClick={() => { setShowProductSearch(true); setProductSearchQuery('') }} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-2">
                  <Search size={14} /> Search for existing product
                </button>
              )}

              {/* Current Stock Info - Show when existing product is selected */}
              {existingProductStock && selectedProduct && productSearchMode === 'existing' && (
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={16} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Current Stock: {selectedProduct.name}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                      <span className="text-gray-500">{selectedProduct.baseUnit}s:</span>{' '}
                      <span className="font-bold text-blue-700">{existingProductStock.baseQty}</span>
                    </div>
                    {selectedProduct.secondUnit && selectedProduct.unitsPerSecond > 0 && (
                      <div className="bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                        <span className="text-gray-500">{selectedProduct.secondUnit}s:</span>{' '}
                        <span className="font-bold text-blue-700">{existingProductStock.boxQty}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Enter quantity below to add to existing stock</p>
                </div>
              )}
              
              {/* Public Info */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
                <div className="text-sm font-semibold text-gray-700">Public Info</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Enter product name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                    <div className="flex gap-1">
                      <select value={formData.categoryId} onChange={(e) => setFormData({...formData, categoryId: e.target.value})} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white">
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowQuickCategory(true)} className="px-2 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Warehouse</label>
                    <select value={formData.defaultWarehouseId} onChange={(e) => setFormData({...formData, defaultWarehouseId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      <option value="">Select Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                    <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      {currencies.filter(c => c.isActive).length > 0 ? currencies.filter(c => c.isActive).map(c => <option key={c.id} value={c.code}>{c.code}</option>) : (
                        <><option value="USD">USD</option><option value="LBP">LBP</option><option value="EUR">EUR</option></>
                      )}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      <input type="checkbox" id="productActiveProducts" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="rounded" />
                      <label htmlFor="productActiveProducts" className="text-sm font-semibold text-gray-700">Active</label>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم بالعربي</label>
                    <input type="text" value={formData.nameAr} onChange={(e) => setFormData({...formData, nameAr: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-right" dir="rtl" placeholder="اسم المنتج" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Image</label>
                    <div className="flex items-center gap-2">
                      {formData.imageUrl ? (
                        <div className="relative">
                          <img src={formData.imageUrl} alt="Product" className="w-10 h-10 object-cover rounded-lg border" />
                          <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"><X size={10} /></button>
                        </div>
                      ) : (
                        <div className="w-10 h-10 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white cursor-pointer hover:bg-gray-100" onClick={() => fileInputRef.current?.click()}>
                          {uploadingImage ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <Image size={16} className="text-gray-400" />}
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 hover:underline">Upload</button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      <input type="checkbox" id="productOnlineShop" checked={formData.showInOnlineShop} onChange={(e) => setFormData({...formData, showInOnlineShop: e.target.checked})} className="rounded" />
                      <label htmlFor="productOnlineShop" className="text-sm font-semibold text-gray-700">Online Shop</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* First Unit Configuration */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">First Unit Configuration</div>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (showSecondUnit) {
                        setFormData({...formData, secondUnit: '', unitsPerSecond: 0, boxBarcode: '', boxRetailPrice: 0, boxWholesalePrice: 0, boxSuperWholesalePrice: 0, boxCostPrice: 0, initialQuantityBox: 0})
                      } else {
                        setFormData({...formData, secondUnit: 'Box', unitsPerSecond: 0})
                      }
                      setShowSecondUnit(!showSecondUnit)
                    }} 
                    className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-2 transition-colors ${
                      showSecondUnit 
                        ? 'border-red-300 text-red-600 hover:bg-red-50' 
                        : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {showSecondUnit ? (
                      <><X size={14} /> Remove Second Unit</>
                    ) : (
                      <><Plus size={14} /> Add Second Unit</>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">SKU *</label>
                    <input type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Enter SKU" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Barcode</label>
                    <input type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Enter barcode" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                    <select value={formData.baseUnit} onChange={(e) => setFormData({...formData, baseUnit: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                      {units.length > 0 ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>) : (
                        <>
                          <option value="Piece">Piece</option>
                          <option value="Box">Box</option>
                          <option value="Kg">Kg</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                    <input type="number" min="0" value={formData.initialQuantity} onChange={(e) => setFormData({...formData, initialQuantity: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Price</label>
                    <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Retail Price</label>
                    <input type="number" step="0.01" value={formData.retailPrice} onChange={(e) => setFormData({...formData, retailPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Wholesale</label>
                    <input type="number" step="0.01" value={formData.wholesalePrice} onChange={(e) => setFormData({...formData, wholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Super Wholesale</label>
                    <input type="number" step="0.01" value={formData.superWholesalePrice} onChange={(e) => setFormData({...formData, superWholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                  </div>
                </div>
              </div>

              {/* Second Unit Configuration - Only shown when enabled */}
              {showSecondUnit && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50 space-y-4">
                  <div className="text-sm font-semibold text-blue-700">Second Unit Configuration</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">1 {formData.baseUnit} = X {formData.secondUnit || 'Piece'}s</label>
                      <input type="number" min="1" value={formData.unitsPerSecond} onChange={(e) => setFormData({...formData, unitsPerSecond: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="e.g. 12" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Barcode</label>
                      <input type="text" value={formData.boxBarcode} onChange={(e) => setFormData({...formData, boxBarcode: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Unit</label>
                      <select value={formData.secondUnit} onChange={(e) => setFormData({...formData, secondUnit: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white">
                        {units.length > 0 ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>) : (
                          <>
                            <option value="Box">Box</option>
                            <option value="Carton">Carton</option>
                            <option value="Pack">Pack</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity</label>
                      <input type="number" min="0" value={formData.initialQuantityBox} onChange={(e) => setFormData({...formData, initialQuantityBox: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Cost Price</label>
                      <input type="number" step="0.01" min="0" value={formData.boxCostPrice} onChange={(e) => setFormData({...formData, boxCostPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Retail Price</label>
                      <input type="number" step="0.01" min="0" value={formData.boxRetailPrice} onChange={(e) => setFormData({...formData, boxRetailPrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Wholesale</label>
                      <input type="number" step="0.01" min="0" value={formData.boxWholesalePrice} onChange={(e) => setFormData({...formData, boxWholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Super Wholesale</label>
                      <input type="number" step="0.01" min="0" value={formData.boxSuperWholesalePrice} onChange={(e) => setFormData({...formData, boxSuperWholesalePrice: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Attributes - Collapsible */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-2 py-2">
                  <span className="transition-transform group-open:rotate-90">▶</span>
                  Optional Attributes (Color, Size, Dimensions)
                </summary>
                <div className="grid grid-cols-5 gap-3 mt-3 p-3 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Color</label>
                    <input type="text" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} placeholder="e.g. Red" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Size</label>
                    <input type="text" value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})} placeholder="e.g. Large" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Weight (kg)</label>
                    <input type="number" step="0.01" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} placeholder="0.00" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Length (cm)</label>
                    <input type="number" step="0.01" value={formData.length} onChange={(e) => setFormData({...formData, length: e.target.value})} placeholder="0" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Height (cm)</label>
                    <input type="number" step="0.01" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} placeholder="0" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                  </div>
                </div>
              </details>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setShowEditModal(false) }} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cost Timeline Modal */}
      {showCostTimeline && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-[#003366] text-white">
              <h2 className="text-lg font-semibold">{selectedProduct.name} — Cost Timeline</h2>
              <button onClick={() => setShowCostTimeline(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingCostHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : costHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No cost history available for this product.</p>
                  <p className="text-sm mt-2">Cost history is recorded when purchasing from suppliers.</p>
                </div>
              ) : (
                <>
                  {/* Cost Chart - Recharts Line Chart */}
                  <div className="mb-6">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={costHistory.map(h => ({
                            date: new Date(h.recordedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            cost: h.cost,
                            supplier: h.supplierName
                          }))}
                          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }} 
                            stroke="#6b7280"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }} 
                            stroke="#6b7280"
                            tickFormatter={(value: number) => `${selectedProduct?.currency || ''} ${value}`}
                          />
                          <Tooltip 
                            formatter={(value: number) => [`${selectedProduct?.currency || ''} ${value.toFixed(3)}`, 'Cost']}
                            labelStyle={{ fontWeight: 'bold' }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cost" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 8, fill: '#2563eb' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 text-center">Cost ({selectedProduct?.currency || ''}) over time</div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {[...new Set(costHistory.map(h => h.supplierName))].map((supplier, idx) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500']
                      return (
                        <div key={supplier} className="flex items-center gap-2 text-sm">
                          <div className={`w-3 h-3 rounded ${colors[idx % colors.length]}`} />
                          <span>{supplier}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Stats */}
                  {(() => {
                    const stats = getCostStats()
                    if (!stats) return null
                    return (
                      <div className="bg-gray-50 rounded-lg p-4 text-sm">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-gray-500">Min Cost</div>
                            <div className="font-semibold text-green-600">{selectedProduct?.currency} {stats.minCost.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Max Cost</div>
                            <div className="font-semibold text-red-600">{selectedProduct?.currency} {stats.maxCost.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Increase</div>
                            <div className="font-semibold">{selectedProduct?.currency} {stats.increase.toFixed(3)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Change</div>
                            <div className={`font-semibold ${parseFloat(stats.increasePercent) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {stats.increasePercent}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* History Table */}
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Supplier</th>
                          <th className="px-3 py-2 text-right">Cost</th>
                          <th className="px-3 py-2 text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costHistory.map((entry) => (
                          <tr key={entry.id} className="border-t">
                            <td className="px-3 py-2">{new Date(entry.recordedDate).toLocaleDateString()}</td>
                            <td className="px-3 py-2">{entry.supplierName}</td>
                            <td className="px-3 py-2 text-right font-medium">{selectedProduct?.currency} {entry.cost.toFixed(3)}</td>
                            <td className="px-3 py-2 text-gray-500">{entry.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="flex justify-end pt-4">
                <button onClick={() => setShowCostTimeline(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package size={20} /> Stock Details — {selectedProduct.name}
              </h2>
              <button onClick={() => setShowInventoryModal(false)}><X size={24} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingInventory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : !inventoryData ? (
                <div className="text-center py-12 text-gray-500">
                  <Package size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No inventory data available</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  {(() => {
                    const hasSecondUnit = selectedProduct.secondUnit && selectedProduct.unitsPerSecond > 0;
                    const multiplier = hasSecondUnit ? selectedProduct.unitsPerSecond : 1;
                    const totalPieces = inventoryData.totalQuantity * multiplier;
                    const warehousePieces = inventoryData.totalWarehouseQuantity * multiplier;
                    const vanPieces = inventoryData.totalVanQuantity * multiplier;
                    const secondUnitLabel = hasSecondUnit ? selectedProduct.secondUnit : selectedProduct.baseUnit;
                    
                    return (
                      <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className={`p-4 rounded-lg ${inventoryData.isLowStock ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                          <div className="text-sm text-gray-600">Total Stock</div>
                          <div className={`text-2xl font-bold ${inventoryData.isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                            {totalPieces.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">{secondUnitLabel}s</div>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="text-sm text-gray-600">In Warehouses</div>
                          <div className="text-2xl font-bold text-blue-600">{warehousePieces.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{secondUnitLabel}s</div>
                        </div>
                        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="text-sm text-gray-600">In Vans</div>
                          <div className="text-2xl font-bold text-purple-600">{vanPieces.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{secondUnitLabel}s</div>
                        </div>
                        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                          <div className="text-sm text-gray-600">Reserved</div>
                          <div className="text-2xl font-bold text-orange-600">{(inventoryData.totalReservedQuantity * multiplier).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">Available: {((inventoryData.totalQuantity - inventoryData.totalReservedQuantity) * multiplier).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Low Stock Alert */}
                  {inventoryData.isLowStock && (
                    <div className="mb-6 p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2 text-red-700">
                      <AlertTriangle size={20} />
                      <span className="font-medium">Low Stock Alert!</span>
                      <span className="text-sm">Stock is at or below {inventoryData.lowStockAlert} {inventoryData.baseUnit}s</span>
                    </div>
                  )}

                  {/* Unit Configurations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* First Unit Configuration */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-3">First Unit: {selectedProduct.baseUnit}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-600">Cost:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.costPrice.toFixed(3)}</span></div>
                        <div><span className="text-gray-600">Retail:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.retailPrice.toFixed(3)}</span></div>
                        <div><span className="text-gray-600">Wholesale:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.wholesalePrice.toFixed(3)}</span></div>
                        <div><span className="text-gray-600">Super W:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.superWholesalePrice.toFixed(3)}</span></div>
                        <div className="col-span-2"><span className="text-gray-600">Min Stock:</span> <span className="font-medium text-red-600">{selectedProduct.lowStockAlert} {selectedProduct.baseUnit}s</span></div>
                      </div>
                    </div>

                    {/* Second Unit Configuration */}
                    {selectedProduct.secondUnit && selectedProduct.unitsPerSecond > 0 && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-3">Second Unit: {selectedProduct.secondUnit} = {selectedProduct.unitsPerSecond} {selectedProduct.baseUnit}s</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-600">Cost:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.boxCostPrice.toFixed(3)}</span></div>
                          <div><span className="text-gray-600">Retail:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.boxRetailPrice.toFixed(3)}</span></div>
                          <div><span className="text-gray-600">Wholesale:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.boxWholesalePrice.toFixed(3)}</span></div>
                          <div><span className="text-gray-600">Super W:</span> <span className="font-medium">{selectedProduct.currency} {selectedProduct.boxSuperWholesalePrice.toFixed(3)}</span></div>
                          <div className="col-span-2"><span className="text-gray-600">Min Stock:</span> <span className="font-medium text-red-600">{selectedProduct.lowStockAlertBox} {selectedProduct.secondUnit}s</span></div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-purple-200 text-sm text-purple-700">
                          Total in {selectedProduct.baseUnit}s: <span className="font-bold">{inventoryData.totalQuantity.toLocaleString()}</span>
                          <span className="mx-2">→</span>
                          Total in {selectedProduct.secondUnit}s: <span className="font-bold">{(inventoryData.totalQuantity * selectedProduct.unitsPerSecond).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Warehouse Inventory */}
                  <div className="mb-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Warehouse size={18} className="text-blue-600" /> Warehouse Stock
                    </h3>
                    {inventoryData.warehouseInventory.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">No warehouse inventory</div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Warehouse</th>
                              <th className="px-4 py-2 text-right">Quantity</th>
                              <th className="px-4 py-2 text-right">Reserved</th>
                              <th className="px-4 py-2 text-right">Available</th>
                              <th className="px-4 py-2 text-right">Last Counted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryData.warehouseInventory.map((wh) => (
                              <tr key={wh.warehouseId} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{wh.warehouseName}</td>
                                <td className="px-4 py-3 text-right">{wh.quantity.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-orange-600">{wh.reservedQuantity.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-medium text-green-600">{wh.availableQuantity.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-gray-500">
                                  {wh.lastCountedAt ? new Date(wh.lastCountedAt).toLocaleDateString() : 'Never'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Van Inventory */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Truck size={18} className="text-purple-600" /> Van Stock
                    </h3>
                    {inventoryData.vanInventory.length === 0 ? (
                      <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">No van inventory</div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left">Van</th>
                              <th className="px-4 py-2 text-left">Plate Number</th>
                              <th className="px-4 py-2 text-right">Quantity</th>
                              <th className="px-4 py-2 text-right">Loaded At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryData.vanInventory.map((van) => (
                              <tr key={van.vanId} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{van.vanName}</td>
                                <td className="px-4 py-3 text-gray-500">{van.plateNumber || '-'}</td>
                                <td className="px-4 py-3 text-right font-medium text-purple-600">{van.quantity.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-gray-500">
                                  {new Date(van.loadedAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="flex justify-end pt-4 mt-4 border-t">
                <button onClick={() => setShowInventoryModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {showQuickCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Add Category</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAddCategory()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter category name"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowQuickCategory(false); setNewCategoryName('') }}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAddCategory}
                disabled={savingCategory || !newCategoryName.trim()}
                className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {savingCategory ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Report Modal */}
      {showReportModal && reportProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-emerald-600" />
                  <div>
                    <h2 className="text-xl font-bold">Product Report</h2>
                    <p className="text-sm text-gray-500">{reportProduct.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {loadingReport ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="ml-2">Loading report data...</span>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Cost History:</span>
                        <span className="ml-2 font-medium">{reportCostHistory.length} entries</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Stock:</span>
                        <span className="ml-2 font-medium">{reportInventory?.totalQuantity.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Current Cost:</span>
                        <span className="ml-2 font-medium text-red-600">{reportProduct.currency} {reportProduct.costPrice.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Retail Price:</span>
                        <span className="ml-2 font-medium text-green-600">{reportProduct.currency} {reportProduct.retailPrice.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Timeline Preview */}
                  {reportCostHistory.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg" ref={chartRef}>
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Cost Timeline Preview</h4>
                      <div className="h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={reportCostHistory.map(h => ({ date: new Date(h.recordedDate).toLocaleDateString(), cost: h.cost }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#93c5fd" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#3b82f6" />
                            <YAxis tick={{ fontSize: 10 }} stroke="#3b82f6" />
                            <Tooltip />
                            <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Report Options */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-700">Include in Report:</h3>
                    
                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showSummary}
                        onChange={(e) => setReportOptions({...reportOptions, showSummary: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Stock Summary</p>
                        <p className="text-sm text-gray-500">Total stock, warehouse, van quantities</p>
                      </div>
                      {reportOptions.showSummary && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showPricing}
                        onChange={(e) => setReportOptions({...reportOptions, showPricing: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Pricing Information</p>
                        <p className="text-sm text-gray-500">Retail, wholesale, cost prices</p>
                      </div>
                      {reportOptions.showPricing && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showCostTimeline}
                        onChange={(e) => setReportOptions({...reportOptions, showCostTimeline: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Cost Timeline ({reportCostHistory.length})</p>
                        <p className="text-sm text-gray-500">Cost history graph and table</p>
                      </div>
                      {reportOptions.showCostTimeline && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showInventory}
                        onChange={(e) => setReportOptions({...reportOptions, showInventory: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Inventory Details</p>
                        <p className="text-sm text-gray-500">Warehouse and van stock breakdown</p>
                      </div>
                      {reportOptions.showInventory && <Check size={18} className="text-emerald-600" />}
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={reportOptions.showSalesHistory}
                        onChange={(e) => setReportOptions({...reportOptions, showSalesHistory: e.target.checked})}
                        className="w-5 h-5 text-emerald-600 rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium">Sales Summary</p>
                        <p className="text-sm text-gray-500">Quantity sold, revenue, profit</p>
                      </div>
                      {reportOptions.showSalesHistory && <Check size={18} className="text-emerald-600" />}
                    </label>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  generateProductReport()
                  setShowReportModal(false)
                }}
                disabled={loadingReport}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stock Adjust Dialog */}
      {showQuickAdjust && quickAdjustProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Adjust Stock</h3>
                <p className="text-xs text-gray-500">{quickAdjustProduct.name} ({quickAdjustProduct.sku})</p>
              </div>
              <button onClick={() => setShowQuickAdjust(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Add / Subtract toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAdjustType('add')}
                  className={`py-2 rounded-lg border text-sm font-medium ${quickAdjustType === 'add' ? 'bg-green-50 border-green-500 text-green-700' : 'hover:bg-gray-50'}`}
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAdjustType('subtract')}
                  className={`py-2 rounded-lg border text-sm font-medium ${quickAdjustType === 'subtract' ? 'bg-red-50 border-red-500 text-red-700' : 'hover:bg-gray-50'}`}
                >
                  − Subtract
                </button>
              </div>

              {/* Variant selector */}
              {quickAdjustLoadingVariants && (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-1">
                  <Loader2 size={14} className="animate-spin" /> Loading variants...
                </div>
              )}
              {!quickAdjustLoadingVariants && quickAdjustVariants.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Variant</label>
                  <select
                    value={quickAdjustVariantId}
                    onChange={(e) => setQuickAdjustVariantId(e.target.value ? parseInt(e.target.value) : '')}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">— Base product (no variant) —</option>
                    {quickAdjustVariants.map(v => {
                      const attrs = [v.color, v.size, v.weight ? `${v.weight}kg` : null, v.length ? `${v.length}cm` : null, v.height ? `${v.height}cm` : null].filter(Boolean)
                      const label = attrs.length > 0 ? attrs.join(' / ') : v.name
                      return (
                        <option key={v.id} value={v.id}>
                          {label}{v.sku ? ` (${v.sku})` : ''} — Stock: {v.quantity}
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {/* Warehouse */}
              {warehouses.length > 1 && (
                <select
                  value={quickAdjustWarehouse}
                  onChange={(e) => setQuickAdjustWarehouse(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}

              {/* Base unit qty */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{quickAdjustProduct.baseUnit} quantity</label>
                <input
                  type="number"
                  value={quickAdjustQty}
                  onChange={(e) => setQuickAdjustQty(e.target.value)}
                  min="0"
                  step="any"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="0"
                  autoFocus
                />
              </div>

              {/* Second unit qty */}
              {quickAdjustProduct.secondUnit && quickAdjustProduct.unitsPerSecond > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{quickAdjustProduct.secondUnit} quantity</label>
                  <input
                    type="number"
                    value={quickAdjustSecondQty}
                    onChange={(e) => setQuickAdjustSecondQty(e.target.value)}
                    min="0"
                    step="any"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="0"
                  />
                </div>
              )}

              {/* Reason */}
              <select
                value={quickAdjustReason}
                onChange={(e) => setQuickAdjustReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Reason (optional)</option>
                <option value="Physical Count">Physical Count</option>
                <option value="Damaged">Damaged</option>
                <option value="Expired">Expired</option>
                <option value="Lost">Lost</option>
                <option value="Returned to Supplier">Returned to Supplier</option>
                <option value="Received from Supplier">Received from Supplier</option>
                <option value="Correction">Correction</option>
              </select>

              {/* Submit */}
              <button
                onClick={submitQuickAdjust}
                disabled={quickAdjustSaving || !quickAdjustQty || !quickAdjustWarehouse}
                className={`w-full py-2 rounded-lg text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${quickAdjustType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {quickAdjustSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                {quickAdjustSaving ? 'Saving...' : quickAdjustType === 'add' ? '+ Add Stock' : '− Subtract Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variants Modal */}
      {showVariantsModal && variantsProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Product Variants</h3>
                <p className="text-xs text-gray-500">{variantsProduct.name} ({variantsProduct.sku})</p>
              </div>
              <button onClick={() => { setShowVariantsModal(false); resetVariantForm() }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Existing Variants */}
              {loadingVariants ? (
                <div className="text-center py-4"><Loader2 className="animate-spin mx-auto" size={24} /></div>
              ) : variants.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No variants yet. Add one below.</p>
              ) : (
                <div className="space-y-2">
                  {variants.map(v => (
                    <div key={v.id} className={`flex items-center gap-3 p-3 rounded-lg border ${editingVariant?.id === v.id ? 'border-purple-300 bg-purple-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{v.name}</div>
                        <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                          {v.sku && <span>SKU: {v.sku}</span>}
                          {v.barcode && <span>Barcode: {v.barcode}</span>}
                          {v.retailPrice != null && <span>Retail: {v.retailPrice}</span>}
                          {v.wholesalePrice != null && <span>Wholesale: {v.wholesalePrice}</span>}
                          {v.costPrice != null && <span>Cost: {v.costPrice}</span>}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {v.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button onClick={() => editVariant(v)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => deleteVariant(v.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Edit Variant Form */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">{editingVariant ? 'Edit Variant' : 'Add New Variant'}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Name</label>
                    <input
                      type="text"
                      value={variantsProduct.name}
                      readOnly
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">SKU</label>
                    <input
                      type="text"
                      value={variantForm.sku}
                      onChange={e => setVariantForm(f => ({ ...f, sku: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Variant SKU"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex justify-between items-center">
                      <span>Barcode</span>
                      <button type="button" onClick={() => setVariantForm(f => ({ ...f, barcode: generateBarcode() }))} className="px-1.5 py-0.5 text-[10px] bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-0.5" title="Generate Barcode"><Barcode size={10} />Gen</button>
                    </label>
                    <input
                      type="text"
                      value={variantForm.barcode}
                      onChange={e => setVariantForm(f => ({ ...f, barcode: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Enter or generate"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Retail Price</label>
                    <input
                      type="number"
                      value={variantForm.retailPrice}
                      onChange={e => setVariantForm(f => ({ ...f, retailPrice: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={`${variantsProduct.retailPrice}`}
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Wholesale Price</label>
                    <input
                      type="number"
                      value={variantForm.wholesalePrice}
                      onChange={e => setVariantForm(f => ({ ...f, wholesalePrice: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={`${variantsProduct.wholesalePrice}`}
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cost Price</label>
                    <input
                      type="number"
                      value={variantForm.costPrice}
                      onChange={e => setVariantForm(f => ({ ...f, costPrice: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={`${variantsProduct.costPrice}`}
                      step="any"
                    />
                  </div>
                  {variantsProduct.secondUnit && (
                    <>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Box Retail</label>
                        <input
                          type="number"
                          value={variantForm.boxRetailPrice}
                          onChange={e => setVariantForm(f => ({ ...f, boxRetailPrice: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder={`${variantsProduct.boxRetailPrice}`}
                          step="any"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Box Wholesale</label>
                        <input
                          type="number"
                          value={variantForm.boxWholesalePrice}
                          onChange={e => setVariantForm(f => ({ ...f, boxWholesalePrice: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder={`${variantsProduct.boxWholesalePrice}`}
                          step="any"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Box Cost</label>
                        <input
                          type="number"
                          value={variantForm.boxCostPrice}
                          onChange={e => setVariantForm(f => ({ ...f, boxCostPrice: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder={`${variantsProduct.boxCostPrice}`}
                          step="any"
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Optional Attributes */}
                <div className="grid grid-cols-5 gap-3 mt-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Color</label>
                    <input
                      type="text"
                      value={variantForm.color}
                      onChange={e => setVariantForm(f => ({ ...f, color: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g. Red"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Size</label>
                    <input
                      type="text"
                      value={variantForm.size}
                      onChange={e => setVariantForm(f => ({ ...f, size: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="e.g. Large"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Weight</label>
                    <input
                      type="number"
                      value={variantForm.weight}
                      onChange={e => setVariantForm(f => ({ ...f, weight: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="kg"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Length</label>
                    <input
                      type="number"
                      value={variantForm.length}
                      onChange={e => setVariantForm(f => ({ ...f, length: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="cm"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Height</label>
                    <input
                      type="number"
                      value={variantForm.height}
                      onChange={e => setVariantForm(f => ({ ...f, height: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="cm"
                      step="any"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">Initial Quantity (Stock)</label>
                  <input
                    type="number"
                    value={variantForm.quantity}
                    onChange={e => setVariantForm(f => ({ ...f, quantity: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="0"
                    min="0"
                  />
                </div>
                {editingVariant && (
                  <div className="mt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={variantForm.isActive}
                        onChange={e => setVariantForm(f => ({ ...f, isActive: e.target.checked }))}
                      />
                      Active
                    </label>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">Leave price fields empty to use parent product prices.</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveVariant}
                    disabled={savingVariant}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingVariant && <Loader2 size={14} className="animate-spin" />}
                    {editingVariant ? 'Update Variant' : 'Add Variant'}
                  </button>
                  {editingVariant && (
                    <button onClick={resetVariantForm} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
