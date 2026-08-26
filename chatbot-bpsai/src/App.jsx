import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import NewChatRedirector from './components/NewChatRedirector'; 
import ChatPage from './pages/ChatPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<NewChatRedirector />} />
                    <Route path="/chat/:conversationId" element={<ChatPage />} />
                </Routes>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}

export default App;