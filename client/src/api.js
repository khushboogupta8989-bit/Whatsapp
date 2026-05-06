import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Relative path works for both local and Render
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('waplus_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add a response interceptor to handle 401s
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('waplus_token');
            window.location.reload(); // This will trigger App.jsx to show login
        }
        return Promise.reject(error);
    }
);

export default api;
