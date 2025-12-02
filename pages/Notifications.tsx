import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, X, Trash2, Filter } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, deleteNotification, updateInvitationStatus, getTeamById } from '../utils/db';
import { Notification, NotificationType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const Notifications: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | NotificationType>('all');

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user]);

    const loadNotifications = async () => {
        if (!user) return;
        try {
            const userNotifications = await getUserNotifications(user.id);
            setNotifications(userNotifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId);
            await loadNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleDelete = async (notificationId: string) => {
        try {
            await deleteNotification(notificationId);
            await loadNotifications();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleAcceptInvitation = async (invitationId: string, teamId: string) => {
        if (!user) return;
        try {
            await updateInvitationStatus(invitationId, 'accepted');
            await loadNotifications();
        } catch (error) {
            console.error('Error accepting invitation:', error);
        }
    };

    const handleRejectInvitation = async (invitationId: string) => {
        try {
            await updateInvitationStatus(invitationId, 'rejected');
            await loadNotifications();
        } catch (error) {
            console.error('Error rejecting invitation:', error);
        }
    };

    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => n.type === filter);

    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-white text-xl">Loading notifications...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Bell size={32} className="text-elkawera-accent" />
                        <div>
                            <h1 className="text-3xl font-bold text-white">Notifications</h1>
                            <p className="text-gray-400 text-sm">
                                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === 'all'
                            ? 'bg-elkawera-accent text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('team_invitation')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === 'team_invitation'
                            ? 'bg-elkawera-accent text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Invitations
                    </button>
                    <button
                        onClick={() => setFilter('match_request')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === 'match_request'
                            ? 'bg-elkawera-accent text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Matches
                    </button>
                    <button
                        onClick={() => setFilter('rank_promotion')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === 'rank_promotion'
                            ? 'bg-elkawera-accent text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        Achievements
                    </button>
                </div>

                {/* Notifications List */}
                <div className="space-y-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                            <Bell size={48} className="mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-400">No notifications to show</p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`bg-white/5 border rounded-2xl p-6 transition-all ${notification.read
                                    ? 'border-white/5'
                                    : 'border-elkawera-accent/30 bg-elkawera-accent/5'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-white font-bold">{notification.title}</h3>
                                            {!notification.read && (
                                                <span className="w-2 h-2 bg-elkawera-accent rounded-full"></span>
                                            )}
                                        </div>
                                        <p className="text-gray-300 mb-3">{notification.message}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(notification.createdAt).toLocaleString()}
                                        </p>

                                        {/* Action Buttons for Team Invitations */}
                                        {notification.type === 'team_invitation' && notification.metadata?.invitationId && (
                                            <div className="flex gap-2 mt-4">
                                                <button
                                                    onClick={() => handleAcceptInvitation(
                                                        notification.metadata!.invitationId!,
                                                        notification.metadata!.teamId!
                                                    )}
                                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                >
                                                    <Check size={16} /> Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRejectInvitation(notification.metadata!.invitationId!)}
                                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                >
                                                    <X size={16} /> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {!notification.read && (
                                            <button
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check size={18} className="text-gray-400" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(notification.id)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
