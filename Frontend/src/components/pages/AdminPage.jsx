import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'users'

  const token = localStorage.getItem('token');

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/users/me', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load profile');
      setMe(data.data.user);
      if (data.data.user.role !== 'admin') {
        navigate('/');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load users');
      setUsers(data.data.users || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events/admin/all', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load events');
      setEvents(data.data || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchMe();
      await Promise.all([fetchUsers(), fetchEvents()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approveEvent = async (id) => {
    try {
      const res = await fetch(`/api/events/${id}/approve`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approve failed');
      await fetchEvents();
    } catch (e) { setError(e.message); }
  };

  const toggleVisibility = async (id, isActive) => {
    try {
      const res = await fetch(`/api/events/${id}/visibility`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ isActive }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      await fetchEvents();
    } catch (e) { setError(e.message); }
  };

  const deleteEvent = async (id) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      await fetchEvents();
    } catch (e) { setError(e.message); }
  };

  const blockUser = async (id) => {
    try {
      const res = await fetch(`/api/users/${id}/block`, { method: 'PATCH', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Block failed');
      await fetchUsers();
    } catch (e) { setError(e.message); }
  };

  const unblockUser = async (id) => {
    try {
      const res = await fetch(`/api/users/${id}/unblock`, { method: 'PATCH', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unblock failed');
      await fetchUsers();
    } catch (e) { setError(e.message); }
  };

  const deleteUser = async (id) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      await fetchUsers();
    } catch (e) { setError(e.message); }
  };

  const statusBadge = (e) => {
    const cls = e.status === 'published' ? 'bg-success' : e.status === 'draft' ? 'bg-warning' : 'bg-secondary';
    return <span className={`badge ${cls}`}>{e.status}</span>;
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h2 className="mb-0">Admin Dashboard</h2>
        <div>
          <button className={`btn btn-sm me-2 ${activeTab==='events'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setActiveTab('events')}>Events</button>
          <button className={`btn btn-sm ${activeTab==='users'?'btn-primary':'btn-outline-primary'}`} onClick={()=>setActiveTab('users')}>Users</button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}

      {activeTab === 'events' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white">
            <h5 className="mb-0">All Events</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-striped align-middle mb-0">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Organizer</th>
                  <th>Status</th>
                  <th>Visible</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev._id}>
                    <td>{ev.title}</td>
                    <td>{ev.organizer?.firstName} {ev.organizer?.lastName}</td>
                    <td>{statusBadge(ev)}</td>
                    <td>{ev.isActive ? <span className="badge bg-success">Visible</span> : <span className="badge bg-secondary">Hidden</span>}</td>
                    <td>{new Date(ev.date).toLocaleDateString()}</td>
                    <td>
                      {ev.status !== 'published' && (
                        <button className="btn btn-sm btn-success me-2" onClick={()=>approveEvent(ev._id)}>Approve</button>
                      )}
                      <button className="btn btn-sm btn-outline-warning me-2" onClick={()=>toggleVisibility(ev._id, !ev.isActive)}>
                        {ev.isActive ? 'Hide' : 'Unhide'}
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteEvent(ev._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card shadow-sm">
          <div className="card-header bg-white">
            <h5 className="mb-0">All Users</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-striped align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'bg-dark' : 'bg-info'}`}>{u.role}</span></td>
                    <td>{u.isBlocked ? <span className="badge bg-danger">Blocked</span> : <span className="badge bg-success">Active</span>}</td>
                    <td>
                      {!u.isBlocked ? (
                        <button className="btn btn-sm btn-outline-warning me-2" onClick={()=>blockUser(u._id)}>Block</button>
                      ) : (
                        <button className="btn btn-sm btn-outline-success me-2" onClick={()=>unblockUser(u._id)}>Unblock</button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>deleteUser(u._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
