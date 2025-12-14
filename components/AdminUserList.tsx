
import React, { useEffect, useState } from 'react';
import { getAllUsers, updateCreditsByUid, adminCreateUser } from '../services/firebaseService';
import type { UserProfile, TFunction } from '../types';
import { RefreshIcon, SearchIcon, SparklesIcon, PlusIcon, CloseIcon } from './Icons';

interface AdminUserListProps {
    t: TFunction;
    onCreditsUpdated: () => void;
}

export const AdminUserList: React.FC<AdminUserListProps> = ({ t, onCreditsUpdated }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingUid, setProcessingUid] = useState<string | null>(null);
    
    // Create User Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await getAllUsers();
            // Sort by email
            allUsers.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
            setUsers(allUsers);
        } catch (e) {
            console.error("Failed to load users:", e);
            alert("Failed to load user list. Ensure you have admin permissions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleUpdateCredits = async (uid: string, amount: number) => {
        setProcessingUid(uid);
        try {
            await updateCreditsByUid(uid, amount);
            // Optimistic update
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, credits: (u.credits || 0) + amount } : u));
            onCreditsUpdated();
        } catch (e) {
            console.error("Failed to update credits:", e);
            alert("Failed to update credits.");
        } finally {
            setProcessingUid(null);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        setIsCreating(true);
        try {
            await adminCreateUser(newEmail, newPassword);
            alert(t('adminCreateUserSuccess'));
            setIsCreateModalOpen(false);
            setNewEmail('');
            setNewPassword('');
            loadUsers(); // Refresh list
        } catch (error: any) {
            console.error(error);
            alert("Error creating user: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const filteredUsers = users.filter(u => 
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                    {t('userListTitle')}
                </h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder={t('searchUsers')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 bg-gray-900 border border-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold flex items-center gap-1 text-xs" 
                        title={t('adminCreateUserButton')}
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('adminCreateUserButton')}</span>
                    </button>
                    <button 
                        onClick={loadUsers} 
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300" 
                        title={t('refreshList')}
                    >
                        <RefreshIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900 text-gray-200 uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3 text-center">{t('creditsLabel')}</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                    <svg className="animate-spin h-6 w-6 text-purple-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">{t('noUsersFound')}</td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-white truncate max-w-[200px]" title={user.email || ''}>
                                        {user.email} {user.isAdmin && <span className="ml-2 text-xs bg-purple-900 text-purple-200 px-1.5 py-0.5 rounded">Admin</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-yellow-400">
                                        {user.credits}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                disabled={!!processingUid}
                                                onClick={() => handleUpdateCredits(user.uid, -10)}
                                                className="bg-red-900/40 hover:bg-red-900/80 text-red-200 px-2 py-1 rounded text-xs border border-red-800 disabled:opacity-30"
                                            >-10</button>
                                            <button 
                                                disabled={!!processingUid}
                                                onClick={() => handleUpdateCredits(user.uid, -1)}
                                                className="bg-red-900/40 hover:bg-red-900/80 text-red-200 px-2 py-1 rounded text-xs border border-red-800 disabled:opacity-30"
                                            >-1</button>
                                            <span className="w-2"></span>
                                            <button 
                                                disabled={!!processingUid}
                                                onClick={() => handleUpdateCredits(user.uid, 1)}
                                                className="bg-green-900/40 hover:bg-green-900/80 text-green-200 px-2 py-1 rounded text-xs border border-green-800 disabled:opacity-30"
                                            >+1</button>
                                            <button 
                                                disabled={!!processingUid}
                                                onClick={() => handleUpdateCredits(user.uid, 10)}
                                                className="bg-green-900/40 hover:bg-green-900/80 text-green-200 px-2 py-1 rounded text-xs border border-green-800 disabled:opacity-30"
                                            >+10</button>
                                            <button 
                                                disabled={!!processingUid}
                                                onClick={() => handleUpdateCredits(user.uid, 50)}
                                                className="bg-blue-900/40 hover:bg-blue-900/80 text-blue-200 px-2 py-1 rounded text-xs border border-blue-800 disabled:opacity-30"
                                            >+50</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm border border-gray-700 p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">{t('adminCreateUserTitle')}</h3>
                            <button onClick={() => setIsCreateModalOpen(false)}><CloseIcon className="w-6 h-6 text-gray-400 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Email</label>
                                <input 
                                    type="email" required
                                    className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Password</label>
                                <input 
                                    type="password" required minLength={6}
                                    className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isCreating}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                {isCreating ? 'Creating...' : t('createUserButton')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
