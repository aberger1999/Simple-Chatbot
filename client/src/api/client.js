const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

// Calendar
export const calendarApi = {
  getEvents: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return request(`/calendar?${params}`);
  },
  getEvent: (id) => request(`/calendar/${id}`),
  createEvent: (data) => request('/calendar', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/calendar/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/calendar/categories'),
};

// Notes
export const notesApi = {
  getNotes: (params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/notes?${q}`);
  },
  getNote: (id) => request(`/notes/${id}`),
  createNote: (data) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
};

// Goals
export const goalsApi = {
  getGoals: () => request('/goals'),
  getGoal: (id) => request(`/goals/${id}`),
  createGoal: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id, data) => request(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
};

// Blog
export const blogApi = {
  getPosts: () => request('/blog'),
  getPost: (id) => request(`/blog/${id}`),
  createPost: (data) => request('/blog', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id, data) => request(`/blog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id) => request(`/blog/${id}`, { method: 'DELETE' }),
};

// Tags
export const tagsApi = {
  getTags: () => request('/tags'),
  createTag: (name) => request('/tags', { method: 'POST', body: JSON.stringify({ name }) }),
  updateTag: (id, name) => request(`/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteTag: (id) => request(`/tags/${id}`, { method: 'DELETE' }),
};

// Milestones
export const milestonesApi = {
  getMilestones: (goalId) => request(`/goals/${goalId}/milestones`),
  createMilestone: (goalId, data) => request(`/goals/${goalId}/milestones`, { method: 'POST', body: JSON.stringify(data) }),
  updateMilestone: (id, data) => request(`/milestones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMilestone: (id) => request(`/milestones/${id}`, { method: 'DELETE' }),
  createSubMilestone: (milestoneId, data) => request(`/milestones/${milestoneId}/sub`, { method: 'POST', body: JSON.stringify(data) }),
  updateSubMilestone: (id, data) => request(`/sub-milestones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubMilestone: (id) => request(`/sub-milestones/${id}`, { method: 'DELETE' }),
};

// Journal
export const journalApi = {
  getEntry: (date) => request(`/journal/${date}`),
  updateEntry: (date, data) => request(`/journal/${date}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Chat
export const chatApi = {
  send: (message, mode = 'ollama', sessionId = null) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, mode, sessionId }),
    }),
  getHistory: (sessionId) => request(`/chat/history?sessionId=${sessionId}`),
  getSessions: () => request('/chat/sessions'),
  createSession: () => request('/chat/sessions', { method: 'POST' }),
};
