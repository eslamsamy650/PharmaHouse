// API Configuration
const API_BASE_URL = window.location.origin;

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('token');
}

// Set auth token in localStorage
function setAuthToken(token) {
  localStorage.setItem('token', token);
}

// Remove auth token
function removeAuthToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('pharmacy');
  localStorage.removeItem('isAuthenticated');
}

// Make API request
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      removeAuthToken();
      if (window.location.pathname !== '/login.html' && window.location.pathname !== '/index.html') {
        window.location.href = '/login.html';
      }
      throw new Error('Unauthorized');
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, read as text to get error message
      const text = await response.text();
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
    
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

// Auth API
const authAPI = {
  login: async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('pharmacy', JSON.stringify(data.user));
      localStorage.setItem('isAuthenticated', 'true');
    }
    return data;
  },
  
  register: async (username, email, password, fullName, role) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, fullName, role })
    });
    if (data.token) {
      setAuthToken(data.token);
      localStorage.setItem('pharmacy', JSON.stringify(data.user));
      localStorage.setItem('isAuthenticated', 'true');
    }
    return data;
  },
  
  getCurrentUser: async () => {
    return await apiRequest('/auth/me');
  },
  
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    return await apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
  },
  
  logout: () => {
    removeAuthToken();
  }
};

// Medicines API
const medicinesAPI = {
  getAll: async () => {
    return await apiRequest('/medicines');
  },
  
  getBySupplier: async (supplierId) => {
    return await apiRequest(`/medicines?supplierId=${supplierId}`);
  },
  
  getById: async (id) => {
    return await apiRequest(`/medicines/${id}`);
  },
  
  create: async (medicine) => {
    return await apiRequest('/medicines', {
      method: 'POST',
      body: JSON.stringify(medicine)
    });
  },
  
  delete: async (id) => {
    return await apiRequest(`/medicines/${id}`, {
      method: 'DELETE'
    });
  }
};

// Inventory API
const inventoryAPI = {
  getAll: async () => {
    return await apiRequest('/inventory');
  },
  
  create: async (inventoryItem) => {
    return await apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(inventoryItem)
    });
  },
  
  update: async (id, inventoryItem) => {
    return await apiRequest(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(inventoryItem)
    });
  },
  
  delete: async (id) => {
    return await apiRequest(`/inventory/${id}`, {
      method: 'DELETE'
    });
  }
};

// Dashboard API
const dashboardAPI = {
  getStats: async () => {
    return await apiRequest('/dashboard/stats');
  }
};

// Orders API
const ordersAPI = {
  getAll: async () => {
    return await apiRequest('/orders');
  },
  
  create: async (order) => {
    return await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(order)
    });
  }
};

// Suppliers API
const suppliersAPI = {
  getAll: async () => {
    return await apiRequest('/suppliers');
  }
};

// Companies API
const companiesAPI = {
  getAll: async () => {
    return await apiRequest('/companies');
  }
};

// Profile API
const profileAPI = {
  get: async () => {
    return await apiRequest('/profile');
  },
  
  update: async (data) => {
    return await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

// Pharmacies API
const pharmaciesAPI = {
  getAll: async () => {
    return await apiRequest('/pharmacies');
  }
};

// Offers API
const offersAPI = {
  getAll: async () => {
    return await apiRequest('/offers');
  }
};

// Invoices/Payments API
const invoicesAPI = {
  getAll: async () => {
    return await apiRequest('/invoices');
  },
  
  getById: async (id) => {
    return await apiRequest(`/invoices/${id}`);
  },
  
  updatePayment: async (id, paymentStatus, paymentMethod) => {
    return await apiRequest(`/invoices/${id}/payment`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus, paymentMethod })
    });
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    apiRequest,
    authAPI,
    medicinesAPI,
    inventoryAPI,
    dashboardAPI,
    ordersAPI,
    suppliersAPI,
    companiesAPI,
    profileAPI,
    pharmaciesAPI,
    offersAPI,
    invoicesAPI,
    getAuthToken,
    setAuthToken,
    removeAuthToken
  };
}
