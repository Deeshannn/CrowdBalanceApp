import React from 'react'
import Login from './auth/LoginScreen/index';

const Index = () => {
  const handleLogin = (role, credentials) => {
    console.log('Login attempt:', role, credentials);
    // You can add navigation logic here later
    // For example: router.push('/dashboard');
  };

  return <Login onLogin={handleLogin} />
}

export default Index;