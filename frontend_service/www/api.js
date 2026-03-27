const API_BASE_URL = `http://${window.location.hostname}`;

// --- 1. Auth Service (Port 8000) ---
const AUTH_SERVICE_URL = `${API_BASE_URL}:8000`;
export const LOGIN_URL = `${AUTH_SERVICE_URL}/login`;
export const GET_ME_URL = `${AUTH_SERVICE_URL}/users/me`;
export const CREATE_USER_URL = `${AUTH_SERVICE_URL}/users/create`;
export const LIST_USERS_URL = `${AUTH_SERVICE_URL}/users`;
const ANPR_SERVICE_URL = `${API_BASE_URL}:8002`;
export const RECOGNIZE_PLATE_URL = `${ANPR_SERVICE_URL}/recognize-plate`;
const REGISTRY_SERVICE_URL = `${API_BASE_URL}:8001`;
export const GET_VEHICLE_BY_PLATE_URL = (plate) => `${REGISTRY_SERVICE_URL}/vehicles/${plate}`;
export const GET_VEHICLE_BY_LICENSE_URL = (license) => `${REGISTRY_SERVICE_URL}/vehicles/license/${license}`;
export const CREATE_VEHICLE_URL = `${REGISTRY_SERVICE_URL}/vehicles`;
export const RENEW_LICENSE_URL = (plate) => `${REGISTRY_SERVICE_URL}/vehicles/${plate}/renew`;
export const SAVE_VEHICLE_URL = (plate) => `${REGISTRY_SERVICE_URL}/saved-vehicles/${plate}`;
export const GET_SAVED_VEHICLES_URL = `${REGISTRY_SERVICE_URL}/saved-vehicles`;
