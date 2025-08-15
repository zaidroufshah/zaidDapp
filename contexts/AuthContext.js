import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setSession(session);
        setUser(session?.user || null);

        // Only ensure profile if authenticated
        if (session?.user) {
          await ensureUserProfile(session.user);
        }
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);

        // Create profile only after sign in
        if (event === 'SIGNED_IN' && session?.user) {
          await ensureUserProfile(session.user);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Helper function to ensure user profile exists
  const ensureUserProfile = async (user) => {
    try {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        const fullName = user.user_metadata?.full_name ||
                         user.email?.split('@')[0] ||
                         'User';
        await createUserProfile(user, fullName);
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const signUp = async (email, password, fullName) => {
    try {
      console.log('Attempting to sign up user:', { email, fullName });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Helper function to create user profile
  const createUserProfile = async (user, fullName) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName || user.user_metadata?.full_name || 'User',
        });

      if (error) {
        console.error('Error creating user profile:', error);
      } else {
        console.log('User profile created successfully');
      }
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Always return a friendly generic message for wrong credentials
        return {
          data: null,
          error: { message: "Your email or password is incorrect. Please try again." }
        };
      }

      return { data, error: null };
    } catch (err) {
      console.error("Sign in error:", err);
      return {
        data: null,
        error: { message: "Something went wrong. Please try again later." }
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { data: null, error };
    }
  };

  const linkWallet = async (walletAddress) => {
    if (!user) return { data: null, error: new Error('No user logged in') };

    try {
      // 1. Update in auth.users metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { wallet_address: walletAddress },
      });
      if (authError) throw authError;

      // 2. Update in public.users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ wallet_address: walletAddress })
        .eq('id', user.id);
      if (dbError) throw dbError;

      // 3. Refresh profile in memory
      const { data: freshProfile } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('id', user.id)
        .maybeSingle();

      if (freshProfile?.wallet_address?.toLowerCase() === walletAddress.toLowerCase()) {
        console.log("✅ Wallet linked successfully and saved to DB");
      }

      return { data: { wallet_address: walletAddress }, error: null };
    } catch (error) {
      console.error('Link wallet error:', error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    linkWallet,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
