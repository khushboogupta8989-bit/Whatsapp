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

export default api;
