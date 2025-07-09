import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user?: { name: string };
}

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [customAnswers, setCustomAnswers] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (product) fetchSimilarProducts();
    // eslint-disable-next-line
  }, [product]);

  const fetchProduct = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    setProduct(data);
    setCustomAnswers(data?.customQuestions ? Array(data.customQuestions.length).fill('') : []);
    setIsLoading(false);
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, user:profiles!reviews_user_id_fkey (name)')
      .eq('product_id', id)
      .order('created_at', { ascending: false });
    setReviews(data || []);
  };

  const fetchSimilarProducts = async () => {
    if (!product) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .neq('id', product.id)
      .or(`category.eq.${product.category},section.eq.${product.section}`)
      .limit(4);
    setSimilarProducts(data || []);
  };

  const handleCustomAnswerChange = (idx: number, value: string) => {
    setCustomAnswers(prev => prev.map((a, i) => (i === idx ? value : a)));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setReviewSubmitting(true);
    await supabase.from('reviews').insert({
      product_id: id,
      user_id: user.id,
      rating: reviewRating,
      comment: reviewText
    });
    setReviewText('');
    setReviewRating(5);
    setReviewSubmitting(false);
    fetchReviews();
  };

  // Helper to display price in rupees
  const getDisplayPrice = (price: number) => {
    // If price is more than 1000, assume it's in paise and convert to rupees
    return price > 1000 ? (price / 100) : price;
  };

  if (isLoading || !product) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium shadow"
      >
        <span className="text-xl">←</span> Go Back
      </button>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 flex flex-col items-center md:items-start">
          <img src={product.image} alt={product.name} className="w-full max-w-md rounded-2xl object-cover shadow-lg mb-4" />
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-3 text-blush-900">{product.name}</h1>
          <div className="text-2xl text-blush-700 font-bold mb-3">₹{getDisplayPrice(Number(product.price)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          <div className="mb-2 text-base text-gray-700">Section: <span className="font-semibold">{product.section || '-'}</span></div>
          <div className="mb-2 text-base text-gray-700">Weight: <span className="font-semibold">{product.weight ? `${product.weight}g` : '-'}</span></div>
          <div className="mb-2 text-base text-gray-700">Seller: <span className="font-semibold">{product.sellerName || '-'}</span></div>
          {product.customisable && (
            <div className="mb-2 text-base text-mint-700 font-semibold">Customisable</div>
          )}
          {product.customisable && product.customQuestions && (
            <div className="mb-4 p-4 bg-mint-50 rounded-xl border border-mint-200">
              <h3 className="font-semibold mb-2 text-mint-900">Customisation Options</h3>
              {product.customQuestions.map((q: string, idx: number) => (
                <div key={idx} className="mb-2">
                  <label className="text-base font-medium">{q}</label>
                  <input
                    type="text"
                    value={customAnswers[idx]}
                    onChange={e => handleCustomAnswerChange(idx, e.target.value)}
                    className="block w-full border border-gray-300 rounded px-3 py-2 mt-1"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Description Section */}
      <div className="mt-10 mb-8 p-6 bg-white rounded-2xl shadow border border-gray-100">
        <h2 className="text-xl font-bold mb-2 text-blush-900">Description</h2>
        <div className="text-lg text-gray-800">{product.description}</div>
      </div>
      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-blush-900">Reviews</h2>
        {user && (
          <form onSubmit={handleReviewSubmit} className="mb-8 p-6 bg-cream-100 rounded-2xl shadow border border-blush-100">
            <div className="mb-3">
              <label className="block font-semibold mb-1">Your Rating</label>
              <select value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))} className="border rounded px-3 py-2">
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="mb-3">
              <label className="block font-semibold mb-1">Your Review</label>
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} required />
            </div>
            <button type="submit" className="bg-blush-600 text-white px-6 py-2 rounded-xl font-bold" disabled={reviewSubmitting}>{reviewSubmitting ? 'Submitting...' : 'Submit Review'}</button>
          </form>
        )}
        <div className="space-y-4">
          {reviews.length === 0 && <div className="text-gray-500">No reviews yet.</div>}
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-center mb-1">
                <span className="font-bold mr-2 text-blush-900">{r.user?.name || 'User'}</span>
                <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              <div className="text-gray-700 text-base">{r.comment}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
      {/* More Like This Section */}
      {similarProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6 text-blush-900">More Like This</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {similarProducts.map(sp => (
              <a key={sp.id} href={`/product/${sp.id}`} className="block bg-white rounded-xl shadow hover:shadow-lg border p-4 transition-all">
                <img src={sp.image} alt={sp.name} className="w-full h-32 object-cover rounded mb-2" />
                <div className="font-semibold text-lg text-blush-900 mb-1 line-clamp-1">{sp.name}</div>
                <div className="text-blush-700 font-bold mb-1">₹{getDisplayPrice(Number(sp.price)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div className="text-sm text-gray-700 line-clamp-2">{sp.description}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 