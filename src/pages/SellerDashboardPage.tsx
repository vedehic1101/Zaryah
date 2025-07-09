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
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { FileUpload } from '../components/FileUpload';
import { orderService, OrderData } from '../services/orderService';
import toast from 'react-hot-toast';

export const SellerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { products, addProduct, deliveryCities } = useApp();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
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
  const [analytics, setAnalytics] = useState<any>(null);

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
      // Fetch all orders, then filter for those containing this seller's products
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
    // Simple analytics: count products sold, sales per month, and history
    // This assumes each order item has a product and quantity
    const allOrders = await orderService.getAllOrders();
    const sellerProductIds = sellerProducts.map(p => p.id);
    let totalSold = 0;
    let monthwise: Record<string, number> = {};
    let history: any[] = [];
    allOrders.forEach(order => {
      order.items.forEach((item: any) => {
        if (sellerProductIds.includes(item.product.id)) {
          totalSold += item.quantity;
          const month = new Date(order.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
          monthwise[month] = (monthwise[month] || 0) + item.quantity;
          history.push({
            orderId: order.id,
            productName: item.product.name,
            quantity: item.quantity,
            date: order.created_at,
            status: order.status
          });
        }
      });
    });
    setAnalytics({ totalSold, monthwise, history });
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
    // Remove product from supabase
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
    
    if (!user || !imageFile) {
      alert('Please upload a product image');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real app, you would upload files to a storage service like Supabase Storage
      // For now, we'll create object URLs for demo purposes
      const imageUrl = URL.createObjectURL(imageFile);
      const videoUrl = videoFile ? URL.createObjectURL(videoFile) : undefined;

      const success = await addProduct({
        sellerId: user.id,
        name: productForm.name,
        price: parseInt(productForm.price),
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

      if (success) {
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
      }
    } catch (error) {
      console.error('Error adding product:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-4xl font-bold text-amber-900 mb-2">
                Welcome back, {user?.name}
              </h1>
              <p className="text-lg text-amber-700">
                {user?.businessName && (
                  <span className="font-medium text-amber-600">{user.businessName}</span>
                )}
                {user?.businessName && ' • '}
                Manage your products and grow your business
              </p>
              {user?.mobile && (
                <div className="text-sm text-amber-700 mt-2">Mobile: {user.mobile}</div>
              )}
              {user?.verificationDoc && (
                <div className="text-sm text-amber-700 mt-1">Verification: {user.verificationDoc}</div>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddProduct(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 self-start lg:self-auto shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add New Product</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: 'Total Products', 
              value: stats.total, 
              icon: Package, 
              color: 'bg-blue-600',
              change: '+12%',
              changeType: 'positive'
            },
            { 
              label: 'Approved Products', 
              value: stats.approved, 
              icon: CheckCircle, 
              color: 'bg-green-600',
              change: '+8%',
              changeType: 'positive'
            },
            { 
              label: 'Total Views', 
              value: stats.totalViews, 
              icon: Eye, 
              color: 'bg-purple-600',
              change: '+24%',
              changeType: 'positive'
            },
            { 
              label: 'Revenue', 
              value: `₹${stats.totalRevenue.toLocaleString()}`, 
              icon: DollarSign, 
              color: 'bg-amber-600',
              change: '+15%',
              changeType: 'positive'
            }
          ].map((stat, index) => {
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

        {/* Delivery Status */}
        {canOfferInstantDelivery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 rounded-2xl mb-8"
          >
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
          </motion.div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-amber-900">Pending Review</h3>
            </div>
            <p className="text-2xl font-bold text-amber-900 mb-2">{stats.pending}</p>
            <p className="text-sm text-amber-700">Products awaiting approval</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-pink-100 p-2 rounded-lg">
                <Heart className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="font-semibold text-amber-900">Customer Favorites</h3>
            </div>
            <p className="text-2xl font-bold text-amber-900 mb-2">{Math.floor(stats.totalViews / 10)}</p>
            <p className="text-sm text-amber-700">Products liked by customers</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-amber-900">This Month</h3>
            </div>
            <p className="text-2xl font-bold text-amber-900 mb-2">+{Math.floor(Math.random() * 50) + 10}</p>
            <p className="text-sm text-amber-700">New product views</p>
          </motion.div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200 bg-amber-50">
            <h2 className="text-xl font-semibold text-amber-900">Your Products</h2>
          </div>

          {sellerProducts.length === 0 ? (
            <div className="p-16 text-center">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
              {sellerProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-amber-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow border border-amber-200"
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
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-amber-600">
                        ₹{product.price.toLocaleString()}
                      </span>
                      <div className="flex items-center space-x-2 text-xs text-amber-600">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="mt-3 bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-amber-900 mb-4">Orders for Your Products</h2>
          {isOrdersLoading ? (
            <div>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-amber-700">No orders for your products yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-xl">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Order ID</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Products</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-t">
                      <td className="px-4 py-2">{order.id.slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        {order.items
                          .filter((item: any) => sellerProducts.some(p => p.id === item.product.id))
                          .map((item: any, idx: number) => (
                            <div key={idx}>{item.product.name} x {item.quantity}</div>
                          ))}
                      </td>
                      <td className="px-4 py-2">{order.status}</td>
                      <td className="px-4 py-2">
                        {order.status === 'pending' && (
                          <button
                            className="bg-green-500 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                            onClick={() => handleConfirmOrder(order.id)}
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Analytics Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-amber-900 mb-4">Sales Analytics & History</h2>
          {analytics ? (
            <div>
              <div className="mb-4">Total Products Sold: <span className="font-bold">{analytics.totalSold}</span></div>
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Monthwise Sales</h3>
                <ul>
                  {Object.entries(analytics.monthwise).map(([month, count]) => (
                    <li key={month}>{month}: {count}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Sales History</h3>
                <table className="min-w-full bg-white rounded-xl">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Order ID</th>
                      <th className="px-4 py-2">Product</th>
                      <th className="px-4 py-2">Quantity</th>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.history.map((row: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{row.orderId.slice(-8).toUpperCase()}</td>
                        <td className="px-4 py-2">{row.productName}</td>
                        <td className="px-4 py-2">{row.quantity}</td>
                        <td className="px-4 py-2">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>Loading analytics...</div>
          )}
        </div>

        {/* Add Product Modal */}
        <AnimatePresence>
          {showAddProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <motion.form
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl relative"
              >
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold mb-6 text-amber-900">Add New Product</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      name="name"
                      value={productForm.name}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      name="price"
                      value={productForm.price}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <input
                      type="text"
                      name="section"
                      value={productForm.section}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (grams)</label>
                    <input
                      type="number"
                      name="weight"
                      value={productForm.weight}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={productForm.description}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      name="category"
                      value={productForm.category}
                      onChange={handleFormChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instant Delivery</label>
                    <input
                      type="checkbox"
                      name="instantDeliveryEligible"
                      checked={productForm.instantDeliveryEligible}
                      onChange={handleFormChange}
                      className="ml-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customisable</label>
                    <input
                      type="checkbox"
                      name="customisable"
                      checked={productForm.customisable}
                      onChange={handleFormChange}
                      className="ml-2"
                    />
                  </div>
                  {productForm.customisable && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Custom Questions</label>
                      {customQuestions.map((q, idx) => (
                        <div key={idx} className="flex items-center mb-2">
                          <input
                            type="text"
                            value={q}
                            onChange={e => handleCustomQuestionChange(idx, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder={`Question ${idx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomQuestion(idx)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addCustomQuestion}
                        className="mt-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200"
                      >
                        Add Question
                      </button>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                    <FileUpload onFileSelect={setImageFile} accept="image/*" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Video (optional)</label>
                    <FileUpload onFileSelect={setVideoFile} accept="video/*" />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-8 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Product'}
                </button>
              </motion.form>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};