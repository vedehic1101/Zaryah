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
  AlertCircle
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

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    products, 
    deliveryCities, 
    currentTheme,
    updateProduct, 
    updateDeliveryCity,
    updateTheme 
  } = useApp();
  const { createNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('products');
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

  const pendingProducts = products.filter(p => p.status === 'pending');

  useEffect(() => {
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
          user_id: user.id,
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

  const tabs = [
    { id: 'products', name: 'Products', icon: Package },
    { id: 'notifications', name: 'Send Notifications', icon: Bell },
    { id: 'videos', name: 'Hero Videos', icon: VideoIcon },
    { id: 'delivery', name: 'Delivery Cities', icon: MapPin },
    { id: 'themes', name: 'Themes', icon: Palette }
  ];

  const stats = [
    { label: 'Total Products', value: products.length, icon: Package, color: 'bg-primary-600' },
    { label: 'Pending Reviews', value: pendingProducts.length, icon: Clock, color: 'bg-accent-600' },
    { label: 'Hero Videos', value: heroVideos.length, icon: VideoIcon, color: 'bg-accent-600' },
    { label: 'Delivery Cities', value: deliveryCities.filter(c => c.isActive).length, icon: Truck, color: 'bg-support-600' }
  ];

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-white/80 shadow-xl border-r border-blue-100 flex flex-col py-8 px-4 fixed z-20">
        <div className="mb-10 text-2xl font-extrabold text-blue-700 tracking-tight">Admin Dashboard</div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab('products')} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all relative ${activeTab === 'products' ? 'bg-blue-600 text-white shadow' : 'text-blue-700 hover:bg-blue-100'}`}>{activeTab === 'products' && <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r-lg" />}<Package className="w-5 h-5" /> Products</button>
          <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all relative ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow' : 'text-blue-700 hover:bg-blue-100'}`}>{activeTab === 'orders' && <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r-lg" />}<Truck className="w-5 h-5" /> Orders</button>
          <button onClick={() => setActiveTab('videos')} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all relative ${activeTab === 'videos' ? 'bg-blue-600 text-white shadow' : 'text-blue-700 hover:bg-blue-100'}`}>{activeTab === 'videos' && <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r-lg" />}<VideoIcon className="w-5 h-5" /> Hero Videos</button>
          <button onClick={() => setActiveTab('support')} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all relative ${activeTab === 'support' ? 'bg-blue-600 text-white shadow' : 'text-blue-700 hover:bg-blue-100'}`}>{activeTab === 'support' && <span className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-r-lg" />}<MessageSquare className="w-5 h-5" /> Support Tickets</button>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        <div className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <h2 className="text-3xl font-extrabold text-blue-800 mb-6 flex items-center gap-2"><Package className="w-7 h-7" /> Product Verification</h2>
                <div className="overflow-x-auto bg-white rounded-2xl shadow-lg p-6">
                  <table className="min-w-full bg-white rounded-xl">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Product</th>
                        <th className="px-4 py-2">Seller</th>
                        <th className="px-4 py-2">Mobile</th>
                        <th className="px-4 py-2">Verification Doc</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(product => (
                        <tr key={product.id} className="border-t">
                          <td className="px-4 py-2">{product.name}</td>
                          <td className="px-4 py-2">{product.sellerName}</td>
                          <td className="px-4 py-2">{product.sellerMobile || '-'}</td>
                          <td className="px-4 py-2">{product.sellerVerificationDoc || '-'}</td>
                          <td className="px-4 py-2">{product.status}</td>
                          <td className="px-4 py-2">
                            {product.status === 'pending' && (
                              <>
                                <button className="bg-green-500 hover:bg-green-700 text-white px-3 py-1 rounded text-xs mr-2" onClick={() => handleProductApproval(product.id, 'approved')}>Approve</button>
                                <button className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded text-xs" onClick={() => handleProductApproval(product.id, 'rejected')}>Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <h2 className="text-3xl font-extrabold text-blue-800 mb-6 flex items-center gap-2"><Truck className="w-7 h-7" /> All Orders</h2>
                <div className="overflow-x-auto bg-white rounded-2xl shadow-lg p-6">
                  {isOrdersLoading ? (
                    <div>Loading orders...</div>
                  ) : (
                    <table className="min-w-full bg-white rounded-xl">
                      <thead>
                        <tr>
                          <th className="px-4 py-2">Order ID</th>
                          <th className="px-4 py-2">Buyer</th>
                          <th className="px-4 py-2">Products</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(order => (
                          <tr key={order.id} className="border-t">
                            <td className="px-4 py-2">{order.id.slice(-8).toUpperCase()}</td>
                            <td className="px-4 py-2">{order.buyer?.name || 'Unknown'}</td>
                            <td className="px-4 py-2">
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx}>
                                  {item.product?.name} (Seller: {item.seller?.name || 'Unknown'}) x {item.quantity}
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-2">{order.status}</td>
                            <td className="px-4 py-2">{new Date(order.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            {/* Hero Videos Tab */}
            {activeTab === 'videos' && (
              <div>
                <h2 className="text-3xl font-extrabold text-blue-800 mb-6 flex items-center gap-2"><VideoIcon className="w-7 h-7" /> Hero Videos (Max 3)</h2>
                <div className="mb-4">
                  {heroVideos.length >= 3 && (
                    <div className="text-red-600 mb-2">Only 3 videos allowed. Uploading a new one will replace the oldest.</div>
                  )}
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={() => setShowVideoForm(true)}>Upload New Video</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {heroVideos.slice(0, 3).map((video, idx) => (
                    <div key={video.id} className="bg-white rounded-xl shadow p-4 flex flex-col">
                      <video src={video.video_url} controls className="w-full rounded mb-2" />
                      <div className="font-bold text-lg mb-1">{video.title}</div>
                      <div className="text-sm text-gray-700 mb-1">By: <span className="font-semibold">{video.maker_name}</span></div>
                      <div className="text-xs text-gray-600 mb-2">{video.description}</div>
                      <div className="flex gap-2 mt-auto">
                        <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs" onClick={() => handleEditVideo(video)}>Edit</button>
                        <button className="bg-red-500 text-white px-3 py-1 rounded text-xs" onClick={() => handleDeleteVideo(video.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Video upload form modal */}
                {showVideoForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
                    <div className="relative w-full max-w-lg mx-auto my-8 bg-white rounded-2xl shadow-xl p-6 overflow-y-auto max-h-[90vh]">
                      <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" onClick={() => { setShowVideoForm(false); setEditingVideo(null); setVideoFile(null); setThumbnailFile(null); }}>&times;</button>
                      <h3 className="text-xl font-bold mb-4">{editingVideo ? 'Edit' : 'Upload'} Hero Video</h3>
                      <form onSubmit={handleVideoSubmit} className="space-y-4">
                        <div>
                          <label className="block font-semibold mb-1">Title</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={videoForm.title} onChange={e => setVideoForm(v => ({ ...v, title: e.target.value }))} required />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Description</label>
                          <textarea className="w-full border rounded px-3 py-2" value={videoForm.description} onChange={e => setVideoForm(v => ({ ...v, description: e.target.value }))} required />
                        </div>
                        <FileUpload type="video" onFileSelect={setVideoFile} currentFile={videoFile} placeholder="Upload Hero Video" />
                        {videoUploading && <div className="text-blue-600 text-sm">Uploading video...</div>}
                        <FileUpload type="image" onFileSelect={setThumbnailFile} currentFile={thumbnailFile} placeholder="Upload Thumbnail (optional)" />
                        {thumbnailUploading && <div className="text-blue-600 text-sm">Uploading thumbnail...</div>}
                        <div>
                          <label className="block font-semibold mb-1">Maker Name (Seller)</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={videoForm.maker_name} onChange={e => setVideoForm(v => ({ ...v, maker_name: e.target.value }))} required />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Location</label>
                          <input type="text" className="w-full border rounded px-3 py-2" value={videoForm.location} onChange={e => setVideoForm(v => ({ ...v, location: e.target.value }))} />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold" disabled={videoUploading || thumbnailUploading}>{editingVideo ? 'Update' : 'Upload'}</button>
                          <button type="button" className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg" onClick={() => { setShowVideoForm(false); setEditingVideo(null); setVideoFile(null); setThumbnailFile(null); }}>Cancel</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Support Tickets Tab */}
            {activeTab === 'support' && (
              <div>
                <h2 className="text-3xl font-extrabold text-blue-800 mb-6 flex items-center gap-2"><MessageSquare className="w-7 h-7" /> Customer Support Tickets</h2>
                <div className="overflow-x-auto bg-white rounded-2xl shadow-lg p-6">
                  {isSupportLoading ? (
                    <div>Loading tickets...</div>
                  ) : selectedTicket ? (
                    <div className="bg-white rounded-xl p-4">
                      <button className="mb-4 text-blue-600" onClick={() => setSelectedTicket(null)}>&larr; Back to tickets</button>
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <div className="font-bold">{selectedTicket.subject}</div>
                          <div className="text-xs text-gray-600">{selectedTicket.user?.name || 'Unknown'} ({selectedTicket.user?.email})</div>
                        </div>
                        <div className="flex space-x-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{selectedTicket.status}</span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{selectedTicket.priority}</span>
                        </div>
                      </div>
                      <div className="mb-4">
                        <button className="mr-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs" onClick={() => handleUpdateTicketStatus('open')}>Open</button>
                        <button className="mr-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs" onClick={() => handleUpdateTicketStatus('in_progress')}>In Progress</button>
                        <button className="mr-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs" onClick={() => handleUpdateTicketStatus('resolved')}>Resolved</button>
                        <button className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs" onClick={() => handleUpdateTicketStatus('closed')}>Closed</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto mb-4 space-y-2">
                        {ticketMessages.map((msg: any) => (
                          <div key={msg.id} className={`flex ${msg.is_staff ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.is_staff ? 'bg-blue-100 text-blue-900' : 'bg-blush-600 text-white'}`}>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-medium">{msg.is_staff ? 'Support' : msg.user?.name || 'User'}</span>
                              </div>
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs mt-1 text-gray-500">{new Date(msg.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newSupportMessage}
                          onChange={e => setNewSupportMessage(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 border border-blue-300 rounded-lg px-3 py-2"
                          disabled={isSupportLoading}
                        />
                        <button
                          onClick={handleSendSupportMessage}
                          disabled={!newSupportMessage.trim() || isSupportLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ) : (
                    <table className="min-w-full bg-white rounded-xl">
                      <thead>
                        <tr>
                          <th className="px-4 py-2">Subject</th>
                          <th className="px-4 py-2">User</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Priority</th>
                          <th className="px-4 py-2">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supportTickets.map(ticket => (
                          <tr key={ticket.id} className="border-t cursor-pointer hover:bg-blue-50" onClick={() => handleSelectTicket(ticket)}>
                            <td className="px-4 py-2">{ticket.subject}</td>
                            <td className="px-4 py-2">{ticket.user?.name || 'Unknown'}</td>
                            <td className="px-4 py-2">{ticket.status}</td>
                            <td className="px-4 py-2">{ticket.priority}</td>
                            <td className="px-4 py-2">{new Date(ticket.updated_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
      </main>
    </div>
  );
};