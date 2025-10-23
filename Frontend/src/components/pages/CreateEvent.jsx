import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/createevent.css';

const Createevent = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    location: '',
    address: '',
    city: '',
    organizer: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
  });

  const [uploadedImages, setUploadedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef(null);
  const [slideClass, setSlideClass] = useState('');

  useEffect(() => {
    const showLoadingState = () => {
      if (!document.querySelector('.bootstrap-loading')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'bootstrap-loading';
        loadingOverlay.innerHTML = `
          <div class="text-center">
            <div class="loading-spinner"></div>
            <div class="loading-text">Initializing Event Creator...</div>
          </div>
        `;
        document.body.appendChild(loadingOverlay);
      }
    };

    const hideLoadingState = () => {
      const loadingOverlay = document.querySelector('.bootstrap-loading');
      if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        setTimeout(() => loadingOverlay.remove(), 500);
      }
      document.body.classList.add('bootstrap-initialized');
    };

    const initBootstrap = () => {
      showLoadingState();
      try {
        const bs = window.bootstrap;
        if (bs) {
          const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
          tooltipTriggerList.forEach((el) => new bs.Tooltip(el));
          const popoverTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="popover"]'));
          popoverTriggerList.forEach((el) => new bs.Popover(el));
        }
      } catch (_) {}
      setTimeout(hideLoadingState, 1000);
    };

    const initBackgroundTransitions = () => {
      const slides = document.querySelectorAll('.background-slide');
      slides.forEach((slide, index) => {
        slide.style.animationDelay = `${index * 8}s`;
      });
      const container = document.querySelector('.background-slideshow');
      if (container) {
        const pause = () => slides.forEach((s) => (s.style.animationPlayState = 'paused'));
        const resume = () => slides.forEach((s) => (s.style.animationPlayState = 'running'));
        container.addEventListener('mouseenter', pause);
        container.addEventListener('mouseleave', resume);
        return () => {
          container.removeEventListener('mouseenter', pause);
          container.removeEventListener('mouseleave', resume);
        };
      }
      return () => {};
    };

    const initPageAnimations = () => {
      const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }; 
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('animate-fade-in');
        });
      }, observerOptions);
      const targets = document.querySelectorAll('.card, .create-event-step, .create-event-progress');
      targets.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    };

    initBootstrap();
    const cleanupBg = initBackgroundTransitions();
    const cleanupObs = initPageAnimations();
    return () => {
      cleanupBg && cleanupBg();
      cleanupObs && cleanupObs();
    };
  }, []);

  const categories = [
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (files) => {
    const newImages = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      isPrimary: uploadedImages.length === 0 // First image becomes primary
    }));

    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleFileSelect = (e) => {
    handleImageUpload(e.target.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleImageUpload(files);
  };

  const removeImage = (id) => {
    setUploadedImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      // If we removed the primary image, make the first image primary
      if (newImages.length > 0 && !newImages.some(img => img.isPrimary)) {
        newImages[0].isPrimary = true;
      }
      return newImages;
    });
  };

  const setPrimaryImage = (id) => {
    setUploadedImages(prev => 
      prev.map(img => ({
        ...img,
        isPrimary: img.id === id
      }))
    );
  };

  const nextStep = () => {
    const target = Math.min(currentStep + 1, 3);
    // Alternate directions: step 2 from right, step 3 from left
    const dir = (target % 2 === 0) ? 'slide-in-right' : 'slide-in-left';
    setSlideClass(dir);
    setCurrentStep(target);
  };

  const prevStep = () => {
    const target = Math.max(currentStep - 1, 1);
    // Reverse direction on back: if target is even, slide in from left; if odd, from right
    const dir = (target % 2 === 0) ? 'slide-in-left' : 'slide-in-right';
    setSlideClass(dir);
    setCurrentStep(target);
  };

  const uploadImage = async (file) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please login to upload images');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/events/upload-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to upload image');
    }

    return result.data.imageUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Get token from localStorage (assuming user is logged in)
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to create an event');
        navigate('/?login=1');
        return;
      }

      // Upload all images
      const imageUrls = [];
      for (const image of uploadedImages) {
        try {
          const imageUrl = await uploadImage(image.file);
          imageUrls.push(imageUrl);
        } catch (error) {
          console.error('Failed to upload image:', error);
          // Continue with other images
        }
      }

      // Prepare form data for submission (let backend infer organizer from token)
      const eventData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: formData.date,
        time: formData.time,
        location: formData.address ? formData.address : 'Online Event',
        // Auto-derive a valid locationType required by backend
        locationType: formData.address ? 'in-person' : 'online',
        images: imageUrls,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        website: formData.website,
        price: 0
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      const text = await response.text();
      let result = {};
      try { result = JSON.parse(text); } catch { result = { message: text || 'Server error' }; }

      if (response.ok) {
        alert('Event created successfully!');
        navigate('/eventpage'); // Navigate to events page
      } else {
        alert(`Error creating event: ${result.message || 'Internal Server Error'}`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="create-event-page">
      {/* Auto-Transitioning Background Container */}
      <div className="background-slideshow">
        <div className="background-slide"></div>
        <div className="background-slide"></div>
        <div className="background-slide"></div>
        <div className="background-slide"></div>
      </div>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            {/* Header */}
            <div className="create-event-header text-center mb-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>
                  <i className="bi bi-arrow-left me-1"></i> Back
                </button>
                <div></div>
              </div>
              <h1 className="display-4 fw-bold text-gradient">Create New Event</h1>
              <p className="lead text-muted">Share your amazing event with the world</p>
            </div>

            {/* Progress Bar */}
            <div className="create-event-progress mb-5">
              <div className="progress-steps">
                {[1, 2, 3].map(step => (
                  <div key={step} className={`progress-step ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}>
                    <div className="step-number">{step}</div>
                    <div className="step-label">
                      {step === 1 && 'Basic Info'}
                      {step === 2 && 'Details'}
                      {step === 3 && 'Media'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className={`create-event-step animate-fade-in ${slideClass}`}>
                  <div className="card shadow-lg border-0">
                    <div className="card-header bg-transparent py-4">
                      <h3 className="card-title mb-0">Basic Information</h3>
                    </div>
                    <div className="card-body p-4">
                      <div className="row">
                        <div className="col-md-12 mb-4">
                          <div className="form-group">
                            <label className="form-label">Event Title *</label>
                            <input
                              type="text"
                              name="title"
                              className="form-control form-control-lg"
                              placeholder="Enter event title"
                              value={formData.title}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-md-12 mb-4">
                          <div className="form-group">
                            <label className="form-label">Description *</label>
                            <textarea
                              name="description"
                              className="form-control"
                              rows="5"
                              placeholder="Describe your event in detail..."
                              value={formData.description}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-md-6 mb-4">
                          <div className="form-group">
                            <label className="form-label">Category *</label>
                            <select
                              name="category"
                              className="form-select"
                              value={formData.category}
                              onChange={handleInputChange}
                              required
                            >
                              <option value="">Select Category</option>
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Event Details */}
              {currentStep === 2 && (
                <div className={`create-event-step animate-fade-in ${slideClass}`}>
                  <div className="card shadow-lg border-0">
                    <div className="card-header bg-transparent py-4">
                      <h3 className="card-title mb-0">Event Details</h3>
                    </div>
                    <div className="card-body p-4">
                      <div className="row">
                        <div className="col-md-6 mb-4">
                          <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input
                              type="date"
                              name="date"
                              className="form-control"
                              value={formData.date}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-md-6 mb-4">
                          <div className="form-group">
                            <label className="form-label">Time *</label>
                            <input
                              type="time"
                              name="time"
                              className="form-control"
                              value={formData.time}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>

                        

                        <div className="col-md-12 mb-4">
                          <div className="form-group">
                            <label className="form-label">Address</label>
                            <input
                              type="text"
                              name="address"
                              className="form-control"
                              placeholder="Street address"
                              value={formData.address}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Media & Contact */}
              {currentStep === 3 && (
                <div className={`create-event-step animate-fade-in ${slideClass}`}>
                  <div className="card shadow-lg border-0">
                    <div className="card-header bg-transparent py-4">
                      <h3 className="card-title mb-0">Media & Contact Information</h3>
                    </div>
                    <div className="card-body p-4">
                      {/* Image Upload Section */}
                      <div className="mb-5">
                        <h5 className="mb-3">Event Images</h5>
                        <div
                          className={`image-upload-area ${isDragging ? 'dragging' : ''}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={triggerFileInput}
                        >
                          <div className="upload-content">
                            <i className="bi bi-cloud-arrow-up upload-icon"></i>
                            <h4>Drop images here or click to upload</h4>
                            <p className="text-muted">Supports JPG, PNG, WEBP - Max 10MB per image</p>
                            <button type="button" className="btn btn-primary mt-3">
                              Select Images
                            </button>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="d-none"
                          />
                        </div>

                        {/* Uploaded Images Grid */}
                        {uploadedImages.length > 0 && (
                          <div className="uploaded-images-grid mt-4">
                            <h6 className="mb-3">Uploaded Images ({uploadedImages.length})</h6>
                            <div className="row g-3">
                              {uploadedImages.map((image, index) => (
                                <div key={image.id} className="col-md-4 col-lg-3">
                                  <div className={`image-preview-card ${image.isPrimary ? 'primary' : ''}`}>
                                    <img src={image.preview} alt={`Preview ${index + 1}`} />
                                    <div className="image-actions">
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${image.isPrimary ? 'btn-warning' : 'btn-outline-warning'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPrimaryImage(image.id);
                                        }}
                                        title="Set as primary"
                                      >
                                        <i className="bi bi-star-fill"></i>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeImage(image.id);
                                        }}
                                        title="Remove image"
                                      >
                                        <i className="bi bi-trash"></i>
                                      </button>
                                    </div>
                                    {image.isPrimary && (
                                      <div className="primary-badge">
                                        <i className="bi bi-star-fill"></i> Primary
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contact Information */}
                      <div className="row">
                        <div className="col-md-6 mb-4">
                          <div className="form-group">
                            <label className="form-label">Organizer Name *</label>
                            <input
                              type="text"
                              name="organizer"
                              className="form-control"
                              placeholder="Your name or organization"
                              value={formData.organizer}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-md-6 mb-4">
                          <div className="form-group">
                            <label className="form-label">Contact Email *</label>
                            <input
                              type="email"
                              name="contactEmail"
                              className="form-control"
                              placeholder="email@example.com"
                              value={formData.contactEmail}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-md-6 mb-4">
                          <div className="form-group">
                            <label className="form-label">Contact Phone</label>
                            <input
                              type="tel"
                              name="contactPhone"
                              className="form-control"
                              placeholder="+1 (555) 123-4567"
                              value={formData.contactPhone}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        <div className="col-md-6 mb-4">
                          <div className="form-group">
                            <label className="form-label">Website</label>
                            <input
                              type="url"
                              name="website"
                              className="form-control"
                              placeholder="https://example.com"
                              value={formData.website}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="create-event-navigation mt-5">
                <div className="row">
                  <div className="col-md-6">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-lg"
                        onClick={prevStep}
                      >
                        <i className="bi bi-arrow-left me-2"></i>
                        Previous
                      </button>
                    )}
                  </div>
                  <div className="col-md-6 text-end">
                    {currentStep < 3 ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={nextStep}
                      >
                        Next
                        <i className="bi bi-arrow-right ms-2"></i>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="btn btn-success btn-lg"
                      >
                        <i className="bi bi-check-circle me-2"></i>
                        Create Event
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Createevent;