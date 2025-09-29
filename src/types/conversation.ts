import { Timestamp } from 'firebase/firestore';

export interface Conversation {
  id: string;
  createdAt: Timestamp;
  members: string[]; // array of participant IDs
  lastMessage?: string; // optional for fast preview
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  type: 'text' | 'image' | 'file';
  readBy?: string[]; // optional read receipts
}

export interface CreateConversationData {
  members: string[];
  lastMessage?: string;
}

export interface SendMessageData {
  senderId: string;
  text: string;
  type?: 'text' | 'image' | 'file';
  readBy?: string[];
}
