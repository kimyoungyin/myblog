import { User } from '@/types';
import { create } from 'zustand';

interface AuthState {
    user: User | null;
    isLoading: boolean;
    setUser: (user: User) => void;
    setLoading: (loading: boolean) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isLoading: true,
    setUser: (user: User) => {
        set({ user, isLoading: false });
    },
    setLoading: (loading: boolean) => {
        set({ isLoading: loading });
    },
    clearAuth: () => {
        set({ user: null, isLoading: false });
    },
}));
