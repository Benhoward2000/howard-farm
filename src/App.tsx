import { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import StorePage, { Product } from './components/StorePage';
import ShoppingCart from './components/shoppingCart';
import AdminPage from './components/AdminPage';
import LoginPage from './components/LoginPage';
import CreateAccount from './components/CreateAccount';
import AccountPage from './components/AccountPage';
import Navbar from './components/Navbar';
import AdminOrdersPage from './components/AdminOrdersPage';
import OrderConfirmation from './components/OrderConfirmation';
import RequestPasswordReset from './components/RequestPasswordReset';
import ResetPassword from './components/ResetPassword';

import { apiBaseUrl } from './config';
import { LoadScript } from '@react-google-maps/api';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const [currentPage, setPage] = useState<string>('Home');
  const [cart, setCart] = useState<Product[]>([]);
  const [user, setUser] = useState<any>(null);
  const [lastOrder, setLastOrder] = useState<any>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
        credentials: 'include',
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data?.email || data?.username || data?.id ? data : null);
    } catch (err) {
      console.error('Error fetching current user:', err);
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const renderPage = (): JSX.Element => {
    switch (currentPage) {
      case 'Home':
        return <HomePage setPage={setPage} />;
      case 'About':
        return <AboutPage />;
      case 'Contact':
        return <ContactPage />;
      case 'Shop':
        return <StorePage cart={cart} setCart={setCart} setPage={setPage} />;
      case 'Checkout':
        return (
          <ShoppingCart
            cart={cart}
            setCart={setCart}
            user={user}
            setPage={setPage}
            setLastOrder={setLastOrder}
          />
        );
      case 'Confirmation':
        return <OrderConfirmation order={lastOrder} />;
      case 'Admin':
        return user?.isAdmin ? (
          <AdminPage />
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-600">🚫 Access Denied</h2>
            <p className="text-gray-600">You must be an admin to view this page.</p>
          </div>
        );
      case 'AdminOrders':
        return user?.isAdmin ? (
          <AdminOrdersPage />
        ) : (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-600">🚫 Access Denied</h2>
            <p className="text-gray-600">You must be an admin to view this page.</p>
          </div>
        );
      case 'Login':
        return <LoginPage setUser={setUser} setPage={setPage} />;
      case 'CreateAccount':
        return <CreateAccount setPage={setPage} />;
      case 'RequestPasswordReset':
        return <RequestPasswordReset setPage={setPage} />;
      case 'Account':
        return <AccountPage user={user} setPage={setPage} refreshUser={fetchUser} />;
      default:
        return <HomePage setPage={setPage} />;
    }
  };

  // 👇 Wrapper to pass setPage to ResetPassword
 const ResetPasswordWrapper = () => <ResetPassword />;


  return (
    <HelmetProvider>
      <LoadScript
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY as string}
        libraries={['places']}
      >
        <Router>
          <div className="min-h-screen bg-white flex flex-col">
            <header className="shadow-sm">
              <Navbar setPage={setPage} user={user} setUser={setUser} />
            </header>

            <main className="flex-grow">
              <Routes>
                <Route path="/reset-password" element={<ResetPasswordWrapper />} />
                <Route path="*" element={renderPage()} />
              </Routes>
            </main>

            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </LoadScript>
    </HelmetProvider>
  );
};

export default App;
















