import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Upload,
  Camera,
  Truck,
  Star,
  TrendingUp,
  Eye,
  Heart,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  BarChart3,
  Users,
  ShoppingBag,
  AlertCircle,
  Filter,
  Search,
  Download,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { FileUpload } from '../components/FileUpload';
import { orderService, OrderData } from '../services/orderService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ProductForm {
  name: string;
  price: string;
  description: string;
  category: string;
  section: string;
  weight: string;
  instantDeliveryEligible: boolean;
  customisable: boolean;
}

interface Analytics {
  totalSold: number;
  monthlyRevenue: number;
  topProducts: any[];
  recentOrders: any[];
  customerSatisfaction: number;
}

export const SellerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { products, addProduct, deliveryCities, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState<ProductForm>({
    name: '',
    price: '',
    description: '',
    category: '',
    section: '',
    weight: '',
    instantDeliveryEligible: false,
    customisable: false
  });
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const sellerProducts = products.filter(p => p.sellerId === user?.id);
  const stats = {
    total: sellerProducts.length,
    approved: sellerProducts.filter(p => p.status === 'approved').length,
    pending: sellerProducts.filter(p => p.status === 'pending').length,
    rejected: sellerProducts.filter(p => p.status === 'rejected').length,
    totalViews: sellerProducts.reduce((acc, p) => acc + Math.floor(Math.random() * 100), 0),
    totalRevenue: sellerProducts.filter(p => p.status === 'approved').reduce((acc, p) => acc + p.price, 0)
  };

  const activeDeliveryCities = deliveryCities.filter(c => c.isActive);
  const canOfferInstantDelivery = activeDeliveryCities.some(c => c.name === user?.city);

  useEffect(() => {
    if (user) {
      fetchSellerOrders();
      fetchSellerAnalytics();
    }
  }, [user, products]);

  const fetchSellerOrders = async () => {
    setIsOrdersLoading(true);
    try {
      const allOrders = await orderService.getAllOrders();
      const sellerProductIds = sellerProducts.map(p => p.id);
      const filteredOrders = allOrders.filter(order =>
        order.items.some((item: any) => sellerProductIds.includes(item.product.id))
      );
      setOrders(filteredOrders);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const fetchSellerAnalytics = async () => {
    try {
      const allOrders = await orderService.getAllOrders();
      const sellerProductIds = sellerProducts.map(p => p.id);
      let totalSold = 0;
      let monthlyRevenue = 0;
      let recentOrders: any[] = [];
      
      allOrders.forEach(order => {
        const sellerItems = order.items.filter((item: any) => sellerProductIds.includes(item.product.id));
        if (sellerItems.length > 0) {
          totalSold += sellerItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
          monthlyRevenue += sellerItems.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0);
          recentOrders.push({
            orderId: order.id,
            items: sellerItems,
            date: order.created_at,
            status: order.status,
            total: sellerItems.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0)
          });
        }
      });

      // Get top products by sales
      const productSales: Record<string, number> = {};
      allOrders.forEach(order => {
        order.items.forEach((item: any) => {
          if (sellerProductIds.includes(item.product.id)) {
            productSales[item.product.id] = (productSales[item.product.id] || 0) + item.quantity;
          }
        });
      });

      const topProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([productId, sales]) => {
          const product = sellerProducts.find(p => p.id === productId);
          return { product, sales };
        })
        .filter(item => item.product);

      setAnalytics({
        totalSold,
        monthlyRevenue,
        topProducts,
        recentOrders: recentOrders.slice(0, 10),
        customerSatisfaction: 4.8 // Mock data
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    const success = await orderService.updateOrderStatus(orderId, 'confirmed');
    if (success) {
      toast.success('Order confirmed!');
      fetchSellerOrders();
      fetchSellerAnalytics();
    } else {
      toast.error('Failed to confirm order');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;
        toast.success('Product deleted');
        await refreshData();
        fetchSellerOrders();
        fetchSellerAnalytics();
      } catch (err) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      category: product.category,
      section: product.section || '',
      weight: product.weight?.toString() || '',
      instantDeliveryEligible: product.instantDeliveryEligible,
      customisable: product.customisable || false
    });
    setCustomQuestions(product.customQuestions || []);
    setShowAddProduct(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCustomQuestionChange = (index: number, value: string) => {
    setCustomQuestions(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addCustomQuestion = () => {
    setCustomQuestions(prev => [...prev, '']);
  };

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || (!imageFile && !editingProduct)) {
      toast.error('Please upload a product image');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let imageUrl = editingProduct?.image;
      let videoUrl = editingProduct?.videoUrl;

      if (imageFile) {
        imageUrl = URL.createObjectURL(imageFile);
      }
      if (videoFile) {
        videoUrl = URL.createObjectURL(videoFile);
      }

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: productForm.name,
            price: Math.round(parseFloat(productForm.price) * 100), // Convert to paise
            description: productForm.description,
            category: productForm.category,
            section: productForm.section,
            weight: productForm.weight ? parseFloat(productForm.weight) : null,
            instant_delivery_eligible: productForm.instantDeliveryEligible && canOfferInstantDelivery,
            customisable: productForm.customisable,
            image_url: imageUrl,
            video_url: videoUrl,
            tags: productForm.category.toLowerCase().split(' '),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Product updated successfully!');
      } else {
        // Create new product
        const success = await addProduct({
          sellerId: user.id,
          name: productForm.name,
          price: parseFloat(productForm.price),
          image: imageUrl,
          description: productForm.description,
          videoUrl: videoUrl,
          city: user.city || 'Mumbai',
          instantDeliveryEligible: productForm.instantDeliveryEligible && canOfferInstantDelivery,
          status: 'pending',
          category: productForm.category,
          tags: productForm.category.toLowerCase().split(' '),
          section: productForm.section,
          weight: productForm.weight ? parseFloat(productForm.weight) : undefined,
          customisable: productForm.customisable,
          customQuestions: productForm.customisable ? customQuestions.filter(q => q.trim() !== '') : []
        });

        if (!success) {
          throw new Error('Failed to add product');
        }
      }

      // Reset form
      setProductForm({
        name: '',
        price: '',
        description: '',
        category: '',
        section: '',
        weight: '',
        instantDeliveryEligible: false,
        customisable: false
      });
      setCustomQuestions([]);
      setImageFile(null);
      setVideoFile(null);
      setShowAddProduct(false);
      setEditingProduct(null);
      await refreshData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const filteredProducts = sellerProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'today' && new Date(order.created_at).toDateString() === new Date().toDateString()) ||
                       (dateFilter === 'week' && new Date(order.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    return matchesSearch && matchesDate;
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'products', name: 'Products', icon: Package },
    { id: 'orders', name: 'Orders', icon: ShoppingBag },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  const dashboardStats = [
    { 
      label: 'Total Products', 
      value: stats.total, 
      icon: Package, 
      color: 'bg-blue-600',
      change: '+12%',
      changeType: 'positive' as const
    },
    { 
      label: 'Approved Products', 
      value: stats.approved, 
      icon: CheckCircle, 
      color: 'bg-green-600',
      change: '+8%',
      changeType: 'positive' as const
    },
    { 
      label: 'Total Sales', 
      value: analytics?.totalSold || 0, 
      icon: TrendingUp, 
      color: 'bg-purple-600',
      change: '+24%',
      changeType: 'positive' as const
    },
    { 
      label: 'Revenue', 
      value: `₹${analytics?.monthlyRevenue.toLocaleString() || 0}`, 
      icon: DollarSign, 
      color: 'bg-amber-600',
      change: '+15%',
      changeType: 'positive' as const
    }
  ];

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Enhanced Sidebar */}
      <aside className="w-64 min-h-screen bg-white/90 backdrop-blur-sm shadow-xl border-r border-amber-100 flex flex-col py-8 px-4 fixed z-20">
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-amber-600 p-2 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-900">Seller Hub</h1>
              <p className="text-xs text-amber-600">{user?.businessName || 'Your Store'}</p>
            </div>
          </div>
          {user?.isVerified && (
            <div className="flex items-center space-x-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
              <CheckCircle className="w-3 h-3" />
              <span>Verified Seller</span>
            </div>
          )}
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all relative ${
                  activeTab === tab.id 
                    ? 'bg-amber-600 text-white shadow-lg' 
                    : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="absolute left-0 top-0 h-full w-1 bg-amber-500 rounded-r-lg" />
                )}
                <Icon className="w-5 h-5" />
                {tab.name}
                {tab.id === 'products' && stats.pending > 0 && (
                  <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                    {stats.pending}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-amber-100">
          <div className="text-xs text-amber-600 text-center">
            {user?.name} • {user?.city}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-amber-900">Welcome back, {user?.name}</h2>
                  <p className="text-amber-700 mt-1">Here's how your store is performing</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`${stat.color} p-3 rounded-xl`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          stat.changeType === 'positive' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {stat.change}
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-900 mb-1">{stat.value}</p>
                        <p className="text-sm text-amber-700">{stat.label}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <h3 className="font-semibold text-amber-900">Pending Review</h3>
                  </div>
                  <p className="text-2xl font-bold text-amber-900 mb-2">{stats.pending}</p>
                  <p className="text-sm text-amber-700">Products awaiting approval</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-pink-100 p-2 rounded-lg">
                      <Heart className="w-5 h-5 text-pink-600" />
                    </div>
                    <h3 className="font-semibold text-amber-900">Customer Rating</h3>
                  </div>
                  <p className="text-2xl font-bold text-amber-900 mb-2">{analytics?.customerSatisfaction || 4.8}</p>
                  <p className="text-sm text-amber-700">Average rating</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-amber-900">This Month</h3>
                  </div>
                  <p className="text-2xl font-bold text-amber-900 mb-2">+{Math.floor(Math.random() * 50) + 10}</p>
                  <p className="text-sm text-amber-700">New orders</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Products */}
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">Top Selling Products</h3>
                  <div className="space-y-4">
                    {analytics?.topProducts.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-amber-900">{item.product.name}</h4>
                          <p className="text-sm text-amber-600">{item.sales} sold</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-900">₹{item.product.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">Recent Orders</h3>
                  <div className="space-y-4">
                    {analytics?.recentOrders.slice(0, 5).map((order, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="bg-amber-100 p-2 rounded-lg">
                          <ShoppingBag className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-amber-900">Order #{order.orderId.slice(-8)}</p>
                          <p className="text-xs text-amber-600">
                            {order.items.length} items • ₹{order.total.toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Status */}
              {canOfferInstantDelivery && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-green-800 font-semibold text-lg">
                      Instant Delivery Available in {user?.city}
                    </span>
                  </div>
                  <p className="text-green-700">
                    You can offer instant delivery for your products! This helps increase sales and customer satisfaction.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-amber-900">Product Management</h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-amber-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-amber-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-16 text-center">
                  <div className="bg-amber-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-amber-900 mb-3">No products yet</h3>
                  <p className="text-amber-700 mb-6 max-w-md mx-auto">
                    Start showcasing your handmade creations to customers around the world. 
                    Upload your first product to get started.
                  </p>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
                  >
                    Create Your First Product
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow border border-amber-200"
                    >
                      <div className="relative">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(product.status)}`}>
                            {getStatusIcon(product.status)}
                            <span className="text-xs font-medium">
                              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 flex space-x-2">
                          {product.instantDeliveryEligible && (
                            <div className="bg-green-500 text-white p-1 rounded-full">
                              <Truck className="w-3 h-3" />
                            </div>
                          )}
                          {product.videoUrl && (
                            <div className="bg-purple-500 text-white p-1 rounded-full">
                              <Camera className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-amber-900 mb-2 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-amber-700 mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-bold text-amber-600">
                            ₹{product.price.toLocaleString()}
                          </span>
                          <div className="flex items-center space-x-2 text-xs text-amber-600">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="flex-1 bg-amber-100 text-amber-700 py-2 px-3 rounded-lg font-medium hover:bg-amber-200 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-amber-900">Order Management</h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-amber-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border border-amber-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
                {isOrdersLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                    <p className="text-amber-600 mt-2">Loading orders...</p>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="bg-amber-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag className="w-10 h-10 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-amber-900 mb-3">No orders yet</h3>
                    <p className="text-amber-700">Orders for your products will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Order ID</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Customer</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Products</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Total</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Date</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-amber-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-amber-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-sm">
                              #{order.id.slice(-8).toUpperCase()}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-amber-900">{order.buyer?.name || 'Unknown'}</p>
                                <p className="text-sm text-amber-600">{order.buyer?.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {order.items
                                  .filter((item: any) => sellerProducts.some(p => p.id === item.product.id))
                                  .slice(0, 2)
                                  .map((item: any, idx: number) => (
                                    <div key={idx} className="text-sm">
                                      <span className="text-amber-900">{item.product?.name}</span>
                                      <span className="text-amber-600"> x{item.quantity}</span>
                                    </div>
                                  ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-amber-900">
                              ₹{(order.total_amount / 100).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'confirmed' ? 'bg-purple-100 text-purple-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-amber-600">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                {order.status === 'pending' && (
                                  <button
                                    onClick={() => handleConfirmOrder(order.id)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                  >
                                    Confirm
                                  </button>
                                )}
                                <button className="text-amber-600 hover:text-amber-800 p-1">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-amber-900">Sales Analytics</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Overview */}
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">Sales Overview</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                      <div>
                        <p className="text-sm text-amber-600">Total Products Sold</p>
                        <p className="text-2xl font-bold text-amber-900">{analytics?.totalSold || 0}</p>
                      </div>
                      <div className="bg-amber-600 p-3 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                      <div>
                        <p className="text-sm text-amber-600">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-amber-900">₹{analytics?.monthlyRevenue.toLocaleString() || 0}</p>
                      </div>
                      <div className="bg-green-600 p-3 rounded-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                      <div>
                        <p className="text-sm text-amber-600">Customer Rating</p>
                        <p className="text-2xl font-bold text-amber-900">{analytics?.customerSatisfaction || 4.8}</p>
                      </div>
                      <div className="bg-purple-600 p-3 rounded-lg">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">Performance Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700">Approval Rate</span>
                      <span className="font-semibold text-amber-900">
                        {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div 
                        className="bg-amber-600 h-2 rounded-full" 
                        style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700">Product Views</span>
                      <span className="font-semibold text-amber-900">{stats.totalViews}</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-amber-700">Conversion Rate</span>
                      <span className="font-semibold text-amber-900">12.5%</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '12.5%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-amber-900">Account Settings</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Business Name</label>
                      <input
                        type="text"
                        value={user?.businessName || ''}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">City</label>
                      <input
                        type="text"
                        value={user?.city || ''}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Description</label>
                      <textarea
                        value={user?.description || ''}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        rows={3}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Store Statistics */}
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">Store Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-amber-700">Total Products</span>
                      <span className="font-semibold text-amber-900">{stats.total}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-amber-700">Approved Products</span>
                      <span className="font-semibold text-amber-900">{stats.approved}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-amber-700">Pending Review</span>
                      <span className="font-semibold text-amber-900">{stats.pending}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-amber-700">Account Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user?.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {user?.isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Product Modal */}
          <AnimatePresence>
            {showAddProduct && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                <motion.form
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-amber-900">
                      {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProduct(false);
                        setEditingProduct(null);
                        setImageFile(null);
                        setVideoFile(null);
                        setProductForm({
                          name: '',
                          price: '',
                          description: '',
                          category: '',
                          section: '',
                          weight: '',
                          instantDeliveryEligible: false,
                          customisable: false
                        });
                        setCustomQuestions([]);
                      }}
                      className="text-amber-600 hover:text-amber-800"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Product Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={productForm.name}
                        onChange={handleFormChange}
                        className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Price (₹) *</label>
                      <input
                        type="number"
                        name="price"
                        value={productForm.price}
                        onChange={handleFormChange}
                        className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Category *</label>
                      <select
                        name="category"
                        value={productForm.category}
                        onChange={handleFormChange}
                        className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        required
                      >
                        <option value="">Select Category</option>
                        <option value="Jewelry">Jewelry</option>
                        <option value="Home Decor">Home Decor</option>
                        <option value="Art">Art</option>
                        <option value="Textiles">Textiles</option>
                        <option value="Candles">Candles</option>
                        <option value="Pottery">Pottery</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Section</label>
                      <input
                        type="text"
                        name="section"
                        value={productForm.section}
                        onChange={handleFormChange}
                        className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="e.g., Rings, Necklaces"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-amber-700 mb-2">Weight (grams)</label>
                      <input
                        type="number"
                        name="weight"
                        value={productForm.weight}
                        onChange={handleFormChange}
                        className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="instantDeliveryEligible"
                          checked={productForm.instantDeliveryEligible}
                          onChange={handleFormChange}
                          disabled={!canOfferInstantDelivery}
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-amber-700">Instant Delivery</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="customisable"
                          checked={productForm.customisable}
                          onChange={handleFormChange}
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-sm text-amber-700">Customisable</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-amber-700 mb-2">Description *</label>
                    <textarea
                      name="description"
                      value={productForm.description}
                      onChange={handleFormChange}
                      className="w-full border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      rows={4}
                      required
                    />
                  </div>

                  {productForm.customisable && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-amber-700 mb-2">Custom Questions</label>
                      {customQuestions.map((question, idx) => (
                        <div key={idx} className="flex items-center mb-2">
                          <input
                            type="text"
                            value={question}
                            onChange={(e) => handleCustomQuestionChange(idx, e.target.value)}
                            className="flex-1 border border-amber-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder={`Question ${idx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomQuestion(idx)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addCustomQuestion}
                        className="mt-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 text-sm"
                      >
                        Add Question
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <FileUpload 
                        type="image" 
                        onFileSelect={setImageFile} 
                        currentFile={imageFile} 
                        placeholder="Upload Product Image"
                      />
                    </div>
                    <div>
                      <FileUpload 
                        type="video" 
                        onFileSelect={setVideoFile} 
                        currentFile={videoFile} 
                        placeholder="Upload Product Video (Optional)"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-8">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProduct(false);
                        setEditingProduct(null);
                        setImageFile(null);
                        setVideoFile(null);
                        setProductForm({
                          name: '',
                          price: '',
                          description: '',
                          category: '',
                          section: '',
                          weight: '',
                          instantDeliveryEligible: false,
                          customisable: false
                        });
                        setCustomQuestions([]);
                      }}
                      className="px-6 py-2 text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                    </button>
                  </div>
                </motion.form>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};