import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/pages/Homepage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Createevent from './components/pages/CreateEvent';
import EventsPage from './components/pages/Eventpage';
import EventDetail from './components/pages/EventDetail';
import Profile from './components/pages/Profile';
import AdminPage from './components/pages/AdminPage';


const App = () => {
  useEffect(() => {
    const checkBlocked = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.status === 403 || (data?.data?.user && data.data.user.isBlocked)) {
          alert('Your account has been blocked by admin');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } catch {}
    };
    checkBlocked();
  }, []);
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path='/createevent' element={<Createevent/>}/>
        <Route path='/eventpage' element={<EventsPage/>}/>
        <Route path='/eventdetail/:id' element={<EventDetail/>}/>
        <Route path='/profile' element={<Profile/>}/>
        <Route path='/admin' element={<AdminPage/>}/>

      </Routes>
    </Router>
  );
};

export default App;
