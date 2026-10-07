import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import StoreLayout, { ScrollToTop } from './layouts/StoreLayout.jsx';
import Home from './pages/store/Home.jsx';
import Shop from './pages/store/Shop.jsx';
import ProductDetails from './pages/store/ProductDetails.jsx';
import Cart from './pages/store/Cart.jsx';
import Checkout from './pages/store/Checkout.jsx';
import OrderSuccess from './pages/store/OrderSuccess.jsx';
import TrackOrder from './pages/store/TrackOrder.jsx';
import About from './pages/store/About.jsx';
import Contact from './pages/store/Contact.jsx';
import FAQ from './pages/store/FAQ.jsx';
import NotFound from './pages/store/NotFound.jsx';
import { Spinner } from './components/ui/Feedback.jsx';
import { isConfigured } from './services/api.js';

// The admin area is code-split so customers never download it.
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Orders = lazy(() => import('./pages/admin/Orders.jsx'));
const OrderDetails = lazy(() => import('./pages/admin/OrderDetails.jsx'));
const Products = lazy(() => import('./pages/admin/Products.jsx'));
const Categories = lazy(() => import('./pages/admin/Categories.jsx'));
const Customers = lazy(() => import('./pages/admin/Customers.jsx'));
const Analytics = lazy(() => import('./pages/admin/Analytics.jsx'));
const Coupons = lazy(() => import('./pages/admin/Coupons.jsx'));
const Settings = lazy(() => import('./pages/admin/Settings.jsx'));

const Loading = () => <div className="grid min-h-[50vh] place-items-center"><Spinner className="h-8 w-8" /></div>;

function NotConfigured() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-6">
      <div className="max-w-lg rounded-3xl bg-white p-8 shadow-lift">
        <h1 className="font-display text-2xl font-semibold">Store backend not configured</h1>
        <p className="mt-3 text-cocoa-700">Set <code className="rounded bg-cocoa-50 px-1">VITE_SUPABASE_URL</code> and <code className="rounded bg-cocoa-50 px-1">VITE_SUPABASE_ANON_KEY</code> in your Netlify environment variables, then redeploy. See the README for the full setup.</p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <NotConfigured />;
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="product/:slug" element={<ProductDetails />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order-success" element={<OrderSuccess />} />
            <Route path="track-order" element={<TrackOrder />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="customers" element={<Customers />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
