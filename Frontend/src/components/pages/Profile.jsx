import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/profile.css';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('activity');

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // User data - initialize with default values
  const [userData, setUserData] = useState({
    name: '',
    username: '',
    email: '',
    bio: '',
    location: '',
    website: '',
    phone: '',
    joinDate: '',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOUI5QkE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4K',
    coverImage: ''
  });

  const [tempData, setTempData] = useState({ ...userData });

  // Dynamic data from API
  const [stats, setStats] = useState({
    eventsAttended: 0,
    eventsCreated: 0,
    reviews: 0,
    followers: 0,
    following: 0
  });

  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [ratedEvents, setRatedEvents] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);

  // Fetch user data and events on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No user token found');
          setLoading(false);
          return;
        }

        // Fetch user profile
        const profileResponse = await fetch(`/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const userProfile = profileData.data.user;
          try { localStorage.setItem('user', JSON.stringify(userProfile)); } catch {}
          setMyUserId(userProfile._id || userProfile.id || null);
          setUserData({
            name: userProfile.firstName + ' ' + userProfile.lastName,
            username: `@${userProfile.firstName.toLowerCase()}${userProfile.lastName.toLowerCase()}`,
            email: userProfile.email,
            bio: userProfile.bio || '',
            location: userProfile.address?.city || '',
            website: userProfile.website || '',
            phone: userProfile.phone || '',
            joinDate: new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            avatar: userProfile.profileImage || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOUI5QkE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4K',
            coverImage: userProfile.coverImage || ''
          });
          setTempData({
            name: userProfile.firstName + ' ' + userProfile.lastName,
            username: `@${userProfile.firstName.toLowerCase()}${userProfile.lastName.toLowerCase()}`,
            email: userProfile.email,
            bio: userProfile.bio || '',
            location: userProfile.address?.city || '',
            website: userProfile.website || '',
            phone: userProfile.phone || '',
            joinDate: new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            avatar: userProfile.profileImage || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9Ijc1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOUI5QkE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4K',
            coverImage: userProfile.coverImage || ''
          });

          // Set stats from API
          setStats(profileData.data.stats);

          // Set created events
          setCreatedEvents(profileData.data.createdEvents || []);

          // Set attended events as upcoming events
          setUpcomingEvents(profileData.data.attendedEvents || []);

          // Rated events from API
          setRatedEvents(profileData.data.ratedEvents || []);

          // Build recent activity timeline
          try {
            const meId = userProfile._id || userProfile.id || myUserId;
            const activity = [];

            // Created events
            (profileData.data.createdEvents || []).forEach(ev => {
              if (ev.createdAt) {
                activity.push({
                  type: 'created',
                  title: ev.title,
                  at: new Date(ev.createdAt),
                  icon: 'bi-plus-circle'
                });
              }
            });

            // Registered events
            (profileData.data.registeredEvents || []).forEach(ev => {
              const att = (ev.attendees || []).find(a => (a.user === meId) || (a.user?._id === meId));
              const at = att?.registeredAt ? new Date(att.registeredAt) : (ev.createdAt ? new Date(ev.createdAt) : null);
              if (at) {
                activity.push({
                  type: 'registered',
                  title: ev.title,
                  at,
                  icon: 'bi-ticket-perforated'
                });
              }
            });

            // Rated events
            (profileData.data.ratedEvents || []).forEach(ev => {
              const mine = (ev.ratings || []).find(r => (r.user === meId) || (r.user?._id === meId));
              const at = mine?.createdAt ? new Date(mine.createdAt) : (ev.createdAt ? new Date(ev.createdAt) : null);
              if (at) {
                activity.push({
                  type: 'rated',
                  title: ev.title,
                  at,
                  rating: mine?.rating,
                  icon: 'bi-star'
                });
              }
            });

            // Attended events (fallback to event date)
            (profileData.data.attendedEvents || []).forEach(ev => {
              const at = ev.date ? new Date(ev.date) : null;
              if (at) {
                activity.push({
                  type: 'attended',
                  title: ev.title,
                  at,
                  icon: 'bi-person-check'
                });
              }
            });

            activity.sort((a, b) => b.at - a.at);
            setRecentActivity(activity.slice(0, 5));
          } catch {}

        }

      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Unable to connect to server. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleDeleteEvent = async (eventId) => {
    try {
      if (!eventId) return;
      if (!window.confirm('Are you sure you want to delete this event? This cannot be undone.')) return;

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/?login=1');
        return;
      }

      setDeletingIds(prev => (prev.includes(eventId) ? prev : [...prev, eventId]));
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await res.text();
      let result = {};
      try { result = JSON.parse(text); } catch { result = { message: text }; }
      if (res.status === 401) {
        alert('Your session expired. Please log in again.');
        navigate('/?login=1');
        return;
      }
      if (!res.ok) {
        alert(result?.message || 'Failed to delete event');
        return;
      }

      setCreatedEvents(prev => prev.filter(ev => (ev._id || ev.id) !== eventId));
      setStats(prev => ({ ...prev, eventsCreated: Math.max(0, (prev.eventsCreated || 0) - 1) }));
      alert('Event deleted successfully');
    } catch (e) {
      console.error('Delete event error:', e);
      alert('Failed to delete event');
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== eventId));
    }
  };

  const toFullUrl = (u) => {
    try {
      if (!u) return u;
      if (u.startsWith('data:')) return u;
      if (/^https?:\/\//i.test(u)) return u;
      // assume backend dev server on 5000 for relative paths like /uploads/...
      return `https://eventhub-backend-vx0n.onrender.com/${u.startsWith('/') ? '' : '/'}${u}`;
    } catch { return u; }
  };

  const formatRelativeTime = (date) => {
    try {
      const now = new Date();
      const diffMs = now - new Date(date);
      const sec = Math.floor(diffMs / 1000);
      const min = Math.floor(sec / 60);
      const hr = Math.floor(min / 60);
      const day = Math.floor(hr / 24);
      if (sec < 60) return `${sec}s ago`;
      if (min < 60) return `${min}m ago`;
      if (hr < 24) return `${hr}h ago`;
      if (day < 7) return `${day}d ago`;
      return new Date(date).toLocaleDateString();
    } catch { return ''; }
  };

  const saveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentFirst = (userData.name || '').split(' ')[0] || 'User';
      const currentLast = (userData.name || '').split(' ').slice(1).join(' ') || '-';
      const full = (tempData.name || '').trim();
      const firstName = (full.split(/\s+/)[0] || currentFirst).trim();
      const lastFromInput = full.split(/\s+/).slice(1).join(' ').trim();
      const lastName = (lastFromInput || '').trim();

      if (!firstName || !lastName) {
        alert('Please enter both first and last name before saving.');
        return false;
      }
      const response = await fetch(`/api/users/updateDetails`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName,
          lastName,
          bio: tempData.bio,
          address: { city: tempData.location },
          website: tempData.website,
          phone: tempData.phone,
          profileImage: tempData.avatar,
          coverImage: tempData.coverImage
        })
      });

      const text = await response.text();
      let updatedProfile = {};
      try { updatedProfile = JSON.parse(text); } catch { updatedProfile = { data: null, message: text }; }

      if (response.ok && updatedProfile?.data) {
        const newUserData = {
          name: `${updatedProfile.data.firstName || ''} ${updatedProfile.data.lastName || ''}`.trim(),
          username: `@${[(updatedProfile.data.firstName || '').toLowerCase(), (updatedProfile.data.lastName || '').toLowerCase()].join('')}`,
          email: updatedProfile.data.email,
          bio: updatedProfile.data.bio || '',
          location: updatedProfile.data.address?.city || '',
          website: updatedProfile.data.website || '',
          phone: updatedProfile.data.phone || '',
          joinDate: new Date(updatedProfile.data.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          avatar: updatedProfile.data.profileImage || 'https://via.placeholder.com/150x150?text=No+Image',
          coverImage: updatedProfile.data.coverImage || ''
        };
        setUserData(newUserData);
        setTempData(newUserData);
        try { localStorage.setItem('user', JSON.stringify(updatedProfile.data)); } catch {}
        try {
          setRecentActivity(prev => ([
            { type: 'updated', title: 'Updated profile', at: new Date(), icon: 'bi-pencil-square' },
            ...(Array.isArray(prev) ? prev : [])
          ]).slice(0, 5));
        } catch {}
        return true;
      } else {
        console.error('Failed to save profile', updatedProfile?.message || text);
        alert(updatedProfile?.message || 'Failed to save profile');
        return false;
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
      return false;
    }
  };

  const handleEditToggle = async () => {
    if (isEditing) {
      const ok = await saveProfile();
      if (!ok) return; // stay in edit mode if save failed
      setIsEditing(false);
      return;
    }
    setTempData({ ...userData });
    setIsEditing(true);
  };

  const handleInputChange = (field, value) => {
    setTempData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {}
    navigate('/');
  };

  const handleImageUpload = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'avatar') {
          handleInputChange('avatar', e.target.result);
        } else {
          handleInputChange('coverImage', e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (type) => {
    if (type === 'avatar') {
      fileInputRef.current?.click();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderStarRating = (rating) => {
    return [...Array(5)].map((_, i) => (
      <i
        key={i}
        className={`bi bi-star${i < rating ? '-fill' : ''} ${i < rating ? 'text-warning' : 'text-muted'}`}
      ></i>
    ));
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="text-center py-5">
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
            <p className="mt-3">Please ensure the backend server is running on port 5000.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Background Animation */}
      <div className="profile-background">
        <div className="floating-elements">
          <div className="element element-1"></div>
          <div className="element element-2"></div>
          <div className="element element-3"></div>
        </div>
      </div>

      <div className="container-fluid px-0">
        {/* Cover Section */}
        <div className="cover-section">
          <div
            className="cover-image"
            style={{ backgroundImage: `url(${toFullUrl(isEditing ? tempData.coverImage : userData.coverImage)})` }}
          >
            <div className="cover-overlay"></div>
            {isEditing && (
              <button
                className="btn btn-light cover-edit-btn"
                onClick={() => document.getElementById('coverUpload').click()}
              >
                <i className="bi bi-camera"></i>
                Change Cover
              </button>
            )}
            <input
              id="coverUpload"
              type="file"
              accept="image/*"
              className="d-none"
              onChange={(e) => handleImageUpload(e, 'cover')}
            />
          </div>

          {/* Profile Info Card */}
          <div className="profile-info-card">
            <div className="container">
              <div className="row align-items-end">
                <div className="col-md-8">
                  <div className="profile-main-info">
                    <div className="avatar-section">
                      <div
                        className="profile-avatar"
                        onClick={isEditing ? () => triggerFileInput('avatar') : undefined}
                        style={{ cursor: isEditing ? 'pointer' : 'default' }}
                      >
                        <img
                          src={toFullUrl(isEditing ? tempData.avatar : userData.avatar)}
                          alt={userData.name}
                        />
                        {isEditing && (
                          <div className="avatar-overlay">
                            <i className="bi bi-camera"></i>
                            <span>Change Photo</span>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={(e) => handleImageUpload(e, 'avatar')}
                        />
                      </div>
                      <div className="verification-badge">
                        <i className="bi bi-patch-check-fill"></i>
                      </div>
                    </div>

                    <div className="profile-details">
                      <div className="name-section">
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-control name-input"
                            value={tempData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                          />
                        ) : (
                          <h1 className="profile-name">{userData.name}</h1>
                        )}
                        <span className="username">{userData.username}</span>
                      </div>

                      {isEditing ? (
                        <textarea
                          className="form-control bio-input"
                          value={tempData.bio}
                          onChange={(e) => handleInputChange('bio', e.target.value)}
                          rows="3"
                        />
                      ) : (
                        <p className="profile-bio">{userData.bio}</p>
                      )}

                      <div className="profile-meta">
                        <div className="meta-item">
                          <i className="bi bi-geo-alt"></i>
                          {isEditing ? (
                            <input
                              type="text"
                              className="form-control meta-input"
                              value={tempData.location}
                              onChange={(e) => handleInputChange('location', e.target.value)}
                            />
                          ) : (
                            <span>{userData.location}</span>
                          )}
                        </div>
                        <div className="meta-item">
                          <i className="bi bi-calendar"></i>
                          <span>Joined {userData.joinDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="profile-actions">
                    <button
                      className={`btn ${isEditing ? 'btn-success' : 'btn-primary'} edit-profile-btn`}
                      onClick={handleEditToggle}
                    >
                      <i className={`bi ${isEditing ? 'bi-check-lg' : 'bi-pencil'} me-2`}></i>
                      {isEditing ? 'Save Changes' : 'Edit Profile'}
                    </button>
                    {!isEditing && (
                      <button className="btn btn-outline-danger logout-btn" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Logout
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="profile-content">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="profile-main-content">
                  {/* Navigation Tabs */}
                  <div className="profile-tabs">
                    <nav>
                      <div className="nav nav-pills" role="tablist">
                        <button
                          className={`nav-link ${activeTab === 'activity' ? 'active' : ''}`}
                          onClick={() => setActiveTab('activity')}
                        >
                          <i className="bi bi-clock-history me-2"></i>
                          Activity
                        </button>
                        <button
                          className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
                          onClick={() => setActiveTab('events')}
                        >
                          <i className="bi bi-calendar-event me-2"></i>
                          My Events
                        </button>
                        <button
                          className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                          onClick={() => setActiveTab('reviews')}
                        >
                          <i className="bi bi-chat-square-text me-2"></i>
                          Reviews
                        </button>
                      </div>
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="tab-content">
                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                      <div className="tab-pane fade show active">
                        <div className="content-section">
                          <h4 className="section-title">Recent Activity</h4>
                          <div className="reviews-list">
                            {recentActivity.length === 0 && (
                              <div className="text-muted">No recent activity.</div>
                            )}
                            {recentActivity.map((a, idx) => (
                              <div className="review-card" key={idx}>
                                <div className="review-header">
                                  <h6>
                                    {a.type === 'created' && 'Created event'}
                                    {a.type === 'registered' && 'Registered for'}
                                    {a.type === 'rated' && `Rated ${a.rating}★ on`}
                                    {a.type === 'attended' && 'Attended'}
                                    {` ${a.title}`}
                                  </h6>
                                  <span className="review-date">{formatRelativeTime(a.at)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Events Tab */}
                    {activeTab === 'events' && (
                      <div className="tab-pane fade show active">
                        <div className="content-section">
                          <h4 className="section-title">Created Events</h4>
                          <div className="created-events-grid">
                            {createdEvents.map(event => (
                              <div key={event.id || event._id} className="created-event-card">
                                <img
                                  src={toFullUrl((Array.isArray(event.images) && (event.images[0]?.url || event.images[0])) || event.image || 'https://via.placeholder.com/600x300?text=No+Image')}
                                  alt={event.title}
                                  crossOrigin="anonymous"
                                />
                                <div className="event-details">
                                  <h6>{event.title}</h6>
                                  <div className="event-meta">
                                    <i className="bi bi-calendar"></i>
                                    <span>{formatDate(event.date)}</span>
                                  </div>
                                  <div className="event-meta">
                                    <i className="bi bi-people"></i>
                                    <span>{event.attendees} attendees</span>
                                  </div>
                                  <span className={`status-badge ${event.status}`}>
                                    {event.status}
                                  </span>
                                </div>
                                <div className="event-actions">
                                  <button
                                    className="btn btn-outline-danger btn-sm"
                                    title="Delete event"
                                    data-bs-toggle="tooltip"
                                    onClick={() => handleDeleteEvent(event._id || event.id)}
                                    disabled={deletingIds.includes(event._id || event.id)}
                                  >
                                    {deletingIds.includes(event._id || event.id) ? (
                                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                      <i className="bi bi-trash"></i>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Reviews Tab */}
                    {activeTab === 'reviews' && (
                      <div className="tab-pane fade show active">
                        <div className="content-section">
                          <h4 className="section-title">My Ratings</h4>
                          <div className="reviews-grid">
                            {ratedEvents.length === 0 && (
                              <div className="text-muted">You haven't rated any events yet.</div>
                            )}
                            {ratedEvents.map(ev => {
                              const myRating = (ev.ratings || []).find(r => (r.user === myUserId) || (r.user?._id === myUserId));
                              return (
                                <div key={ev._id} className="review-card-detailed">
                                  <div className="review-header">
                                    <div>
                                      <h6>{ev.title}</h6>
                                      <div className="review-rating">
                                        {renderStarRating(myRating?.rating || 0)}
                                      </div>
                                    </div>
                                    <span className="review-date">{new Date(ev.date).toLocaleDateString()}</span>
                                  </div>
                                  {myRating?.review && (
                                    <p className="review-comment">{myRating.review}</p>
                                  )}
                                  <div className="review-footer d-flex justify-content-between">
                                    <span className="text-muted">Avg: {(ev.averageRating || 0).toFixed(1)} ({ev.totalRatings || 0})</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Settings Tab removed */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
