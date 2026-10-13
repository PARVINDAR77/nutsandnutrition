import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import CategoryCard from '../components/CategoryCard';
import { categoryService } from '../services/categoryService';
import { useAutoRefresh } from '../context/AutoRefreshContext';
import Button from '../components/Button';

const colors = {
  cream: '#fdfbf7',
  offWhite: '#faf9f6',
  nutBrown: '#8b5a2b',
  darkBrown: '#4a3b32',
  softGreen: '#e6efe6',
  darkGreen: '#68B348',
  text: '#333333',
  lightText: '#666666'
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { refreshTrigger } = useAutoRefresh();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAllCategories();
        setCategories(data || []);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, [refreshTrigger]);

  return (
    <div style={{ backgroundColor: colors.offWhite, minHeight: '100vh', paddingBottom: '6rem' }}>
      
      {/* Hero Header */}
      <section style={{ 
        position: 'relative', 
        padding: '5rem 0 6rem', 
        backgroundImage: `linear-gradient(rgba(42, 93, 44, 0.8), rgba(74, 59, 50, 0.85)), url('/images/2.jpeg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        textAlign: 'center',
        color: 'white'
      }}>
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', marginBottom: '1rem', fontFamily: 'var(--font-display)', color: 'white' }}>
              Explore Categories
            </h1>
            <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.9)', maxWidth: '600px', margin: '0 auto' }}>
              Discover our carefully curated selection of natural nutrition, wholesome nuts, and nutritious blends.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Categories Section */}
      <div className="container" style={{ marginTop: '-3rem', position: 'relative', zIndex: 2 }}>
        {categories.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              textAlign: 'center', 
              padding: '5rem 2rem', 
              backgroundColor: 'white', 
              borderRadius: '24px', 
              border: `1px solid ${colors.cream}`,
              boxShadow: '0 15px 35px rgba(0,0,0,0.03)'
            }}
          >
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🌱</span>
            <h3 style={{ color: colors.darkBrown, fontSize: '2rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
              Coming Soon
            </h3>
            <p style={{ color: colors.lightText, maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
              We are finalizing our exclusive product categories. Check back shortly for our launch!
            </p>
            <Link to="/contact" style={{ textDecoration: 'none' }}>
              <Button variant="primary">Get in Touch</Button>
            </Link>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Categories;
