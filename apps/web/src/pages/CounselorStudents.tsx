import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Badge, Input, Button, TextArea } from '@talkitout/ui';
import { userAPI, metricsAPI, counselorMessagesAPI } from '../api/client';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

interface Student {
  _id: string;
  name: string;
  email: string;
  age?: number;
  school?: string;
  createdAt: string;
  profile?: {
    streaks?: Array<{ type: string; count: number }>;
  };
}

interface StudentMetrics {
  checkIns: {
    total: number;
    averageMood: number;
    lastCheckIn?: string;
  };
  tasks: {
    total: number;
    completed: number;
  };
  focus: {
    totalSessions: number;
    totalMinutes: number;
  };
}

interface Message {
  _id: string;
  fromUserId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  toUserId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  text: string;
  read: boolean;
  createdAt: string;
  threadId?: string;
}

const panelCardClass = 'rounded-3xl border border-border bg-surface text-text shadow-card';
const statTileClass = 'text-center rounded-xl border border-border bg-surface-alt p-4 text-text';
const mutedTextClass = 'text-muted';
const selectedStudentClass = 'bg-primary border-primary-l text-white shadow-glow';
const unselectedStudentClass =
  'bg-surface-alt border-border hover:border-primary-l hover:bg-wellness-sage-50 dark:hover:bg-surface';
const conversationPanelClass =
  'rounded-xl border border-border bg-surface-alt p-4 text-text max-h-[400px] overflow-y-auto space-y-3';

export const CounselorStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentMetrics, setStudentMetrics] = useState<StudentMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await userAPI.getUsers({ role: 'student' });
      setStudents(response.data.users || []);
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const loadStudentMetrics = async (studentId: string) => {
    setIsLoadingMetrics(true);
    try {
      const response = await metricsAPI.getUserMetrics(studentId, { days: 30 });
      setStudentMetrics(response.data);
    } catch (error) {
      toast.error('Failed to load student metrics');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadConversation = async (studentId: string) => {
    setIsLoadingMessages(true);
    try {
      // Get messages sent by counselor to this student
      const sentResponse = await counselorMessagesAPI.getSentMessages(studentId);
      const sentMessages = sentResponse.data.messages || [];

      // Get all messages received by counselor
      const receivedResponse = await counselorMessagesAPI.getReceivedMessages();
      const allReceivedMessages = receivedResponse.data.messages || [];

      // Filter messages received from this specific student
      const receivedMessages = allReceivedMessages.filter(
        (msg: any) => msg.fromUserId._id === studentId
      );

      // Combine and sort by date (oldest first for chat display)
      const allMessages = [...sentMessages, ...receivedMessages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setConversationMessages(allMessages);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    loadStudentMetrics(student._id);
    loadConversation(student._id);
  };

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.school?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMoodColor = (mood: number) => {
    if (mood >= 4) return 'text-wellness-sage-500 dark:text-wellness-sage-300';
    if (mood >= 3) return 'text-amber-600 dark:text-amber-300';
    return 'text-red-600 dark:text-red-300';
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 4.5) return '😄';
    if (mood >= 3.5) return '🙂';
    if (mood >= 2.5) return '😐';
    if (mood >= 1.5) return '😟';
    return '😢';
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedStudent || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      await counselorMessagesAPI.sendMessage(selectedStudent._id, messageText);
      toast.success(`Message sent to ${selectedStudent.name}`);
      setMessageText('');
      loadConversation(selectedStudent._id); // Reload conversation after sending
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(error?.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-extrabold tracking-tight text-text mb-6">Students</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="lg:col-span-1">
          <Card className={panelCardClass}>
            <CardHeader>
              <CardTitle className="text-text">All Students ({filteredStudents.length})</CardTitle>
              <div className="mt-4">
                <Input
                  placeholder="Search by name, email, or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <p className="text-muted text-center py-8">No students found</p>
                ) : (
                  filteredStudents.map((student) => (
                    <motion.div
                      key={student._id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleStudentClick(student)}
                      className={`cursor-pointer rounded-2xl border transition-all ${
                        selectedStudent?._id === student._id
                          ? selectedStudentClass
                          : unselectedStudentClass
                      } p-3`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`font-medium text-sm ${selectedStudent?._id === student._id ? 'text-white' : 'text-text'}`}>
                            {student.name}
                          </h3>
                          <p className={`text-xs mt-0.5 ${selectedStudent?._id === student._id ? 'text-white/80' : 'text-muted'}`}>
                            {student.email}
                          </p>
                          {student.school && (
                            <p className={`text-xs mt-0.5 ${selectedStudent?._id === student._id ? 'text-white/70' : 'text-muted'}`}>
                              {student.school}
                            </p>
                          )}
                        </div>
                        {student.age && (
                          <Badge variant="default" className="text-xs">
                            {student.age}y
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Details */}
        <div className="lg:col-span-2">
          {!selectedStudent ? (
            <Card className={panelCardClass}>
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="text-6xl mb-4">👥</div>
                  <p className="text-text">Select a student to view their details</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Student Info Card */}
              <Card className={panelCardClass}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-text text-2xl">{selectedStudent.name}</CardTitle>
                      <p className="text-sm text-muted mt-1">{selectedStudent.email}</p>
                    </div>
                    <Badge variant="info">Student</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {selectedStudent.age && (
                      <div>
                        <p className="text-xs text-muted mb-1">Age</p>
                        <p className="text-sm font-medium text-text">{selectedStudent.age} years old</p>
                      </div>
                    )}
                    {selectedStudent.school && (
                      <div>
                        <p className="text-xs text-muted mb-1">School</p>
                        <p className="text-sm font-medium text-text">{selectedStudent.school}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted mb-1">Joined</p>
                      <p className="text-sm font-medium text-text">
                        {new Date(selectedStudent.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics Cards */}
              {isLoadingMetrics ? (
                <Card className={panelCardClass}>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellness-sage-400 mx-auto mb-2" />
                      <p className="text-sm text-muted">Loading metrics...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : studentMetrics ? (
                <>
                  {/* Check-ins Card */}
                  <Card className={panelCardClass}>
                    <CardHeader>
                      <CardTitle className="text-text">Check-ins (Last 30 Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className={statTileClass}>
                          <div className="text-3xl font-bold">
                            {studentMetrics.checkIns.total}
                          </div>
                          <div className={`mt-1 text-xs ${mutedTextClass}`}>Total Check-ins</div>
                        </div>
                        <div className={statTileClass}>
                          <div className={`text-3xl font-bold ${getMoodColor(studentMetrics.checkIns.averageMood)}`}>
                            {getMoodEmoji(studentMetrics.checkIns.averageMood)}{' '}
                            {studentMetrics.checkIns.averageMood.toFixed(1)}
                          </div>
                          <div className={`mt-1 text-xs ${mutedTextClass}`}>Average Mood</div>
                        </div>
                        <div className={statTileClass}>
                          <div className="text-sm font-medium">
                            {studentMetrics.checkIns.lastCheckIn
                              ? new Date(studentMetrics.checkIns.lastCheckIn).toLocaleDateString()
                              : 'Never'}
                          </div>
                          <div className={`mt-1 text-xs ${mutedTextClass}`}>Last Check-in</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tasks & Focus Cards */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className={panelCardClass}>
                      <CardHeader>
                        <CardTitle className="text-text">Tasks</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text">Total Tasks</span>
                          <Badge variant="neutral">{studentMetrics.tasks.total}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text">Completed</span>
                          <Badge variant="positive">{studentMetrics.tasks.completed}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text">Completion Rate</span>
                          <Badge variant="info">
                            {studentMetrics.tasks.total > 0
                              ? Math.round((studentMetrics.tasks.completed / studentMetrics.tasks.total) * 100)
                              : 0}
                            %
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={panelCardClass}>
                      <CardHeader>
                        <CardTitle className="text-text">Focus Sessions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text">Total Sessions</span>
                          <Badge variant="neutral">{studentMetrics.focus.totalSessions}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text">Total Minutes</span>
                          <Badge variant="positive">{studentMetrics.focus.totalMinutes}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text">Avg per Session</span>
                          <Badge variant="info">
                            {studentMetrics.focus.totalSessions > 0
                              ? Math.round(studentMetrics.focus.totalMinutes / studentMetrics.focus.totalSessions)
                              : 0}{' '}
                            min
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Streaks Card */}
                  {selectedStudent.profile?.streaks && selectedStudent.profile.streaks.length > 0 && (
                    <Card className={panelCardClass}>
                      <CardHeader>
                        <CardTitle className="text-text">Current Streaks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                          {selectedStudent.profile.streaks.map((streak) => (
                            <div key={streak.type} className={statTileClass}>
                              <div className="text-2xl mb-1">
                                {streak.type === 'checkin' ? '🔥' : streak.type === 'focus' ? '⚡' : '🎯'}
                              </div>
                              <div className="text-2xl font-bold">{streak.count}</div>
                              <div className={`text-xs ${mutedTextClass} mt-1 capitalize`}>{streak.type} Streak</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Message Student Card */}
                  <Card className={panelCardClass}>
                    <CardHeader>
                      <CardTitle className="text-text flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        Conversation with {selectedStudent.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Conversation History */}
                        {isLoadingMessages ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wellness-sage-400 mx-auto mb-2" />
                            <p className="text-sm text-muted">Loading conversation...</p>
                          </div>
                        ) : conversationMessages.length > 0 ? (
                          <div className={conversationPanelClass}>
                            <p className="text-xs text-muted mb-3 text-center">
                              Message history with {selectedStudent.name}
                            </p>
                            {conversationMessages.map((msg) => {
                              const messageAuthorId = msg.fromUserId?._id || (msg.fromUserId as any);
                              const isFromCounselor =
                                (selectedStudent && messageAuthorId !== selectedStudent._id) ||
                                msg.fromUserId?.role === 'counselor' ||
                                msg.fromUserId?.role === 'admin';
                              return (
                                <div
                                  key={msg._id}
                                  className={`flex ${isFromCounselor ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[80%] p-3 rounded-xl ${
                                      isFromCounselor
                                        ? 'bg-primary text-white shadow-card'
                                        : 'bg-surface border border-border text-text'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span
                                        className={`text-xs font-medium ${
                                          isFromCounselor ? 'text-white/90' : 'text-muted'
                                        }`}
                                      >
                                        {msg.fromUserId.name}
                                      </span>
                                      <span
                                        className={`text-xs ${
                                          isFromCounselor ? 'text-white/70' : 'text-muted'
                                        }`}
                                      >
                                        {new Date(msg.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border bg-surface-alt p-8 text-center text-text">
                            <p className="text-sm text-muted">
                              No messages yet. Start the conversation with {selectedStudent.name}!
                            </p>
                          </div>
                        )}

                        {/* Message Input */}
                        <div className="pt-2 border-t-2 border-border">
                          <TextArea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder={`Write a message to ${selectedStudent.name}...`}
                            className="min-h-[120px] bg-surface border border-border rounded-xl focus:ring-2 focus:ring-wellness-sage-400 focus:border-wellness-sage-400"
                          />
                          <div className="flex justify-end mt-3">
                            <Button
                              onClick={handleSendMessage}
                              disabled={!messageText.trim() || isSendingMessage}
                              isLoading={isSendingMessage}
                              className="bg-primary text-white rounded-full px-6 hover:bg-primary-d"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Send Message
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
