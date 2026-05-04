import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api', // During dev, assume backend is on 3000
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
