import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../css/eventdetail.css';
// Using Google Maps embed; Leaflet removed

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAttending, setIsAttending] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [mapPosition, setMapPosition] = useState(null); // { lat, lng }
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const mapContainerRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        const response = await fetch(`/api/events/${id}`);
        const text = await response.text();
        let result = {};
        try { result = JSON.parse(text); } catch { result = { message: text }; }

        if (response.status === 429) {
          setError('Rate limit exceeded. Please try again shortly.');
          return;
        }

        if (response.ok) {
          setEvent(result.data || result);
        } else {
          setError(result.message || 'Failed to fetch event details');
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetail();
  }, [id]);

  const loadComments = async () => {
    try {
      setCommentsLoading(true);
      const r = await fetch(`/api/events/${id}/comments`);
      const txt = await r.text();
      let j = {};
      try { j = JSON.parse(txt); } catch { j = { message: txt }; }
      if (r.status === 429) return; // silently ignore rate limit for comments
      if (r.ok) setComments(Array.isArray(j.data) ? j.data : (Array.isArray(j) ? j : []));
    } catch {}
    finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadComments();
  }, [id]);

  // Prefill user's existing rating/comment after event loads
  useEffect(() => {
    try {
      if (!event) return;
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const uid = stored?.id || stored?._id;
      if (!uid || !Array.isArray(event.ratings)) return;
      const mine = event.ratings.find(r => (r.user === uid) || (r.user?._id === uid));
      if (mine) {
        setUserRating(mine.rating || 0);
        setReviewText(mine.review || '');
      }
    } catch {}
  }, [event]);

  const isLoggedIn = () => !!localStorage.getItem('token');

  const submitRating = async () => {
    if (!isLoggedIn()) {
      alert('Please login to rate this event.');
      navigate('/?login=1');
      return;
    }
    if (userRating < 1 || userRating > 5) {
      alert('Please select a rating between 1 and 5.');
      return;
    }
    try {
      setRatingSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/events/${id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: userRating, review: reviewText })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit rating');
      }
      // Refresh event to update averageRating/totalRatings
      const refreshed = await fetch(`/api/events/${id}`);
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setEvent(refreshedData.data || refreshedData);
      // Persist textual feedback to comments collection so all users can see it
      if (reviewText && reviewText.trim().length > 0) {
        try {
          const token2 = localStorage.getItem('token');
          await fetch(`/api/events/${id}/comments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token2}`
            },
            body: JSON.stringify({ text: reviewText.trim(), rating: userRating })
          });
          await loadComments();
        } catch {}
      }
      alert('Thanks for your rating!');
    } catch (e) {
      alert(e.message);
    } finally {
      setRatingSubmitting(false);
    }
  };

  useEffect(() => {
    if (!event || !Array.isArray(event.images)) return;
    if (event.images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImage((idx) => (idx + 1) % event.images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [event]);

  useEffect(() => {
    if (!event || !event.date) return;
    let target;
    try {
      if (event.time) {
        const [hh, mm] = String(event.time).split(':');
        const d = new Date(event.date);
        d.setHours(parseInt(hh || '0', 10), parseInt(mm || '0', 10), 0, 0);
        target = d;
      } else {
        const d = new Date(event.date);
        d.setHours(23, 59, 59, 999);
        target = d;
      }
    } catch {
      return;
    }
    const tick = () => {
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, finished: true });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds, finished: false });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [event]);

  // Prefer coordinates from backend if available; otherwise geocode event.location via Nominatim
  useEffect(() => {
    const geocode = async () => {
      try {
        if (!event) return;
        // Try backend-provided coordinates on the event
        const lat = event.latitude || (event.coords && event.coords.lat);
        const lng = event.longitude || (event.coords && event.coords.lng);
        if (lat && lng) {
          setMapPosition({ lat: parseFloat(lat), lng: parseFloat(lng) });
          return;
        }
        // Fallback: geocode the text location via backend proxy to avoid CORS
        if (event.location) {
          const q = encodeURIComponent(event.location);
          const res = await fetch(`/api/events/geocode?q=${q}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const { lat: glat, lon: glon } = data[0];
            setMapPosition({ lat: parseFloat(glat), lng: parseFloat(glon) });
          }
        }
      } catch (e) {
        // silently ignore geocoding errors
      }
    };
    geocode();
  }, [event]);

  // Leaflet fly animation removed (Google Maps iframe is used)

  // Smoothly scroll map into view when revealed
  useEffect(() => {
    if (showMap && mapContainerRef.current) {
      try {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {}
    }
  }, [showMap]);

  // Auto-zoom handled by Google Maps iframe (z param)

  const handleAttendEvent = () => {
    // TODO: Implement attend event functionality
    setIsAttending(!isAttending);
  };

  const handleShareEvent = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Event link copied to clipboard!');
    }
  };

  const getCountdownString = () => {
    if (!timeLeft || timeLeft.finished) return 'Event started';
    const { days, hours, minutes, seconds } = timeLeft;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  const handleMarkEventNotify = async () => {
    if (!isLoggedIn()) {
      alert('Please login to mark and get email notification for this event.');
      navigate('/?login=1');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const email = user.email;

      const payload = {
        email,
        eventId: id,
        title: event.title,
        location: event.location,
        date: event.date,
        time: event.time,
        countdown: getCountdownString(),
        link: window.location.href,
      };

      const res = await fetch(`/api/events/${id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send notification email.');
      }
      if (data.previewUrl) {
        alert(`Email sent (preview). Open this URL to view the email: ${data.previewUrl}`);
      } else {
        alert('You will receive an email with event details shortly.');
      }
    } catch (e) {
      alert(e.message || 'Could not send notification. Please try again later.');
    }
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="event-detail-page loading">
        <div className="container py-5">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-detail-page error">
        <div className="container py-5">
          <div className="text-center">
            <i className="bi bi-exclamation-triangle error-icon"></i>
            <h4 className="mt-3">Event Not Found</h4>
            <p className="text-muted">{error || 'The event you\'re looking for doesn\'t exist.'}</p>
            <button className="btn btn-primary" onClick={() => navigate('/eventpage')}>
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      {/* Hero Section */}
      <section className="event-hero">
        <div className="event-hero-overlay"></div>
        <div className="event-hero-image">
          <img src={(Array.isArray(event.images) && event.images.length > 0)
            ? (() => {
                const src = event.images[currentImage] || event.images[0];
                if (!src) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDQwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZGRkIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
                if (src.startsWith('http://localhost:5000/uploads/')) {
                  const file = src.split('/').pop();
                  return `/uploads/${file}`;
                }
                if (src.startsWith('http')) return src;
                return `/uploads/${src}`;
              })()
            : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDQwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjZGRkIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg=='} alt={event.title} />
        </div>
        <div className="container">
          <div className="event-hero-content">
            <div className="event-category-badge">{event.category}</div>
            <h1 className="event-title">{event.title}</h1>
            <p className="event-subtitle">{event.description}</p>

            <div className="event-meta">
              <div className="meta-item">
                <i className="bi bi-calendar-event"></i>
                <span>{formatDate(event.date)} at {formatTime(event.time)}</span>
              </div>

              {/* Location Map */}
              {showMap && mapPosition && (
                <div ref={mapContainerRef} className="map-card map-zoom-in">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="m-0">Location</h3>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowMap(false)} title="Close map">Close</button>
                  </div>
                  <div style={{ height: '360px', borderRadius: '12px', overflow: 'hidden' }}>
                    <iframe
                      title="Google Map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${mapPosition.lat},${mapPosition.lng}&z=17&output=embed`}
                    />
                  </div>
                </div>
              )}
              <div className="meta-item" onClick={() => setShowMap(v => !v)} style={{ cursor: 'pointer' }} title="Click to toggle map">
                <i className="bi bi-geo-alt"></i>
                <span style={{ textDecoration: 'underline' }}>{event.location}</span>
              </div>
              {timeLeft && (
                <div className="meta-item">
                  <i className="bi bi-hourglass-split"></i>
                  <span>{timeLeft.finished ? 'Event started' : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}</span>
                </div>
              )}
            </div>

            <div className="event-actions">
              <button className="btn btn-outline-light btn-lg" onClick={handleShareEvent}>
                <i className="bi bi-share"></i>
                Share
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-5">
        <div className="row">
          {/* Main Content */}
          <div className="col-lg-8">
            {/* Event Description */}
            <section className="event-section">
              <h2>About This Event</h2>
              <div className="event-description">
                <p>{event.description}</p>
                {event.longDescription && (
                  <div className="long-description">
                    {event.longDescription.split('\n').map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Event Details */}
            <section className="event-section">
              <h2>Event Details</h2>
              <div className="event-details-grid">
                <div className="detail-card">
                  <div className="detail-icon">
                    <i className="bi bi-calendar-event"></i>
                  </div>
                  <div className="detail-content">
                    <h4>Date & Time</h4>
                    <p>{formatDate(event.date)}</p>
                    <p>{formatTime(event.time)}</p>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon">
                    <i className="bi bi-geo-alt"></i>
                  </div>
                  <div className="detail-content">
                    <h4>Location</h4>
                    <p>{event.location}</p>
                    <p className="text-muted">{event.locationType === 'online' ? 'Online Event' : 'In-Person Event'}</p>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon">
                    <i className="bi bi-person-circle"></i>
                  </div>
                  <div className="detail-content">
                    <h4>Organizer</h4>
                    <p>{typeof event.organizer === 'object' ? event.organizer.firstName + ' ' + event.organizer.lastName : event.organizer}</p>
                  </div>
                </div>

                
              </div>
            </section>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <section className="event-section">
                <h2>Tags</h2>
                <div className="event-tags">
                  {event.tags.map(tag => (
                    <span key={tag} className="event-tag">#{tag}</span>
                  ))}
                </div>
              </section>
            )}

            <section className="event-section">
              <h2>Reviews</h2>
              <div className="reviews-list">
                {commentsLoading ? (
                  <p className="text-muted">Loading comments...</p>
                ) : (
                  (Array.isArray(comments) && comments.length > 0) ? (
                    comments.map((c) => (
                      <div key={c._id} className="review-item">
                        <div className="d-flex align-items-center mb-1" style={{ gap: '6px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <i
                              key={star}
                              className={`bi ${((c.rating || 0) >= star) ? 'bi-star-fill text-warning' : 'bi-star'}`}
                            />
                          ))}
                        </div>
                        <p className="mb-1">{c.text}</p>
                        <small className="text-muted">
                          {c.user && (c.user.firstName || c.user.lastName)
                            ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim()
                            : 'Anonymous'}
                          {c.createdAt ? ` • ${new Date(c.createdAt).toLocaleString()}` : ''}
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted">No reviews yet.</p>
                  )
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            <div className="event-sidebar">
              {/* Quick Info */}
              <div className="sidebar-card">
                <h3>Quick Info</h3>
                <div className="quick-info">
                  <div className="info-item">
                    <span className="label">Category:</span>
                    <span className="value">{event.category}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Rating:</span>
                    <div className="rating">
                      <i className="bi bi-star-fill"></i>
                      <span>{(event.averageRating || 0).toFixed(1)} ({event.totalRatings || 0})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate This Event */}
              <div className="sidebar-card">
                <h3>Rate this Event</h3>
                <div className="d-flex align-items-center mb-2" style={{ gap: '6px' }}>
                  {[1,2,3,4,5].map((star) => (
                    <i
                      key={star}
                      className={`bi ${((hoverRating || userRating) >= star) ? 'bi-star-fill text-warning' : 'bi-star'}`}
                      style={{ fontSize: '20px', cursor: 'pointer' }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(star)}
                    />
                  ))}
                </div>
                <textarea
                  className="form-control mb-2"
                  rows={3}
                  placeholder="Share your thoughts (optional)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
                <button className="btn btn-primary w-100" disabled={ratingSubmitting} onClick={submitRating}>
                  {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>

              {/* Similar Events */}
              <div className="sidebar-card">
                <h3>Similar Events</h3>
                <p className="text-muted">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
