import React, { useState, useEffect, useRef } from 'react';
import '../css/homepage.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import Login from '../auth/Login';
import Register from '../auth/Register';
import { useNavigate } from 'react-router-dom';

const EventLanding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const cardRefs = useRef([]);
  const navigate = useNavigate();

  const events = [
    {
      id: 1,
      title: "Tech Conference 2024",
      date: "March 15, 2024",
      location: "Convention Center",
      price: "$199",
      image: "data:image/jpeg;base64,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",
      category: "Technology"
    },
    {
      id: 2,
      title: "Music Festival",
      date: "April 22, 2024",
      location: "Central Park",
      price: "$89",
      image: "data:image/jpeg;base64,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",
      category: "Music"
    },
    {
      id: 3,
      title: "Food & Wine Expo",
      date: "May 5, 2024",
      location: "Exhibition Hall",
      price: "$75",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaLpEMfI-JhrNPkQG0iZwpfpBdkcfT_8KWnQ&s",
      category: "Food"
    },
    {
      id: 4,
      title: "Startup Pitch Competition",
      date: "June 12, 2024",
      location: "Innovation Hub",
      price: "Free",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQTALulPFtfAt0EB57lRmhtNZkbcVBfG3lLhA&s",
      category: "Business"
    }
  ];

  const featuredImages = [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredImages.length]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setIsAdmin(u?.role === 'admin');
      }
    } catch {}
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      cardRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  const isLoggedIn = () => !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowLogin(true);
    navigate('/?login=1');
  };

  const handleCreateEventClick = () => {
    if (!isLoggedIn()) {
      setShowLogin(true);
      return;
    }
    navigate('/createevent');
  };
  const handleexploreevent = ()=> {
    if (!isLoggedIn()) {
      setShowLogin(true);
      return;
    }
    navigate('/eventpage');
  }

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === '1') {
        setShowLogin(true);
      }
    } catch {}
  }, []);

  return (
    <div className="event-landing-page">
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-dark fixed-top custom-navbar">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#">
            Event<span className="brand-highlight">Hub</span>
          </a>

          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link active" href="#">Home</a>
              </li>
              <li className="nav-item">
                <button className="nav-link btn btn-link p-0" onClick={handleexploreevent}>Events</button>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#about">About</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contact">Contact</a>
              </li>
              {isAdmin && (
                <li className="nav-item">
                  <button className="nav-link btn btn-link p-0 text-warning fw-semibold" onClick={()=>navigate('/admin')}>
                    Admin Dashboard
                  </button>
                </li>
              )}
              {isLoggedIn() ? (
                <li className="nav-item">
                  <button className="nav-link btn btn-link p-0" title="Profile" onClick={()=>navigate('/profile')}>
                    <i className="bi bi-person-circle" style={{ fontSize: '1.3rem', color: 'var(--dark-color)' }}></i>
                  </button>
                </li>
              ) : (
                <li className="nav-item">
                  <button className="btn btn-dark btn-sm" onClick={() => setShowLogin(true)} style={{ visibility: 'visible' }}>Login</button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section with Animated Images */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center min-vh-100">
            <div className="col-lg-6">
              <div className="hero-content">
                <h1 className="hero-title animate-fade-in">
                  Discover Amazing
                  <span className="highlight"> Events</span>
                  Near You
                </h1>
                <p className="hero-subtitle animate-fade-in-delay">
                  Join thousands of participants in unforgettable experiences.
                  From tech conferences to music festivals, find your next adventure.
                </p>
                <div className="hero-buttons animate-fade-in-delay-2">
                  <button className="btn btn-primary btn-lg me-3" onClick={handleexploreevent}>Explore Events</button>
                  <button className="btn btn-outline-primary btn-lg" onClick={handleCreateEventClick}>Create Event</button>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="image-carousel">
                {featuredImages.map((image, index) => (
                  <div
                    key={index}
                    className={`carousel-slide ${
                      index === currentSlide ? 'active' : ''
                    } ${index === (currentSlide - 1 + featuredImages.length) % featuredImages.length ? 'prev' : ''}`}
                  >
                    <img
                      src={image}
                      alt={`Event ${index + 1}`}
                      className="img-fluid rounded-3 shadow-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section removed */}

      {/* About Section */}
      <section id="about" className="py-5 bg-light">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-6">
              <h2 className="mb-3">About EventHub</h2>
              <p className="text-muted">
                EventHub is a modern platform to discover, create, and share events. From local meetups to global
                conferences, we connect people through unforgettable experiences. Create your own event or explore
                thousands curated by our community.
              </p>
              <ul className="list-unstyled mt-3">
                <li className="mb-2"><i className="bi bi-check-circle text-primary me-2"></i>Discover trending events</li>
                <li className="mb-2"><i className="bi bi-check-circle text-primary me-2"></i>Create and manage events easily</li>
                <li className="mb-2"><i className="bi bi-check-circle text-primary me-2"></i>Rate and review your experiences</li>
              </ul>
            </div>
            <div className="col-lg-6">
              <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm">
                <img src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop" alt="About EventHub" className="w-100 h-100 object-fit-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h2 className="mb-3 text-center">Contact Us</h2>
              <p className="text-muted text-center mb-4">Have questions or feedback? Send us a message and we’ll get back to you.</p>
              <form onSubmit={(e) => { e.preventDefault(); alert('Thanks for contacting us!'); e.target.reset(); }}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input type="text" className="form-control" placeholder="Your name" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" placeholder="email@example.com" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Message</label>
                    <textarea className="form-control" rows="4" placeholder="How can we help?" required></textarea>
                  </div>
                  <div className="col-12 text-end">
                    <button type="submit" className="btn btn-primary">Send Message</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="newsletter-section py-5 bg-dark text-white">
        <div className="container">
          <div className="row justify-content-center text-center">
            <div className="col-lg-6">
              <h3>Stay Updated</h3>
              <p>Subscribe to our newsletter and never miss an event</p>
              <div className="input-group mb-3">
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                />
                <button className="btn btn-primary" type="button">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer py-4">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5>EventHub</h5>
              <p>Connecting people through unforgettable experiences.</p>
            </div>
            <div className="col-md-3">
              <h6>Quick Links</h6>
              <ul className="list-unstyled">
                <li><a href="#">Home</a></li>
                <li><a href="#">Events</a></li>
                <li><a href="#">About</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="col-md-3">
              <h6>Follow Us</h6>
              <div className="social-links">
                <a href="#"><i className="bi bi-facebook"></i></a>
                <a href="#"><i className="bi bi-twitter"></i></a>
                <a href="#"><i className="bi bi-instagram"></i></a>
                <a href="#"><i className="bi bi-linkedin"></i></a>
              </div>
            </div>
          </div>
          <div className="text-center mt-4">
            <p>&copy; 2024 EventHub. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <Login
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
      />
      <Register
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
      />
    </div>
  );
};

export default EventLanding;
