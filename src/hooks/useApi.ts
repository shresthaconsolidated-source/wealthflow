import { useAuth } from '@/src/contexts/AuthContext';
import { useCallback } from 'react';

export function useApi() {
    const { token, logout } = useAuth();

    const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
        if (!token) {
            throw new Error('No authentication token available');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                logout();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            if (error instanceof Error && error.message === 'Unauthorized') {
                // Handled above.
            } else {
                console.error('API Request failed:', error);
            }
            throw error;
        }
    }, [token, logout]);

    return { fetchWithAuth };
}
