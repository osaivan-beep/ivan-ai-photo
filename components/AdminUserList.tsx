import React, { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { getAllUsers, updateCreditsByUid, adminCreateUser, sendPasswordReset } from '../services/firebaseService';
import type { UserProfile, TFunction } from '../types';
import { RefreshIcon, SearchIcon, SparklesIcon, PlusIcon, CloseIcon, KeyIcon } from './Icons';

interface AdminUserListProps {
    t: TFunction;
    onCreditsUpdated: () => void;
}

interface BillingStats {
    totalCredits: number;
    count: number;
    actions: Record<string, number>;
}

export const AdminUserList: React.FC<AdminUserListProps> = ({ t, onCreditsUpdated }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingUid, setProcessingUid] = useState<string | null>(null);
    
    // Billing Stats State
    const [stats, setStats] = useState<BillingStats>({ totalCredits: 0, count: 0, actions: {} });
    const [statsLoading, setStatsLoading] = useState(true);

    // Create User Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setStatsLoading(true);
        try {
            // 1. Load User List
            const allUsers = await getAllUsers();
            allUsers.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
            setUsers(allUsers);

            // 2. Load Billing Stats (Today)
            const db = getFirestore();
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            
            const q = query(
                collection(db, "usage_logs"), 
                where("timestamp", ">=", Timestamp.fromDate(startOfDay))
            );
            
            const querySnapshot = await getDocs(q);
            let total = 0;
            const actions: Record<string, number> = {};
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                total += (data.cost || 0);
                const act = data.action || 'other';
                actions[act] = (actions[act] || 0) + 1;
            });
            
            setStats({
                totalCredits: total,
                count: querySnapshot.size,
                actions: actions
            });

        } catch (e) {
            console.error("Failed to load admin data:", e);
        } finally {
            setLoading(false);
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdateCredits = async (uid: string, amount: number) => {
        setProcessingUid(uid);
        try {
            await updateCreditsByUid(uid, amount);
            // 重新載入資料以獲取精確的截斷後數值
            await loadData();
            onCreditsUpdated();
        } catch (e) {
            console.error("Failed to update credits:", e);
        } finally {
            setProcessingUid(null);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await adminCreateUser(newEmail, newPassword, newName);
            alert(t('adminCreateUserSuccess' as any));
            setIsCreateModalOpen(false);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handlePasswordReset = async (email: string) => {
        if (!confirm(`Send password reset email to ${email}?`)) return;
        try {
            await sendPasswordReset(email);
            alert(`Email sent.`);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const filteredUsers = users.filter(u => 
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* 今日帳單統計卡片 - 移除中間欄位並調整為兩欄佈局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
                    <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">{t('totalCreditsUsed' as any)}</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">{statsLoading ? '...' : stats.totalCredits}</span>
                        <span className="text-indigo-400 font-bold">PTS</span>
                    </div>
                    <p className="text-gray-500 text-[10px] mt-2 italic">計算當日 UTC 00:00 至今之扣點總額</p>
                </div>

                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-xl">
                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">{t('usageByAction' as any)}</h4>
                    <div className="space-y-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {Object.entries(stats.actions).length === 0 && !statsLoading && <div className="text-gray-600 text-xs italic">今日尚無操作紀錄</div>}
                        {Object.entries(stats.actions).map(([act, count]) => (
                            <div key={act} className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 font-mono">{act}</span>
                                <span className="bg-gray-800 text-gray-200 px-2 py-0.5 rounded-full font-bold">{count} 次</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-yellow-400" />
                        {t('userListTitle')} (上限 1200)
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
                            title={t('adminCreateUserButton' as any)}
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('adminCreateUserButton' as any)}</span>
                        </button>
                        <button 
                            onClick={loadData} 
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
                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Loading users...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">{t('noUsersFound')}</td></tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.uid} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white truncate max-w-[250px]">
                                            {user.email} 
                                            {user.displayName && <span className="ml-2 text-gray-400 text-xs">({user.displayName})</span>}
                                            {user.isAdmin && <span className="ml-2 text-xs bg-purple-900 text-purple-200 px-1.5 py-0.5 rounded">Admin</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-yellow-400">
                                            {user.credits}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {user.email && (
                                                    <button onClick={() => handlePasswordReset(user.email!)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs border border-gray-600 mr-2 flex items-center gap-1"><KeyIcon className="w-3 h-3" /> Reset</button>
                                                )}
                                                <button disabled={!!processingUid} onClick={() => handleUpdateCredits(user.uid, -10)} className="bg-red-900/40 hover:bg-red-900/80 text-red-200 px-2 py-1 rounded text-xs border border-red-800 disabled:opacity-30">-10</button>
                                                <button disabled={!!processingUid || user.credits >= 1200} onClick={() => handleUpdateCredits(user.uid, 10)} className="bg-green-900/40 hover:bg-green-900/80 text-green-200 px-2 py-1 rounded text-xs border border-green-800 disabled:opacity-30">+10</button>
                                                <button disabled={!!processingUid || user.credits >= 1200} onClick={() => handleUpdateCredits(user.uid, 50)} className="bg-blue-900/40 hover:bg-blue-900/80 text-blue-200 px-2 py-1 rounded text-xs border border-blue-200 disabled:opacity-30">+50</button>
                                                <button disabled={!!processingUid || user.credits >= 1200} onClick={() => handleUpdateCredits(user.uid, 100)} className="bg-purple-900/40 hover:bg-purple-900/80 text-purple-200 px-2 py-1 rounded text-xs border border-purple-800 disabled:opacity-30">+100</button>
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
                                <h3 className="text-xl font-bold text-white">{t('adminCreateUserTitle' as any)}</h3>
                                <button onClick={() => setIsCreateModalOpen(false)}><CloseIcon className="w-6 h-6 text-gray-400 hover:text-white" /></button>
                            </div>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Email</label>
                                    <input type="email" required className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Password</label>
                                    <input type="password" required minLength={6} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Name</label>
                                    <input type="text" className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none" value={newName} onChange={e => setNewName(e.target.value)} />
                                </div>
                                <button type="submit" disabled={isCreating} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg disabled:opacity-50 transition-colors">{isCreating ? 'Creating...' : t('createUserButton' as any)}</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};