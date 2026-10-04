const API_BASE_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');

export default API_BASE_URL;

export async function apiFetch(path, options) {
  try {
    return await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach the MediTrace backend at ${API_BASE_URL}. Make sure the backend server is running.`);
    }
    throw error;
  }
}
