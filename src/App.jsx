import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './sections/Hero';
import About from './sections/About';
import FilmStrip from './sections/FilmStrip';
import Skills from './sections/Skills';
import TrustedApps from './sections/TrustedApps';
import Footer from './components/Footer';
import Testimonials from './sections/Testimonials';
import PersonalChronicles from './sections/PersonalChronicles';
import MobileBlocker from './components/MobileBlocker';
import Background from './components/Background';
import Login from './pages/Login';
import { ConfigProvider } from './context/ConfigContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import { AnimatePresence } from 'framer-motion';
import ScrollToTop from './components/ScrollToTop';
import AdminDashboard from './pages/admin/AdminDashboard';
import BlogCMS from './pages/admin/BlogCMS';
import Blog from './pages/blog/Blog'; // Assuming I move it to pages/blog/Blog.jsx or keep it simple
import BlogPost from './pages/blog/BlogPost';
import Chronicles from './pages/Chronicles';
import NotFound from './pages/NotFound';

import PageGuard from './components/PageGuard';
import { useAnalytics } from './hooks/useAnalytics';

const Home = () => (
  <>
    <Hero />
    <About />
    <FilmStrip />
    <Skills />
    <TrustedApps />
    <Testimonials />
  </>
);

function AppRoutes() {
  const [isInitialLoading, setIsInitialLoading] = React.useState(true);
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  
  // Track Page Views
  React.useEffect(() => {
    trackEvent('PAGE_VIEW', {
      title: document.title || 'BCT Project'
    });
  }, [location.pathname]);

  // Fix for cross-page navigation to home sections
  React.useEffect(() => {
    if (location.hash && location.pathname === '/') {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300); // Wait for page transition
    }
  }, [location]);

  const isLoginPage = location.pathname === '/login';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isBlogPage = location.pathname.startsWith('/blog');
  const isChroniclesPage = location.pathname === '/chronicles';

  const { isAdmin } = useAuth();

  return (
    <>
      <MobileBlocker />
      <AnimatePresence>
        {isInitialLoading && (
          <LoadingScreen onComplete={() => setIsInitialLoading(false)} />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative' }}>
        <Background />
        {!isLoginPage && !isAdminPage && <Navbar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/blog" element={
            <PageGuard pageId="blog">
              <Blog />
            </PageGuard>
          } />
          <Route path="/blog/:id" element={
            <PageGuard pageId="blog">
              <BlogPost />
            </PageGuard>
          } />
          <Route path="/chronicles" element={
            <PageGuard pageId="chronicles">
              <Chronicles />
            </PageGuard>
          } />
          <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Login />} />
          <Route path="/admin/cms/:id" element={isAdmin ? <BlogCMS /> : <Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {!isLoginPage && !isAdminPage && !isBlogPage && !isChroniclesPage && <Footer />}
        {(isBlogPage || isChroniclesPage) && <Footer />}
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <ScrollToTop />
        <AppRoutes />
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
