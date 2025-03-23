'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { MdWarning, MdLogin, MdPersonAdd } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  // Redirect to main page if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error logging in:', error);
        // Show more detailed error message
        if (error.message.includes('Invalid login credentials')) {
          setError('פרטי התחברות שגויים. בדוק את האימייל והסיסמה שלך.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('האימייל טרם אומת. בדוק את תיבת הדואר שלך.');
        } else if (error.message.includes('requested path is invalid')) {
          setError('שגיאת ניתוב. אנא רענן את הדף ונסה שוב.');
        } else {
          setError(error.message || 'התחברות נכשלה. נסה שוב.');
        }
      }
    } catch (error) {
      console.error('Unexpected error during login:', error);
      setError('אירעה שגיאה. נסה שוב מאוחר יותר.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // For simplicity, we use signUp without email verification
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0], // Use part of email as name
          },
          // Fix redirect URL format to prevent path errors
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('Error registering:', error);
        // Show more detailed error message
        if (error.message.includes('User already registered')) {
          setError('משתמש עם אימייל זה כבר רשום. אנא התחבר.');
        } else if (error.message.includes('Password should be')) {
          setError('הסיסמה צריכה להיות באורך של לפחות 6 תווים.');
        } else if (error.message.includes('requested path is invalid')) {
          setError('שגיאת ניתוב. אנא רענן את הדף ונסה שוב.');
        } else {
          setError(error.message || 'ההרשמה נכשלה. נסה שוב.');
        }
      } else {
        // If email confirmation is required
        if (data?.user?.identities?.length === 0) {
          setSuccess('נשלח מייל אימות. לחץ על הקישור במייל כדי להשלים את ההרשמה.');
        } else {
          // If auto-confirmed (in development mode this might happen)
          setSuccess('ההרשמה הצליחה! אתה יכול להתחבר כעת.');
          // Try to sign in automatically
          await handleImmediateLogin(email, password);
        }
      }
    } catch (error) {
      console.error('Unexpected error during registration:', error);
      setError('אירעה שגיאה. נסה שוב מאוחר יותר.');
    } finally {
      setIsLoading(false);
    }
  };

  // Try to sign in immediately after signup
  const handleImmediateLogin = async (email, password) => {
    try {
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
    } catch (error) {
      console.error('Error in immediate login:', error);
      // Fail silently, user can still log in manually
    }
  };

  // Debug mode for development
  const handleSkipAuth = () => {
    // Set a mock user in localStorage to bypass auth
    const mockUser = {
      id: 'dev-user-123',
      email: 'dev@example.com',
      user_metadata: {
        full_name: 'Development User'
      }
    };
    
    localStorage.setItem('fridgeflow_dev_user', JSON.stringify(mockUser));
    window.location.reload();
  };

  // Test Supabase connection
  const testSupabaseConnection = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.from('_test_connection').select('*').limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist error is fine
        setSuccess('החיבור ל-Supabase תקין! (לא נמצאה טבלת _test_connection)');
      } else if (error) {
        setError(`בעיית חיבור ל-Supabase: ${error.message}`);
      } else {
        setSuccess('החיבור ל-Supabase תקין!');
      }
    } catch (error) {
      console.error('Supabase connection test error:', error);
      setError(`בעיית חיבור ל-Supabase: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">FridgeFlow</h1>
        <p className="login-subtitle">Made by YM Studio</p>
        
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">אימייל</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="הכנס אימייל"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הכנס סיסמה (לפחות 6 תווים)"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="login-error">
              <MdWarning size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="login-success">
              <span>{success}</span>
            </div>
          )}
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isRegistering ? 
              <><MdPersonAdd size={20} /> הרשמה</> : 
              <><MdLogin size={20} /> התחברות</>
            }
          </button>
        </form>
        
        <div className="login-toggle">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(null);
              setSuccess(null);
            }}
            className="toggle-button"
          >
            {isRegistering ? 'כבר יש לך חשבון? התחבר' : 'אין לך חשבון? הירשם'}
          </button>
        </div>

        {/* Development Tools */}
        <div className="dev-tools">
          <button 
            className="debug-toggle" 
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
          </button>
          
          {showDebug && (
            <div className="debug-panel">
              <p>For development purposes only:</p>
              <button className="dev-button" onClick={handleSkipAuth}>
                Skip Authentication (Dev Mode)
              </button>
              <button 
                className="dev-button" 
                onClick={testSupabaseConnection}
                style={{ marginLeft: '10px', backgroundColor: '#00897B' }}
                disabled={isLoading}
              >
                Test Supabase Connection
              </button>
              <div className="debug-info">
                <p><strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}</p>
                <p><strong>Current Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Unknown'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 