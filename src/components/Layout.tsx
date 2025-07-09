import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  User, 
  Gift, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Package,
  History,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CartIcon } from './CartIcon';
import { CartSidebar } from './CartSidebar';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getBuyerNavigation = () => [
    { name: 'Home', href: '/', icon: Heart },
    { name: 'Shop', href: '/shop', icon: ShoppingBag },
    { name: 'Gift Suggester', href: '/gift-suggester', icon: Gift },
    { name: 'Hamper Builder', href: '/hamper-builder', icon: Package },
    ...(user ? [{ name: 'Orders', href: '/orders', icon: History }] : [])
  ];

  const getSellerNavigation = () => [
    { name: 'Dashboard', href: '/seller/dashboard', icon: User },
    { name: 'Orders', href: '/orders', icon: History },
  ];

  const getAdminNavigation = () => [
    { name: 'Dashboard', href: '/admin/dashboard', icon: User },
    { name: 'Orders', href: '/orders', icon: History },
  ];

  const getNavigation = () => {
    if (!user) return getBuyerNavigation();
    switch (user.role) {
      case 'seller': return getSellerNavigation();
      case 'admin': return getAdminNavigation();
      default: return getBuyerNavigation();
    }
  };

  const navigation = getNavigation();

  // Add this helper to check if any nav link is active
  const isAnyNavActive = navigation.some((item) => location.pathname === item.href);

  return (
    <div
      className="min-h-screen bg-cream-50"
    >
      {/* Header */}
      <header className="bg-cream-50/95 backdrop-blur-md border-b border-cream-200 sticky top-0 z-50 shadow-subtle">
        {/* Desktop header row */}
        <div className="hidden lg:flex w-full items-center justify-between py-6 px-4 xl:px-6">
          {/* Logo - Left Side */}
          <div className="flex-shrink-0 flex items-center justify-start">
            <Link to="/" className="flex items-center space-x-3">
              <span className="p-2 rounded-lg flex items-center justify-center transition-colors duration-200 bg-blush-100">
                <Sparkles className="w-7 h-7 xl:w-9 xl:h-9 transition-colors duration-200 text-blush-600" />
              </span>
              <span className="text-2xl xl:text-4xl font-bold font-serif transition-colors duration-200 text-blush-700">
                Artisan Market
              </span>
            </Link>
          </div>
          {/* Center Navigation */}
          <nav className="flex flex-1 items-center justify-center gap-x-6 xl:gap-x-14">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 text-lg xl:text-2xl font-semibold transition-colors duration-200 ${
                    isActive ? 'text-blush-700 underline underline-offset-8 decoration-2' : 'text-charcoal-900 hover:text-blush-600'
                  }`}
                  style={{ textDecoration: 'none', background: 'none', boxShadow: 'none', padding: 0 }}
                >
                  <Icon className="w-6 h-6 xl:w-8 xl:h-8" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          {/* Right Side - User Menu */}
          <div className="flex items-center justify-end gap-3 xl:gap-5 ml-auto">
            {user && <NotificationCenter />}
            {/* Only show CartIcon for buyers or unauthenticated users */}
            {(!user || user.role === 'buyer') && <CartIcon />}
            {!user && (
              <>
                <Link
                  to="/login"
                  className="bg-blush-100 text-blush-700 hover:bg-blush-200 rounded-xl px-4 xl:px-8 py-2 xl:py-3 font-bold text-lg xl:text-2xl transition-colors"
                  style={{ boxShadow: 'none' }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-blush-600 border border-blush-600 text-white hover:bg-blush-700 hover:border-blush-700 rounded-xl px-4 xl:px-8 py-2 xl:py-3 font-bold text-lg xl:text-2xl transition-colors shadow-lg"
                  style={{ boxShadow: 'none' }}
                >
                  Register
                </Link>
              </>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="bg-cream-100 text-charcoal-700 hover:bg-cream-200 rounded-xl px-4 xl:px-6 py-2 xl:py-3 font-bold text-lg xl:text-xl transition-colors flex items-center space-x-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden xl:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Tablet header */}
        <div className="hidden md:flex lg:hidden w-full items-center justify-between py-4 px-4">
          <Link to="/" className="flex items-center space-x-2">
            <span className="p-2 rounded-lg flex items-center justify-center transition-colors duration-200 bg-blush-100">
              <Sparkles className="w-6 h-6 transition-colors duration-200 text-blush-600" />
            </span>
            <span className="text-xl font-bold font-serif transition-colors duration-200 text-blush-700">
              Artisan Market
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            {user && <NotificationCenter />}
            {/* Only show CartIcon for buyers or unauthenticated users */}
            {(!user || user.role === 'buyer') && <CartIcon />}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-charcoal-900 hover:text-charcoal-100 hover:bg-neutral-100 rounded-xl transition-all"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile header: logo/icons row */}
        <div className="md:hidden w-full px-4 pt-3 pb-2 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <span className="p-2 rounded-lg flex items-center justify-center transition-colors duration-200 bg-blush-100">
              <Sparkles className="w-6 h-6 transition-colors duration-200 text-blush-600" />
            </span>
            <span className="text-lg font-bold font-serif transition-colors duration-200 text-blush-700">
              Artisan Market
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            {user && <NotificationCenter />}
            {/* Only show CartIcon for buyers or unauthenticated users */}
            {(!user || user.role === 'buyer') && <CartIcon />}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-charcoal-900 hover:text-charcoal-100 hover:bg-neutral-100 rounded-xl transition-all"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile search bar row - only show on shop page */}
        <div className="md:hidden w-full px-4 pb-3">
          <div className="flex items-center bg-white rounded-2xl px-4 py-3 border border-cream-200 shadow focus-within:ring-2 focus-within:ring-blush-300 transition-all">
            <svg className="w-5 h-5 text-charcoal-400 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input type="text" placeholder="Search our marketplace" className="bg-transparent outline-none flex-1 text-base text-charcoal-700 placeholder-charcoal-400" />
          </div>
        </div>
        
        {/* Mobile/Tablet nav dropdown */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden bg-white border-t border-cream-200 px-4 py-4 shadow-xl rounded-b-2xl z-50"
            style={{ position: 'absolute', left: 0, right: 0, top: '100%' }}
          >
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-4 px-6 py-3 rounded-xl transition-all text-base ${
                      isActive
                        ? 'bg-blush-100 text-blush-700'
                        : 'text-charcoal-900 hover:text-blush-700 hover:bg-cream-100'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="font-semibold">{item.name}</span>
                  </Link>
                );
              })}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-4 px-6 py-3 rounded-xl text-charcoal-900 hover:text-blush-700 hover:bg-cream-100 w-full transition-all text-base"
                >
                  <LogOut className="w-6 h-6" />
                  <span className="font-semibold">Logout</span>
                </button>
              ) : (
                <div className="flex space-x-4 pt-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 text-center text-charcoal-900 hover:text-blush-700 font-semibold px-6 py-3 rounded-xl hover:bg-cream-100 transition-all text-base"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 text-center bg-blush-600 hover:bg-blush-700 text-white px-6 py-3 rounded-xl transition-all font-semibold shadow-soft text-base"
                  >
                    Register
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Cart Sidebar */}
      <CartSidebar />

      {/* Footer */}
      <footer className="bg-cream-50 border-t border-blush-100 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2 lg:col-span-2">
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-blush-600 p-2 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl lg:text-3xl font-bold text-charcoal-800 font-serif">GiftFlare</span>
              </div>
              <p className="text-charcoal-600 mb-6 lg:mb-8 max-w-md text-base lg:text-lg leading-relaxed">
                Connecting discerning gift-givers with exceptional artisans. Every purchase supports 
                traditional craftsmanship and preserves cultural heritage.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="bg-mint-100 text-mint-700 px-3 lg:px-4 py-2 rounded-full text-sm lg:text-lg font-medium border border-mint-200">
                  🌱 Sustainable
                </div>
                <div className="bg-blush-100 text-blush-700 px-3 lg:px-4 py-2 rounded-full text-sm lg:text-lg font-medium border border-blush-200">
                  🤝 Artisan-focused
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-charcoal-800 mb-4 lg:mb-6 text-lg lg:text-2xl">Quick Links</h3>
              <ul className="space-y-3">
                <li><Link to="/shop" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Browse Collections</Link></li>
                <li><Link to="/gift-suggester" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Gift Discovery</Link></li>
                <li><Link to="/hamper-builder" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Build Collection</Link></li>
                <li><Link to="/register" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Become a Seller</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-charcoal-800 mb-4 lg:mb-6 text-lg lg:text-2xl">Support</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Help Center</a></li>
                <li><a href="#" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Shipping Info</a></li>
                <li><a href="#" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Returns</a></li>
                <li><a href="#" className="text-charcoal-600 hover:text-charcoal-800 transition-colors text-sm lg:text-lg">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blush-100 mt-8 lg:mt-12 pt-6 lg:pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm lg:text-lg text-charcoal-600 mb-4 md:mb-0 text-center md:text-left">
              © 2024 GiftFlare. Crafted with care for artisans everywhere.
            </p>
            <div className="flex items-center space-x-4 lg:space-x-6 text-sm lg:text-lg text-charcoal-600">
              <a href="#" className="hover:text-charcoal-800 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-charcoal-800 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};