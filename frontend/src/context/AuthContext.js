import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import supabase from '../config/supabase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMeWithToken = async (token) => {
    try {
      const res = await apiFetch('/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const me = await res.json();
        if (me.user) setUser(me.user);
        if (me.profile) setProfile(me.profile);
      }
    } catch (e) {
      console.warn("Fetch /auth/me error:", e.message);
    }
  };

  useEffect(() => {
    const localToken = localStorage.getItem('honeychain_token');
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const activeUser = session?.user ?? null;
      if (activeUser) {
        setUser(activeUser);
        fetchProfile(activeUser.id);
      } else if (localToken) {
        fetchMeWithToken(localToken);
      }
      setLoading(false);
    }).catch(async (e) => {
      if (localToken) {
        await fetchMeWithToken(localToken);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        const activeUser = session?.user ?? null;
        if (activeUser) {
          setUser(activeUser);
          fetchProfile(activeUser.id);
        } else if (localToken) {
          fetchMeWithToken(localToken);
        } else {
          setProfile(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    }
  };

  const login = async (email, password) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    
    if (data.session?.access_token) {
      localStorage.setItem('honeychain_token', data.session.access_token);
      setSession(data.session);
    }
    if (data.user) setUser(data.user);
    if (data.profile) setProfile(data.profile);

    if (data.session?.access_token && data.session?.refresh_token) {
      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
      } catch (sErr) {
        console.warn("Supabase auth setSession bypassed:", sErr.message);
      }
    }
    
    return data;
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('honeychain_token');
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
    } catch (e) {}
    localStorage.removeItem('honeychain_token');
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const register = async (email, password, fullName, role = 'beekeeper') => {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, role })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    return data;
  };

  const value = { user, session, profile, loading, login, logout, register };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
