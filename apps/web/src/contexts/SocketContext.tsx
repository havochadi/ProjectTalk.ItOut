import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type EventHandler = (payload: any) => void;

interface RealtimeSocket {
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler: EventHandler) => void;
  emit: (event: string, payload: unknown) => void;
}

interface SocketContextType {
  socket: RealtimeSocket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<RealtimeSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const isStaff = user?.role === 'counselor' || user?.role === 'admin';
    if (!isStaff) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const handlers = new Map<string, Set<EventHandler>>();
    const adapter: RealtimeSocket = {
      on(event, handler) {
        const eventHandlers = handlers.get(event) || new Set<EventHandler>();
        eventHandlers.add(handler);
        handlers.set(event, eventHandlers);
      },
      off(event, handler) {
        handlers.get(event)?.delete(handler);
      },
      // Pomodoro events were previously sent to Socket.IO, but no server-side
      // listener consumed them. Timer persistence now happens through Supabase.
      emit() {},
    };

    const channel = supabase
      .channel('counselor-risk-flags')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'risk_flags' },
        async (payload) => {
          const flag: any = payload.new;
          const { data: student } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', flag.user_id)
            .maybeSingle();
          handlers.get('riskFlag:created')?.forEach((handler) =>
            handler({
              flagId: flag.id,
              studentId: flag.user_id,
              studentName: student?.name,
              severity: flag.severity,
              tags: flag.tags || [],
              createdAt: flag.created_at,
            })
          );
        }
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));

    setSocket(adapter);
    return () => {
      setSocket(null);
      setIsConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};
