import axios from 'axios'

const api = axios.create({ baseURL: '/familyhub/api' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('fh_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fh_token')
      localStorage.removeItem('fh_user')
      window.location.href = '/familyhub/login'
    }
    return Promise.reject(err)
  }
)

export default api
