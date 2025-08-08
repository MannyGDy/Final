import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    // Add request interceptor to include token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token expiration
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('adminToken');
          setUser(null);
          setAdmin(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check for existing tokens on app load
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('token');
        const adminToken = localStorage.getItem('adminToken');

        if (token) {
          const response = await axios.get('/api/auth/profile');
          setUser(response.data.user);
        } else if (adminToken) {
          // For admin, we'll verify when they access admin routes
          setAdmin({ token: adminToken });
        }
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (email, phoneNumber, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        phoneNumber,
        password
      });

      const { token, user: userData } = response.data;
      localStorage.setItem('token', token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const response = await axios.post('/api/admin/login', {
        email,
        password
      });

      const { token, admin: adminData } = response.data;
      localStorage.setItem('adminToken', token);
      setAdmin(adminData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Admin login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    setUser(null);
    setAdmin(null);
  };

  const value = {
    user,
    admin,
    loading,
    login,
    register,
    adminLogin,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
