import { Timestamp } from 'firebase/firestore';

export interface Conversation {
  id: string;
  createdAt: Timestamp;
  members: string[]; // array of participant IDs
  lastMessage?: string; // optional for fast preview
  updatedAt: Timestamp;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of user IDs who voted for this option
}

export interface Poll {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  expiresAt?: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string; // optional for poll messages
  createdAt: Timestamp;
  type: 'text' | 'image' | 'file' | 'poll';
  readBy?: string[]; // optional read receipts
  poll?: Poll; // only present when type is 'poll'
}

export interface CreateConversationData {
  id?: string;
  members: string[];
  lastMessage?: string;
}

export interface SendMessageData {
  senderId: string;
  text?: string;
  type?: 'text' | 'image' | 'file' | 'poll';
  readBy?: string[];
  poll?: Poll; // only present when type is 'poll'
}

export interface CreatePollData {
  question: string;
  options: Omit<PollOption, 'votes'>[];
  allowMultiple?: boolean;
  expiresAt?: Date;
}

export interface VoteData {
  optionId: string;
  userId: string;
}
