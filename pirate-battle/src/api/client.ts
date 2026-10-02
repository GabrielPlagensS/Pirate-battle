import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 7000,
  headers: { 'Content-Type': 'application/json' }
});
