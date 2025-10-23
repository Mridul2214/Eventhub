import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/eventpage.css';

const EventsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states (price, tags, and location removed)
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'all',
    rating: 'all'
  });

  const [showFilters, setShowFilters] = useState(false);
  // Tags filter removed
  const [animateCards, setAnimateCards] = useState(false);



  const categories = [
    'All Categories',
    'Technology',
    'Music',
    'Food & Drink',
    'Business',
    'Arts',
    'Sports',
    'Health & Wellness',
    'Education',
    'Networking',
    'Charity'
  ];

  const dateRanges = [
    { value: 'all', label: 'Any Date' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'upcoming', label: 'Upcoming' }
  ];

  // Price ranges and location types removed

  const ratings = [
    { value: 'all', label: 'Any Rating' },
    { value: '4.5', label: '4.5+ Stars' },
    { value: '4.0', label: '4.0+ Stars' },
    { value: '3.5', label: '3.5+ Stars' },
    { value: '3.0', label: '3.0+ Stars' }
  ];

  // Tags removed

  useEffect(() => {
    const CACHE_KEY = 'events_cache_v1';
    const fetchEvents = async () => {
      try {
        setError(null);
        const response = await fetch('/api/events');
        const text = await response.text();
        let result = {};
        try { result = JSON.parse(text); } catch { result = { message: text }; }

        if (response.status === 429) {
          console.error('Rate limited while fetching events');
          setError('Rate limit exceeded. Showing cached events if available.');
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
          if (cached && Array.isArray(cached.events)) {
            setEvents(cached.events);
            setFilteredEvents(cached.events);
          } else {
            setEvents([]);
            setFilteredEvents([]);
          }
          setLoading(false);
          return;
        }

        if (response.ok) {
          const apiEvents = result.data || [];
          setEvents(apiEvents);
          setFilteredEvents(apiEvents);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), events: apiEvents })); } catch {}
          setLoading(false);
        } else {
          console.error('Failed to fetch events:', result.message || text);
          setError('Failed to fetch events from server. Showing cached events if available.');
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
          if (cached && Array.isArray(cached.events)) {
            setEvents(cached.events);
            setFilteredEvents(cached.events);
          } else {
            setEvents([]);
            setFilteredEvents([]);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Unexpected error loading events. Showing cached events if available.');
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Array.isArray(cached.events)) {
          setEvents(cached.events);
          setFilteredEvents(cached.events);
        } else {
          setEvents([]);
          setFilteredEvents([]);
        }
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [filters, sortBy, searchTerm, events]);

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(event => {
        const organizerName = typeof event.organizer === 'object'
          ? `${event.organizer.firstName || ''} ${event.organizer.lastName || ''}`.trim()
          : (event.organizer || '');
        const tags = Array.isArray(event.tags) ? event.tags : [];
        return (
          (event.title || '').toLowerCase().includes(query) ||
          (event.description || '').toLowerCase().includes(query) ||
          organizerName.toLowerCase().includes(query) ||
          tags.some(tag => (tag || '').toLowerCase().includes(query))
        );
      });
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(event => event.category === filters.category);
    }

    // Date range filter
    const today = new Date();
    switch (filters.dateRange) {
      case 'today':
        filtered = filtered.filter(event => event.date === today.toISOString().split('T')[0]);
        break;
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        filtered = filtered.filter(event => event.date === tomorrow.toISOString().split('T')[0]);
        break;
      case 'week':
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        filtered = filtered.filter(event => new Date(event.date) <= nextWeek);
        break;
      case 'month':
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        filtered = filtered.filter(event => new Date(event.date) <= nextMonth);
        break;
      case 'upcoming':
        filtered = filtered.filter(event => new Date(event.date) >= today);
        break;
      default:
        break;
    }

    // Price and location filters removed

    // Rating filter
    if (filters.rating !== 'all') {
      const minRating = parseFloat(filters.rating);
      filtered = filtered.filter(event => (event.averageRating || 0) >= minRating);
    }

    // Tags filter removed

    // Sort events
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date) - new Date(b.date);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return (b.averageRating || 0) - (a.averageRating || 0);
        case 'popularity':
          return b.attendees - a.attendees;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredEvents(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Tag toggle removed

  const clearAllFilters = () => {
    setFilters({
      category: 'all',
      dateRange: 'all',
      rating: 'all'
    });
    setSearchTerm('');
  };

  const formatDate = (dateString) => {
    const options = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getPriceText = (price) => {
    return price === 0 ? 'Free' : `$${price}`;
  };

  if (loading) {
    return (
      <div className="events-page loading">
        <div className="container py-5">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="events-page">
      {error && (
        <div className="container pt-3">
          <div className="alert alert-warning" role="alert">
            {error}
          </div>
        </div>
      )}
      {/* Hero Section */}
      <section className="events-hero">
        <div className="container">
          <div className="row justify-content-center text-center">
            <div className="col-lg-8">
              <h1 className="hero-title">Discover Amazing Events</h1>
              <p className="hero-subtitle">
                Find your next unforgettable experience from thousands of events worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="container">
          <div className="search-filter-content">
            <div className="search-section">
              <div className="search-input-wrapper">
                <i className="bi bi-search search-icon"></i>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search events, organizers, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-actions">
              <button
                className="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                <i className="bi bi-funnel-fill"></i>
                <span>Filters</span>
                {(filters.category !== 'all' || filters.dateRange !== 'all' || filters.rating !== 'all') && (
                  <span className="filter-badge">
                    {Object.values(filters).filter(val => val !== 'all').length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <div className="filters-modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="filters-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filters-modal-header">
              <h4>Filter Events</h4>
              <button
                className="close-modal-btn"
                onClick={() => setShowFilters(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="filters-modal-body">
              {/* Category Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-tag"></i>
                  Category
                </label>
                <select
                  className="form-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category === 'All Categories' ? 'all' : category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-calendar-event"></i>
                  Date
                </label>
                <select
                  className="form-select"
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                >
                  {dateRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price filter removed */}

              {/* Location filter removed */}

              {/* Rating Filter */}
              <div className="filter-group">
                <label className="filter-label">
                  <i className="bi bi-star"></i>
                  Rating
                </label>
                <select
                  className="form-select"
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                >
                  {ratings.map(rating => (
                    <option key={rating.value} value={rating.value}>
                      {rating.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags filter removed */}
            </div>

            <div className="filters-modal-footer">
              <button
                className="btn btn-outline-secondary"
                onClick={clearAllFilters}
              >
                Clear All
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container py-5">
        <div className="row">
          {/* Events Content */}
          <div className="col-12">
            {/* Results Header */}
            <div className="results-header">
              <div className="results-info">
                <h4>All Events</h4>
                <span className="results-count">
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
                </span>
              </div>
              
              <div className="view-controls">
                <div className="sort-control">
                  <label>Sort by:</label>
                  <select
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date">Date</option>
                    <option value="rating">Rating</option>
                    <option value="popularity">Popularity</option>
                  </select>
                </div>

                <div className="view-toggle">
                  <button
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                  >
                    <i className="bi bi-grid-3x3-gap"></i>
                  </button>
                  <button
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List View"
                  >
                    <i className="bi bi-list"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Events Grid/List */}
            {filteredEvents.length === 0 ? (
              <div className="no-events text-center py-5">
                <i className="bi bi-calendar-x no-events-icon"></i>
                <h4>No events found</h4>
                <p>Try adjusting your filters or search terms</p>
                <button className="btn btn-primary" onClick={clearAllFilters}>
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={`events-container ${viewMode}-view`}>
                {filteredEvents.map(event => (
                  <div key={event._id || event.id} className="event-card">
                    <div className="event-image">
                      <img src={(Array.isArray(event.images) && event.images.length > 0)
                        ? (() => {
                            const src = event.images[0];
                            if (!src) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZGRkIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
                            // If it was stored as full backend URL, map to proxied same-origin path
                            if (src.startsWith('http://localhost:5000/uploads/')) {
                              const file = src.split('/').pop();
                              return `/uploads/${file}`;
                            }
                            // If already absolute https/http (CDN), use as-is; else treat as filename
                            if (src.startsWith('http')) return src;
                            return `/uploads/${src}`;
                          })()
                        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZGRkIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg=='} alt={event.title} />
                      <div className="event-badge">
                        {event.price === 0 ? 'FREE' : `$${event.price}`}
                      </div>
                      <div className="event-category">{event.category}</div>
                    </div>

                    <div className="event-content">
                      <div className="event-header">
                        <h5 className="event-title">{event.title}</h5>
                        <div className="event-rating">
                          <i className="bi bi-star-fill"></i>
                          <span>{(event.averageRating || 0).toFixed(1)}{typeof event.totalRatings === 'number' ? ` (${event.totalRatings})` : ''}</span>
                        </div>
                      </div>

                      <p className="event-description">{event.description}</p>

                      <div className="event-details">
                        <div className="detail-item">
                          <i className="bi bi-calendar-event"></i>
                          <span>{formatDate(event.date)} at {event.time}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-geo-alt"></i>
                          <span>{event.location}</span>
                        </div>
                        <div className="detail-item">
                          <i className="bi bi-people"></i>
                          <span>{(event.attendees || event.currentAttendees || 0).toLocaleString()} attendees</span>
                        </div>
                      </div>

                      <div className="event-tags">
                        {(event.tags || []).slice(0, 3).map(tag => (
                          <span key={tag} className="event-tag">#{tag}</span>
                        ))}
                        {(event.tags || []).length > 3 && (
                          <span className="event-tag-more">+{(event.tags || []).length - 3} more</span>
                        )}
                      </div>

                      <div className="event-footer">
                        <div className="event-organizer">
                          <i className="bi bi-person-circle"></i>
                          <span>{typeof event.organizer === 'object' ? event.organizer.firstName + ' ' + event.organizer.lastName : event.organizer}</span>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/eventdetail/${event._id || event.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredEvents.length > 0 && (
              <div className="text-center mt-5">
                <button className="btn btn-outline-primary">
                  Load More Events
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsPage;