import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, TextArea } from '@talkitout/ui';
import { counselorMessagesAPI } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Mail, MailOpen, Send } from 'lucide-react';

interface CounselorMessage {
  _id: string;
  from: {
    _id: string;
    name: string;
    role: string;
  };
  to?: {
    _id: string;
    name: string;
    role: string;
  };
  text: string;
  read: boolean;
  createdAt: string;
}

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CounselorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<CounselorMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<CounselorMessage[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const response = await counselorMessagesAPI.getReceivedMessages();
      const messagesData = response.data.messages || [];

      // Transform the API response to match the component's expected structure
      const transformedMessages = messagesData.map((msg: any) => ({
        _id: msg._id,
        from: {
          _id: msg.fromUserId._id,
          name: msg.fromUserId.name,
          role: msg.fromUserId.role,
        },
        text: msg.text,
        read: msg.read,
        createdAt: msg.createdAt,
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageClick = async (message: CounselorMessage) => {
    setSelectedMessage(message);
    setReplyText('');

    // Load conversation thread
    await loadThread(message._id);

    // Mark as read
    if (!message.read) {
      try {
        await counselorMessagesAPI.markAsRead(message._id);
        setMessages(prev =>
          prev.map(m => m._id === message._id ? { ...m, read: true } : m)
        );
      } catch (error) {
        console.error('Failed to mark message as read:', error);
        toast.error('Failed to mark message as read');
      }
    }
  };

  const loadThread = async (messageId: string) => {
    setIsLoadingThread(true);
    try {
      const response = await counselorMessagesAPI.getThread(messageId);
      const threadData = response.data.messages || [];

      // Transform thread messages
      const transformedThread = threadData.map((msg: any) => ({
        _id: msg._id,
        from: {
          _id: msg.fromUserId._id,
          name: msg.fromUserId.name,
          role: msg.fromUserId.role,
        },
        to: msg.toUserId ? {
          _id: msg.toUserId._id,
          name: msg.toUserId.name,
          role: msg.toUserId.role,
        } : undefined,
        text: msg.text,
        read: msg.read,
        createdAt: msg.createdAt,
      }));

      setThreadMessages(transformedThread);
    } catch (error) {
      console.error('Failed to load thread:', error);
      toast.error('Failed to load conversation');
      setThreadMessages([]);
    } finally {
      setIsLoadingThread(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await counselorMessagesAPI.replyToMessage(selectedMessage._id, replyText);
      toast.success('Reply sent successfully');
      setReplyText('');

      // Reload the thread to show the new reply
      await loadThread(selectedMessage._id);
    } catch (error: any) {
      console.error('Failed to send reply:', error);
      toast.error(error?.response?.data?.message || 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wellness-sage-400 mx-auto mb-4" />
          <p className="text-muted">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-text mb-2">Messages from Counselor</h1>
        <p className="text-muted">
          {unreadCount > 0 ? `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card className="bg-surface border-border shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-text flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Inbox ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-3">📬</div>
                  <p className="text-muted">No messages yet</p>
                  <p className="text-sm text-muted mt-1">Your counselor hasn't sent you any messages</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {messages.map((message) => (
                    <motion.div
                      key={message._id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleMessageClick(message)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedMessage?._id === message._id
                          ? 'bg-wellness-sage-500 border-wellness-sage-400 shadow-soft'
                          : message.read
                          ? 'bg-surface-alt border-border hover:border-wellness-sage-400'
                          : 'bg-surface-alt border-wellness-sage-400 hover:border-wellness-sage-400'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {message.read ? (
                            <MailOpen className="w-4 h-4 text-muted" />
                          ) : (
                            <Mail className="w-4 h-4 text-wellness-sage-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm ${message.read ? 'text-text' : 'text-text'}`}>
                              {message.from.name}
                            </span>
                            {!message.read && <Badge variant="positive" className="text-xs">New</Badge>}
                          </div>
                          <p className={`text-xs line-clamp-2 ${message.read ? 'text-muted' : 'text-muted'}`}>
                            {message.text}
                          </p>
                          <p className="text-xs text-muted mt-1">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message Details */}
        <div className="lg:col-span-2">
          {!selectedMessage ? (
            <Card className="bg-surface border-border shadow-card rounded-2xl">
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="text-6xl mb-4">💌</div>
                  <p className="text-text">Select a message to read</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-surface border-border shadow-card rounded-2xl">
              <CardHeader className="border-b-2 border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-text text-xl">
                      Conversation with {selectedMessage.from.name}
                    </CardTitle>
                    <p className="text-sm text-muted mt-1">
                      Started {new Date(selectedMessage.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="info">{selectedMessage.from.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Conversation Thread */}
                {isLoadingThread ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellness-sage-400 mx-auto mb-2" />
                    <p className="text-sm text-muted">Loading conversation...</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                    {threadMessages.map((msg) => {
                      const messageAuthorId = (msg.from as any)?.id || (msg.from as any)?._id || msg.from;
                      const currentUserId = user?.id || (user as any)?._id;
                      const isFromMe = messageAuthorId && currentUserId ? messageAuthorId === currentUserId : false;
                      return (
                        <div
                          key={msg._id}
                          className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-4 rounded-xl ${
                              isFromMe
                                ? 'bg-wellness-sage-500 text-white'
                                : 'bg-surface-alt text-text'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${isFromMe ? 'text-white/90' : 'text-muted'}`}>
                                {msg.from.name}
                              </span>
                              <span className={`text-xs ${isFromMe ? 'text-white/70' : 'text-muted'}`}>
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reply Section */}
                <div className="mt-6 pt-6 border-t-2 border-border">
                  <h3 className="text-sm font-medium text-text mb-3 flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Reply to {selectedMessage.from.name}
                  </h3>
                  <div className="space-y-3">
                    <TextArea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="min-h-[100px] bg-surface border border-border rounded-xl focus:ring-2 focus:ring-wellness-sage-400 focus:border-wellness-sage-400"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || isSendingReply}
                        isLoading={isSendingReply}
                        className="bg-[#13111C] text-white rounded-full px-6 hover:bg-wellness-sage-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
