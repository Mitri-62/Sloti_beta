import { io, Socket } from 'socket.io-client';
import { Reception } from '../types';
import { useStore } from '../stores/useStore';
import config from '../config';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;

  connect(userId: string) {
    this.userId = userId;
    this.socket = io(config.apiUrl, {
      auth: { userId }
    });

    this.socket.on('reception:created', (reception: Reception) => {
      useStore.getState().addReception(reception);
    });

    this.socket.on('reception:updated', (reception: Reception) => {
      useStore.getState().updateReception(reception.id, reception);
    });

    this.socket.on('reception:deleted', (id: string) => {
      useStore.getState().deleteReception(id);
    });

    this.socket.on('user:active', ({ userId, action }) => {
      useStore.getState().updateUserActivity(userId, action);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emitReceptionCreated(reception: Reception) {
    if (this.socket) {
      this.socket.emit('reception:create', reception);
    }
  }

  emitReceptionUpdated(reception: Reception) {
    if (this.socket) {
      this.socket.emit('reception:update', reception);
    }
  }

  emitReceptionDeleted(id: string) {
    if (this.socket) {
      this.socket.emit('reception:delete', id);
    }
  }

  emitUserAction(action: string) {
    if (this.socket && this.userId) {
      this.socket.emit('user:action', {
        userId: this.userId,
        action
      });
    }
  }
}

export const socketService = new SocketService();