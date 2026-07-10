const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

export const login = async (username, password) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

export const register = async (username, password) => {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

export const fetchMyProfile = async (token) => {
  const res = await fetch(`${BASE_URL}/profile`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
};

export const updateProfile = async (token, { displayName, username, bio }) => {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ displayName, username, bio })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update profile');
  return res.json();
};

export const uploadAvatar = async (token, base64) => {
  const res = await fetch(`${BASE_URL}/profile/avatar`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ avatar: base64 })
  });
  if (!res.ok) throw new Error('Failed to upload avatar');
  return res.json();
};

export const changePassword = async (token, currentPassword, newPassword) => {
  const res = await fetch(`${BASE_URL}/change-password`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

export const fetchContactProfile = async (token, username) => {
  const res = await fetch(`${BASE_URL}/profile/${username}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

export const fetchMyContacts = async (token) => {
  const res = await fetch(`${BASE_URL}/my-contacts`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
};

export const searchContact = async (token, username) => {
  const res = await fetch(`${BASE_URL}/search-contact?username=${encodeURIComponent(username)}`, {
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
};

export const addContact = async (token, contactId) => {
  const res = await fetch(`${BASE_URL}/add-contact`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ contactId })
  });
  if (!res.ok) throw new Error('Failed to add contact');
  return res.json();
};

export const removeContact = async (token, contactId) => {
  const res = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Failed to remove contact');
  return res.json();
};

export const blockUser = async (token, userId) => {
  const res = await fetch(`${BASE_URL}/block/${userId}`, {
    method: 'POST',
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Failed to block user');
  return res.json();
};

export const fetchSettings = async (token) => {
  const res = await fetch(`${BASE_URL}/settings`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
};

export const updateSettings = async (token, settings) => {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
};

export const fetchSessions = async (token) => {
  const res = await fetch(`${BASE_URL}/sessions`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
};

export const removeSession = async (token, sessionId) => {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Failed to terminate session');
  return res.json();
};

export const removeAllOtherSessions = async (token) => {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Failed to terminate other sessions');
  return res.json();
};

export const fetchBlockedUsers = async (token) => {
  const res = await fetch(`${BASE_URL}/blocked`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Failed to fetch blocked users');
  return res.json();
};

export const unblockUser = async (token, userId) => {
  const res = await fetch(`${BASE_URL}/blocked/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  if (!res.ok) throw new Error('Failed to unblock user');
  return res.json();
};
