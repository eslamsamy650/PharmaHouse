// API Configuration
const API_BASE_URL = window.location.origin;

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('token');
}

// Global Toast System
window.showToast = function(type, message) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ff9800'
  };
  const icons = {
    success: '✅ ',
    error: '❌ ',
    info: 'ℹ️ ',
    warning: '⚠️ '
  };
  
  toast.style.cssText = `
    background-color: ${bgColors[type] || bgColors.info};
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: Arial, sans-serif;
    font-size: 14px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
    max-width: 350px;
    word-break: break-word;
  `;
  toast.innerHTML = (icons[type] || '') + message;

  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
};

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

// Donations API
const donationsAPI = {
  getStats: async () => {
    return await apiRequest('/donations/stats');
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
    donationsAPI,
    getAuthToken,
    setAuthToken,
    removeAuthToken
  };
}

// Role-Based UI Navigation
document.addEventListener('DOMContentLoaded', () => {
  try {
    const userStr = localStorage.getItem('pharmacy');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    const role = user.role || user.Role;
    
    if (role === 'admin') {
      // Hide Orders, Payments, Offers from Admin
      const style = document.createElement('style');
      style.innerHTML = `
        a[href="orders.html"], a[href="payments.html"], a[href="SpecialOffers.html"] { display: none !important; }
        li:has(a[href="orders.html"]), li:has(a[href="payments.html"]), li:has(a[href="SpecialOffers.html"]) { display: none !important; }
      `;
      document.head.appendChild(style);
    } else if (role === 'pharmacy' || role === 'user') {
      // Hide Inventory Management modifications from Pharmacy
      const style = document.createElement('style');
      style.innerHTML = `
        #add-item-btn, .btn-edit, .btn-delete, .edit-btn, .delete-btn { display: none !important; }
      `;
      document.head.appendChild(style);
    }
  } catch (e) {
    console.error('Error applying role-based UI:', e);
  }
});
