import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiPackage, FiHeart, FiMapPin, FiLogOut, FiEdit2, FiTrash2, FiPlus, FiSave, FiX, FiCheck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import api from '../services/api';

const Addresses = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Remove legacy global dummy addresses from localStorage once
  useEffect(() => {
    localStorage.removeItem('nn_addresses');
  }, []);

  // Fetch addresses for the logged-in user
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    const loadAddresses = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/customer/addresses');
        if (response.data?.success && Array.isArray(response.data.data)) {
          setAddresses(response.data.data);
          // Sync with user-specific localStorage cache
          localStorage.setItem(`nn_addresses_${user.id}`, JSON.stringify(response.data.data));
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Backend address fetch failed, checking user cache:', err);
      }

      // Fallback to user-scoped localStorage
      const userCached = localStorage.getItem(`nn_addresses_${user.id}`);
      if (userCached) {
        try {
          setAddresses(JSON.parse(userCached));
        } catch (e) {
          setAddresses([]);
        }
      } else {
        setAddresses([]);
      }
      setIsLoading(false);
    };

    loadAddresses();
  }, [isAuthenticated, user?.id]);

  const saveToUserCache = (updatedList) => {
    setAddresses(updatedList);
    if (user?.id) {
      localStorage.setItem(`nn_addresses_${user.id}`, JSON.stringify(updatedList));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '5rem 0', textAlign: 'center' }}>
        <h2>Please login to view your account.</h2>
        <Button onClick={() => navigate('/login')} style={{ marginTop: '1rem' }}>Login</Button>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAdd = () => {
    const tempId = Date.now();
    setEditingId(tempId);
    setFormData({
      id: tempId,
      name: user?.name || '',
      type: 'Home',
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      mobile: user?.mobile || '',
      is_default: addresses.length === 0
    });
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      id: item.id,
      name: item.name || user?.name || '',
      type: item.type || 'Home',
      address: item.address || item.line1 || '',
      city: item.city || '',
      state: item.state || '',
      pincode: item.pincode || '',
      country: item.country || 'India',
      mobile: item.mobile || '',
      is_default: !!item.is_default
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      await api.delete(`/customer/addresses/${id}`);
    } catch (err) {
      console.warn('API delete failed, updating local state:', err);
    }

    const updated = addresses.filter(a => a.id !== id);
    saveToUserCache(updated);
    setFeedbackMsg('Address removed.');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/customer/addresses/${id}/default`);
    } catch (err) {
      console.warn('API setDefault failed, updating local state:', err);
    }

    const updated = addresses.map(a => ({
      ...a,
      is_default: a.id === id,
      isDefault: a.id === id
    }));
    saveToUserCache(updated);
    setFeedbackMsg('Default address updated.');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!formData.address?.trim() || !formData.mobile?.trim()) {
      alert('Please fill in your address and a valid mobile number.');
      return;
    }

    const isExisting = addresses.some(a => a.id === formData.id);

    try {
      let savedAddress = null;
      if (isExisting) {
        const res = await api.put(`/customer/addresses/${formData.id}`, formData);
        savedAddress = res.data?.data;
      } else {
        const res = await api.post('/customer/addresses', formData);
        savedAddress = res.data?.data;
      }

      if (savedAddress) {
        if (savedAddress.is_default) {
          const updated = addresses.map(a => a.id === savedAddress.id ? savedAddress : { ...a, is_default: false });
          if (!isExisting) updated.unshift(savedAddress);
          saveToUserCache(updated);
        } else {
          const updated = isExisting
            ? addresses.map(a => a.id === savedAddress.id ? savedAddress : a)
            : [savedAddress, ...addresses];
          saveToUserCache(updated);
        }
      } else {
        // Fallback local update
        const updated = isExisting
          ? addresses.map(a => a.id === formData.id ? formData : a)
          : [formData, ...addresses];
        saveToUserCache(updated);
      }
    } catch (err) {
      console.warn('API save address failed, persisting locally:', err);
      const updated = isExisting
        ? addresses.map(a => a.id === formData.id ? formData : a)
        : [formData, ...addresses];
      saveToUserCache(updated);
    }

    setEditingId(null);
    setFormData(null);
    setFeedbackMsg('Address saved successfully.');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(null);
  };

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <h1 style={{ marginBottom: '2rem', color: 'var(--dark-green)' }}>My Addresses</h1>
      
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Sidebar */}
        <aside style={{ flex: '1 1 250px', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '1.5rem' }}>
          <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>{user?.name}</h3>
            <p style={{ margin: 0, color: 'var(--secondary-text)', fontSize: '0.9rem' }}>{user?.email}</p>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/account" style={linkStyle}><FiUser /> Profile</Link>
            <Link to="/orders" style={linkStyle}><FiPackage /> Orders</Link>
            <Link to="/wishlist" style={linkStyle}><FiHeart /> Wishlist</Link>
            <Link to="/addresses" style={activeLinkStyle}><FiMapPin /> Addresses</Link>
            <button onClick={handleLogout} style={{ ...linkStyle, color: 'var(--brand-red)', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', backgroundColor: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <FiLogOut /> Logout
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div style={{ flex: '1 1 600px', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--dark-green)', margin: 0 }}>Saved Addresses</h2>
              {feedbackMsg && (
                <span style={{ fontSize: '0.85rem', color: 'var(--primary-green)', fontWeight: '600' }}>{feedbackMsg}</span>
              )}
            </div>
            {editingId === null && (
              <Button variant="outline" size="sm" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiPlus /> Add New
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {editingId !== null && !addresses.some(a => a.id === editingId) && (
              <AddressForm 
                formData={formData} 
                setFormData={setFormData} 
                onSave={handleSave} 
                onCancel={handleCancel} 
              />
            )}

            {isLoading ? (
              <p style={{ color: 'var(--secondary-text)', padding: '2rem 0', textAlign: 'center' }}>Loading saved addresses...</p>
            ) : addresses.length === 0 && editingId === null ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                <FiMapPin size={40} color="var(--primary-green)" style={{ opacity: 0.6, marginBottom: '0.75rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--dark-text)' }}>No Saved Addresses</h3>
                <p style={{ color: 'var(--secondary-text)', margin: '0 0 1.5rem 0' }}>
                  You haven't saved any delivery addresses for this account yet.
                </p>
                <Button onClick={handleAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiPlus /> Add Your First Address
                </Button>
              </div>
            ) : (
              addresses.map(address => {
                const isDef = address.is_default || address.isDefault;
                return editingId === address.id ? (
                  <AddressForm 
                    key={address.id} 
                    formData={formData} 
                    setFormData={setFormData} 
                    onSave={handleSave} 
                    onCancel={handleCancel} 
                  />
                ) : (
                  <div key={address.id} style={{ border: `1px solid ${isDef ? 'var(--primary-green)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: '1.5rem', backgroundColor: isDef ? '#fafffa' : 'var(--white)', position: 'relative' }}>
                    {isDef && (
                      <span style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', backgroundColor: 'var(--primary-green)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>DEFAULT</span>
                    )}
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--dark-text)' }}>
                      {address.name || user?.name} ({address.type || 'Home'})
                    </h4>
                    <p style={{ margin: '0 0 0.25rem 0', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                      {address.address || address.line1}
                      {(address.city || address.state || address.pincode) && (
                        <>
                          <br />
                          {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                        </>
                      )}
                      {address.country && (
                        <>
                          <br />
                          {address.country}
                        </>
                      )}
                    </p>
                    <p style={{ margin: '0 0 1rem 0', color: 'var(--dark-text)', fontWeight: '500' }}>
                      Mobile: {address.mobile}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button onClick={() => handleEdit(address)} style={actionBtnStyle}><FiEdit2 /> Edit</button>
                      <button onClick={() => handleDelete(address.id)} style={{...actionBtnStyle, color: 'var(--brand-red)'}}><FiTrash2 /> Delete</button>
                      {!isDef && (
                        <button onClick={() => handleSetDefault(address.id)} style={{...actionBtnStyle, color: 'var(--primary-green)'}}>Set as Default</button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const AddressForm = ({ formData, setFormData, onSave, onCancel }) => (
  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', backgroundColor: '#FAFAFA' }}>
    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--dark-green)' }}>
      {typeof formData.id === 'number' && formData.id > 1000000000 ? 'Add New Address' : 'Edit Address'}
    </h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Contact Name</label>
          <input 
            type="text" 
            value={formData.name || ''} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            style={inputStyle} 
            placeholder="Full Name"
          />
        </div>
        <div>
          <label style={labelStyle}>Address Type</label>
          <select 
            value={formData.type || 'Home'} 
            onChange={e => setFormData({...formData, type: e.target.value})} 
            style={inputStyle}
          >
            <option value="Home">Home</option>
            <option value="Office">Office</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Street Address / House / Flat No.</label>
        <textarea 
          rows="2"
          value={formData.address || ''} 
          onChange={e => setFormData({...formData, address: e.target.value})} 
          style={{ ...inputStyle, resize: 'vertical' }} 
          placeholder="Building name, Street, Area"
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>City</label>
          <input 
            type="text" 
            value={formData.city || ''} 
            onChange={e => setFormData({...formData, city: e.target.value})} 
            style={inputStyle} 
            placeholder="City"
          />
        </div>
        <div>
          <label style={labelStyle}>State</label>
          <input 
            type="text" 
            value={formData.state || ''} 
            onChange={e => setFormData({...formData, state: e.target.value})} 
            style={inputStyle} 
            placeholder="State"
          />
        </div>
        <div>
          <label style={labelStyle}>PIN Code</label>
          <input 
            type="text" 
            value={formData.pincode || ''} 
            onChange={e => setFormData({...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6)})} 
            style={inputStyle} 
            placeholder="6-digit PIN"
            maxLength="6"
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Mobile Number</label>
        <input 
          type="text" 
          value={formData.mobile || ''} 
          onChange={e => {
            const val = e.target.value.replace(/\D/g, '');
            if (val.length <= 10) {
              setFormData({...formData, mobile: val});
            }
          }}
          maxLength="10"
          style={inputStyle} 
          placeholder="10-digit mobile number"
          required
        />
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <Button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiSave /> Save Address
        </Button>
        <Button variant="outline" onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FiX /> Cancel
        </Button>
      </div>
    </div>
  </div>
);

const labelStyle = {
  display: 'block',
  marginBottom: '0.5rem',
  fontSize: '0.9rem',
  fontWeight: '500',
  color: 'var(--dark-text)'
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  fontSize: '1rem',
  outline: 'none',
  fontFamily: 'inherit',
  backgroundColor: 'white'
};

const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  textDecoration: 'none',
  color: 'var(--dark-text)',
  borderRadius: 'var(--radius-sm)',
  transition: 'background-color 0.2s',
  fontWeight: '500'
};

const activeLinkStyle = {
  ...linkStyle,
  backgroundColor: 'var(--soft-green)',
  color: 'var(--primary-green)',
};

const actionBtnStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--secondary-text)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: '0.9rem',
  fontWeight: '500'
};

export default Addresses;
