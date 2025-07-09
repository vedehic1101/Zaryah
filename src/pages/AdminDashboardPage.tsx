import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Package, 
  MapPin, 
  Palette, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Verified,
  Truck,
  Video as VideoIcon,
  Plus,
  Edit,
  Trash2,
  Send,
  Bell,
  MessageSquare,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Star,
  Filter,
  Search,
  Calendar,
  Download,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { orderService } from '../services/orderService';
import { FileUpload } from '../components/FileUpload';

interface HeroVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  maker_name: string;
  location: string;
  is_active: boolean;
  order_index: number;
}

interface NotificationForm {
  type: 'order' | 'delivery' | 'system' | 'chat' | 'promotion';
  title: string;
  message: string;
  targetUsers: 'all' | 'buyers' | 'sellers';
}

interface Analytics {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyGrowth: number;
  topProducts: any[];
  recentActivity: any[];
}

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    products, 
    deliveryCities, 
    currentTheme,
    updateProduct, 
    updateDeliveryCity,
    updateTheme,
    refreshData
  } = useApp();
  const { createNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [heroVideos, setHeroVideos] = useState<HeroVideo[]>([]);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<HeroVideo | null>(null);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    maker_name: '',
    location: '',
    is_active: true,
    order_index: 1
  });
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    type: 'system',
    title: '',
    message: '',
    targetUsers: 'all'
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [newSupportMessage, setNewSupportMessage] = useState('');
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const pendingProducts = products.filter(p => p.status === 'pending');
  const approvedProducts = products.filter(p => p.status === 'approved');
  const rejectedProducts = products.filter(p => p.status === 'rejected');

  useEffect(() => {
    fetchAnalytics();
    if (activeTab === 'videos') {
      fetchHeroVideos();
    }
    if (activeTab === 'orders') {
      fetchAllOrders();
    }
    if (activeTab === 'support') {
      fetchAllSupportTickets();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch orders
      const allOrders = await orderService.getAllOrders();
      const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total_amount / 100), 0);

      // Calculate monthly growth (mock data for demo)
      const monthlyGrowth = 15.2;

      // Get top products by order frequency
      const productOrderCount: Record<string, number> = {};
      allOrders.forEach(order => {
        order.items.forEach((item: any) => {
          const productId = item.product.id;
          productOrderCount[productId] = (productOrderCount[productId] || 0) + item.quantity;
        });
      });

      const topProducts = Object.entries(productOrderCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([productId, count]) => {
          const product = products.find(p => p.id === productId);
          return { product, orderCount: count };
        })
        .filter(item => item.product);

      // Recent activity (last 10 orders)
      const recentActivity = allOrders.slice(0, 10).map(order => ({
        type: 'order',
        description: `New order #${order.id.slice(-8)} - ₹${(order.total_amount / 100).toLocaleString()}`,
        timestamp: order.created_at,
        status: order.status
      }));

      setAnalytics({
        totalUsers: usersCount || 0,
        totalOrders: allOrders.length,
        totalRevenue,
        monthlyGrowth,
        topProducts,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchHeroVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_videos')
        .select('*')
        .order('order_index');

      if (error) {
        console.error('Error fetching hero videos:', error);
        return;
      }

      setHeroVideos(data || []);
    } catch (error) {
      console.error('Error in fetchHeroVideos:', error);
    }
  };

  const fetchAllOrders = async () => {
    setIsOrdersLoading(true);
    try {
      const allOrders = await orderService.getAllOrders();
      setOrders(allOrders);
    } catch (err) {
      setOrders([]);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  const fetchAllSupportTickets = async () => {
    setIsSupportLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, user:profiles!support_tickets_user_id_fkey (name, email, id)')
        .order('updated_at', { ascending: false });
      setSupportTickets(data || []);
    } catch (err) {
      setSupportTickets([]);
    } finally {
      setIsSupportLoading(false);
    }
  };

  const fetchTicketMessages = async (ticketId: string) => {
    setIsSupportLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*, user:profiles!support_messages_user_id_fkey (name, role)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      setTicketMessages(data || []);
    } catch (err) {
      setTicketMessages([]);
    } finally {
      setIsSupportLoading(false);
    }
  };

  const handleProductApproval = async (productId: string, status: 'approved' | 'rejected') => {
    const success = await updateProduct(productId, { status });
    if (success) {
      toast.success(`Product ${status} successfully`);
      
      // Send notification to seller
      const product = products.find(p => p.id === productId);
      if (product) {
        await createNotification({
          type: 'system',
          title: `Product ${status}`,
          message: `Your product "${product.name}" has been ${status} by admin.`,
          data: { product_id: productId, status }
        });
      }
      await refreshData();
    } else {
      toast.error('Failed to update product status');
    }
  };

  const handleDeliveryCityToggle = async (cityId: string, isActive: boolean) => {
    const success = await updateDeliveryCity(cityId, isActive);
    if (success) {
      toast.success(`Delivery city ${isActive ? 'activated' : 'deactivated'}`);
    } else {
      toast.error('Failed to update delivery city');
    }
  };

  const handleThemeChange = async (themeName: string) => {
    const success = await updateTheme(themeName);
    if (success) {
      toast.success('Theme updated successfully');
    } else {
      toast.error('Failed to update theme');
    }
  };

  const uploadToStorage = async (file: File, pathPrefix: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('hero-videos').upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('hero-videos').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let videoUrl = videoForm.video_url;
      let thumbnailUrl = videoForm.thumbnail_url;
      if (videoFile) {
        setVideoUploading(true);
        videoUrl = await uploadToStorage(videoFile, 'video');
        setVideoUploading(false);
      }
      if (thumbnailFile) {
        setThumbnailUploading(true);
        thumbnailUrl = await uploadToStorage(thumbnailFile, 'thumbnail');
        setThumbnailUploading(false);
      }
      const formToSave = { ...videoForm, video_url: videoUrl, thumbnail_url: thumbnailUrl };
      if (editingVideo) {
        const { error } = await supabase.from('hero_videos').update(formToSave).eq('id', editingVideo.id);
        if (error) throw error;
        toast.success('Video updated successfully');
      } else {
        const { error } = await supabase.from('hero_videos').insert([formToSave]);
        if (error) throw error;
        toast.success('Video added successfully');
      }
      setVideoForm({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        maker_name: '',
        location: '',
        is_active: true,
        order_index: 1
      });
      setVideoFile(null);
      setThumbnailFile(null);
      setShowVideoForm(false);
      setEditingVideo(null);
      fetchHeroVideos();
    } catch (error) {
      setVideoUploading(false);
      setThumbnailUploading(false);
      console.error('Error saving video:', error);
      toast.error('Failed to save video');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      try {
        const { error } = await supabase
          .from('hero_videos')
          .delete()
          .eq('id', videoId);

        if (error) throw error;
        toast.success('Video deleted successfully');
        fetchHeroVideos();
      } catch (error) {
        console.error('Error deleting video:', error);
        toast.error('Failed to delete video');
      }
    }
  };

  const handleEditVideo = (video: HeroVideo) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
      maker_name: video.maker_name,
      location: video.location,
      is_active: video.is_active,
      order_index: video.order_index
    });
    setShowVideoForm(true);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get target users based on selection
      let targetUserIds: string[] = [];
      
      if (notificationForm.targetUsers === 'all') {
        const { data } = await supabase
          .from('profiles')
          .select('id');
        targetUserIds = data?.map(p => p.id) || [];
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', notificationForm.targetUsers === 'buyers' ? 'buyer' : 'seller');
        targetUserIds = data?.map(p => p.id) || [];
      }

      // Send notification to each user
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        type: notificationForm.type,
        title: notificationForm.title,
        message: notificationForm.message,
        data: { sent_by: 'admin', timestamp: new Date().toISOString() }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast.success(`Notification sent to ${targetUserIds.length} users`);
      setNotificationForm({
        type: 'system',
        title: '',
        message: '',
        targetUsers: 'all'
      });
      setShowNotificationForm(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const handleSelectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    fetchTicketMessages(ticket.id);
  };

  const handleSendSupportMessage = async () => {
    if (!selectedTicket || !newSupportMessage.trim()) return;
    setIsSupportLoading(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user!.id,
          message: newSupportMessage,
          is_staff: true
        });
      setNewSupportMessage('');
      fetchTicketMessages(selectedTicket.id);
    } catch (err) {}
    setIsSupportLoading(false);
  };

  const handleUpdateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;
    setIsSupportLoading(true);
    try {
      await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);
      setSelectedTicket({ ...selectedTicket, status });
      fetchAllSupportTickets();
    } catch (err) {}
    setIsSupportLoading(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.buyer?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'today' && new Date(order.created_at).toDateString() === new Date().toDateString()) ||
                       (dateFilter === 'week' && new Date(order.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    return matchesSearch && matchesDate;
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'products', name: 'Products', icon: Package },
    { id: 'orders', name: 'Orders', icon: ShoppingBag },
    { id: 'videos', name: 'Hero Videos', icon: VideoIcon },
    { id: 'support', name: 'Support', icon: MessageSquare },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'settings', name: 'Settings', icon: MapPin }
  ];

  const stats = [
    { 
      label: 'Total Users', 
      value: analytics?.totalUsers || 0, 
      icon: Users, 
      color: 'bg-blue-600',
      change: '+12%',
      changeType: 'positive' as const
    },
    { 
      label: 'Total Orders', 
      value: analytics?.totalOrders || 0, 
      icon: ShoppingBag, 
      color: 'bg-green-600',
      change: '+8%',
      changeType: 'positive' as const
    },
    { 
      label: 'Revenue', 
      value: `₹${analytics?.totalRevenue.toLocaleString() || 0}`, 
      icon: DollarSign, 
      color: 'bg-purple-600',
      change: `+${analytics?.monthlyGrowth || 0}%`,
      changeType: 'positive' as const
    },
    { 
      label: 'Pending Reviews', 
      value: pendingProducts.length, 
      icon: Clock, 
      color: 'bg-amber-600',
      change: '-5%',
      changeType: 'negative' as const
    }
  ];

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Enhanced Sidebar */}
      <aside className="w-64 min-h-screen bg-white/90 backdrop-blur-sm shadow-xl border-r border-blue-100 flex flex-col py-8 px-4 fixed z-20">
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blue-900">Admin Panel</h1>
              <p className="text-xs text-blue-600">GiftFlare Management</p>
            </div>
          </div>
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
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-blue-700 hover:bg-blue-100'
                }`}
              >
                {activeTab === tab.id && (
                  <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r-lg" />
                )}
                <Icon className="w-5 h-5" />
                {tab.name}
                {tab.id === 'products' && pendingProducts.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {pendingProducts.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-blue-100">
          <div className="text-xs text-blue-600 text-center">
            Logged in as {user?.name}
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
                  <h2 className="text-3xl font-bold text-blue-900">Dashboard Overview</h2>
                  <p className="text-blue-700 mt-1">Welcome back, {user?.name}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export Report</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition-shadow"
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
                        <p className="text-2xl font-bold text-blue-900 mb-1">{stat.value}</p>
                        <p className="text-sm text-blue-700">{stat.label}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Charts and Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Products */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Top Products</h3>
                  <div className="space-y-4">
                    {analytics?.topProducts.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900">{item.product.name}</h4>
                          <p className="text-sm text-blue-600">{item.orderCount} orders</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-900">₹{item.product.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {analytics?.recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <ShoppingBag className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-blue-900">{activity.description}</p>
                          <p className="text-xs text-blue-600">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          activity.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-blue-900">Product Management</h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-blue-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Product</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Seller</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Price</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div>
                                <h4 className="font-medium text-blue-900">{product.name}</h4>
                                <p className="text-sm text-blue-600">{product.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-blue-900">{product.sellerName}</span>
                              {product.instantDeliveryEligible && (
                                <Truck className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-blue-900">
                            ₹{product.price.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              product.status === 'approved' ? 'bg-green-100 text-green-700' :
                              product.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-blue-600">
                            {new Date(product.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {product.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleProductApproval(product.id, 'approved')}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleProductApproval(product.id, 'rejected')}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button className="text-blue-600 hover:text-blue-800 p-1">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-blue-900">Order Management</h2>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="w-5 h-5 text-blue-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="border border-blue-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                {isOrdersLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-blue-600 mt-2">Loading orders...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Order ID</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Customer</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Items</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Total</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Date</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-sm">
                              #{order.id.slice(-8).toUpperCase()}
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-blue-900">{order.buyer?.name || 'Unknown'}</p>
                                <p className="text-sm text-blue-600">{order.buyer?.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {order.items.slice(0, 2).map((item: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    <span className="text-blue-900">{item.product?.name}</span>
                                    <span className="text-blue-600"> x{item.quantity}</span>
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <p className="text-xs text-blue-600">+{order.items.length - 2} more</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-blue-900">
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
                            <td className="px-6 py-4 text-sm text-blue-600">
                              {new Date(order.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <button className="text-blue-600 hover:text-blue-800 p-1">
                                <Eye className="w-4 h-4" />
                              </button>
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

          {/* Hero Videos Tab */}
          {activeTab === 'videos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-blue-900">Hero Videos Management</h2>
                <button
                  onClick={() => setShowVideoForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Video</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {heroVideos.map((video) => (
                  <div key={video.id} className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                    <div className="aspect-video bg-gray-100">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">{video.title}</h3>
                      <p className="text-sm text-blue-600 mb-2">{video.description}</p>
                      <div className="flex items-center justify-between text-xs text-blue-500 mb-4">
                        <span>by {video.maker_name}</span>
                        <span>{video.location}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          video.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {video.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditVideo(video)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(video.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Video Form Modal */}
              {showVideoForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center p-6 border-b border-blue-200">
                      <h3 className="text-xl font-bold text-blue-900">
                        {editingVideo ? 'Edit Video' : 'Add New Video'}
                      </h3>
                      <button
                        onClick={() => {
                          setShowVideoForm(false);
                          setEditingVideo(null);
                          setVideoFile(null);
                          setThumbnailFile(null);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleVideoSubmit} className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-2">Title</label>
                          <input
                            type="text"
                            value={videoForm.title}
                            onChange={(e) => setVideoForm(v => ({ ...v, title: e.target.value }))}
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-2">Maker Name</label>
                          <input
                            type="text"
                            value={videoForm.maker_name}
                            onChange={(e) => setVideoForm(v => ({ ...v, maker_name: e.target.value }))}
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">Description</label>
                        <textarea
                          value={videoForm.description}
                          onChange={(e) => setVideoForm(v => ({ ...v, description: e.target.value }))}
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">Location</label>
                        <input
                          type="text"
                          value={videoForm.location}
                          onChange={(e) => setVideoForm(v => ({ ...v, location: e.target.value }))}
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FileUpload 
                            type="video" 
                            onFileSelect={setVideoFile} 
                            currentFile={videoFile} 
                            placeholder="Upload Video"
                          />
                          {videoUploading && <p className="text-blue-600 text-sm mt-2">Uploading video...</p>}
                        </div>
                        <div>
                          <FileUpload 
                            type="image" 
                            onFileSelect={setThumbnailFile} 
                            currentFile={thumbnailFile} 
                            placeholder="Upload Thumbnail"
                          />
                          {thumbnailUploading && <p className="text-blue-600 text-sm mt-2">Uploading thumbnail...</p>}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={videoForm.is_active}
                            onChange={(e) => setVideoForm(v => ({ ...v, is_active: e.target.checked }))}
                            className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-blue-900">Active</span>
                        </label>
                        <div>
                          <label className="block text-sm font-medium text-blue-900 mb-1">Order</label>
                          <input
                            type="number"
                            value={videoForm.order_index}
                            onChange={(e) => setVideoForm(v => ({ ...v, order_index: parseInt(e.target.value) }))}
                            className="w-20 border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-4 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowVideoForm(false);
                            setEditingVideo(null);
                            setVideoFile(null);
                            setThumbnailFile(null);
                          }}
                          className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={videoUploading || thumbnailUploading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {editingVideo ? 'Update Video' : 'Add Video'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-blue-900">Customer Support</h2>
              
              <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                {isSupportLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-blue-600 mt-2">Loading support tickets...</p>
                  </div>
                ) : selectedTicket ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="text-blue-600 hover:text-blue-800 flex items-center space-x-2"
                      >
                        <span>←</span>
                        <span>Back to tickets</span>
                      </button>
                      <div className="flex items-center space-x-4">
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                          className="border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-blue-900">{selectedTicket.subject}</h3>
                      <p className="text-sm text-blue-600">
                        {selectedTicket.user?.name} ({selectedTicket.user?.email})
                      </p>
                    </div>

                    <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                      {ticketMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.is_staff ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.is_staff
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-blue-600 text-white'
                          }`}>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium">
                                {message.is_staff ? 'Support' : message.user?.name || 'User'}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                            <p className="text-xs mt-1 opacity-75">
                              {new Date(message.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newSupportMessage}
                        onChange={(e) => setNewSupportMessage(e.target.value)}
                        placeholder="Type your reply..."
                        className="flex-1 border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isSupportLoading}
                      />
                      <button
                        onClick={handleSendSupportMessage}
                        disabled={!newSupportMessage.trim() || isSupportLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Subject</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">User</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Status</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Priority</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {supportTickets.map((ticket) => (
                          <tr
                            key={ticket.id}
                            onClick={() => handleSelectTicket(ticket)}
                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 font-medium text-blue-900">{ticket.subject}</td>
                            <td className="px-6 py-4 text-blue-600">{ticket.user?.name || 'Unknown'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.status === 'open' ? 'bg-green-100 text-green-700' :
                                ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                ticket.status === 'resolved' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {ticket.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-blue-600">
                              {new Date(ticket.updated_at).toLocaleString()}
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

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-blue-900">Send Notifications</h2>
                <button
                  onClick={() => setShowNotificationForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>New Notification</span>
                </button>
              </div>

              {showNotificationForm && (
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                  <form onSubmit={handleSendNotification} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">Type</label>
                        <select
                          value={notificationForm.type}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="system">System</option>
                          <option value="promotion">Promotion</option>
                          <option value="order">Order</option>
                          <option value="delivery">Delivery</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">Target Users</label>
                        <select
                          value={notificationForm.targetUsers}
                          onChange={(e) => setNotificationForm(prev => ({ ...prev, targetUsers: e.target.value as any }))}
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="all">All Users</option>
                          <option value="buyers">Buyers Only</option>
                          <option value="sellers">Sellers Only</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">Title</label>
                      <input
                        type="text"
                        value={notificationForm.title}
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-2">Message</label>
                      <textarea
                        value={notificationForm.message}
                        onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowNotificationForm(false)}
                        className="px-4 py-2 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        Send Notification
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-blue-900">Platform Settings</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Delivery Cities */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Delivery Cities</h3>
                  <div className="space-y-3">
                    {deliveryCities.map((city) => (
                      <div key={city.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium text-blue-900">{city.name}</span>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={city.isActive}
                            onChange={(e) => handleDeliveryCityToggle(city.id, e.target.checked)}
                            className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-blue-600">Active</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Theme Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Theme Settings</h3>
                  <div className="space-y-3">
                    {['default', 'christmas', 'diwali'].map((theme) => (
                      <div key={theme} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="font-medium text-blue-900 capitalize">{theme}</span>
                        <button
                          onClick={() => handleThemeChange(theme)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            currentTheme.name === theme
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        >
                          {currentTheme.name === theme ? 'Active' : 'Activate'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};