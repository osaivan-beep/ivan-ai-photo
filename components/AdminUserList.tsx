
import React, { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { getAllUsers, updateCreditsByUid, adminCreateUser, sendPasswordReset, deleteUserCompletely } from '../services/firebaseService';
import type { UserProfile, TFunction } from '../types';
import { RefreshIcon, SearchIcon, SparklesIcon, PlusIcon, CloseIcon, KeyIcon, TrashIcon } from './Icons';

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
    
    const [stats, setStats] = useState<BillingStats>({ totalCredits: 0, count: 0, actions: {} });
    const [statsLoading, setStatsLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRemark, setNewRemark] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setStatsLoading(true);
        try {
            const allUsers = await getAllUsers();
            allUsers.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
            setUsers(allUsers);

            const db = getFirestore();
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const q = query(collection(db, "usage_logs"), where("timestamp", ">=", Timestamp.fromDate(startOfDay)));
            const querySnapshot = await getDocs(q);
            let total = 0;
            const actions: Record<string, number> = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                total += (data.cost || 0);
                const act = data.action || 'other';
                actions[act] = (actions[act] || 0) + 1;
            });
            setStats({ totalCredits: total, count: querySnapshot.size, actions: actions });
        } catch (e) { console.error(e); } finally {
            setLoading(false);
            setStatsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleUpdateCredits = async (uid: string, amount: number) => {
        setProcessingUid(uid);
        try {
            await updateCreditsByUid(uid, amount);
            await loadData();
            onCreditsUpdated();
        } finally { setProcessingUid(null); }
    };

    const handleDeleteUser = async (uid: string, email: string) => {
        if (!confirm(`警告：確定要徹底刪除用戶 ${email} 嗎？\n這將同時刪除該帳號的登入權限與點數資料，且無法恢復。`)) return;
        setProcessingUid(uid);
        try {
            await deleteUserCompletely(uid);
            await loadData();
            alert("用戶帳號與資料已同步移除。");
        } catch (e: any) {
            alert("刪除失敗: " + e.message);
        } finally {
            setProcessingUid(null);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await adminCreateUser(newEmail, newPassword, newName, newRemark);
            alert("帳號建立成功，初始點數為 0。");
            setIsCreateModalOpen(false);
            setNewEmail(''); setNewPassword(''); setNewName(''); setNewRemark('');
            loadData();
        } catch (error: any) { alert(error.message); } finally { setIsCreating(false); }
    };

    const handlePasswordReset = async (email: string) => {
        if (!confirm(`Send password reset email to ${email}?`)) return;
        try { await sendPasswordReset(email); alert(`Email sent.`); } catch (e: any) { alert(e.message); }
    };

    const filteredUsers = users.filter(u => 
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.remark || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl">
                    <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">TOTALCREDITSUSED</h4>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">{statsLoading ? '...' : stats.totalCredits}</span>
                        <span className="text-indigo-400 font-bold">PTS</span>
                    </div>
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-xl">
                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">USAGEBYACTION</h4>
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
                    <h3 className="text-lg font-bold text-white flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400" /> 用戶列表 (上限 1200)</h3>
                    <div className="flex items-center gap-2">
                        <div className="relative"><SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input type="text" placeholder={t('searchUsers')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 bg-gray-900 border border-gray-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500" />
                        </div>
                        <button onClick={() => setIsCreateModalOpen(true)} className="p-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold flex items-center gap-1 text-xs"><PlusIcon className="w-4 h-4" /><span className="hidden sm:inline">建立用戶</span></button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-700">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-900 text-gray-200 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">Email / 備註</th>
                                <th className="px-4 py-3 text-center">點數</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {loading ? (<tr><td colSpan={3} className="px-4 py-8 text-center">Loading...</td></tr>) : filteredUsers.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-medium text-white truncate max-w-[250px]">
                                        <div className="flex flex-col">
                                            <span>{user.email} {user.isAdmin && <span className="ml-2 text-[10px] bg-purple-900 text-purple-200 px-1.5 py-0.5 rounded">Admin</span>}</span>
                                            {user.remark && <span className="text-[10px] text-gray-500 italic mt-0.5 font-normal"># {user.remark}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-yellow-400">{user.credits}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {!user.isAdmin && (<button onClick={() => handleDeleteUser(user.uid, user.email!)} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white p-1.5 rounded text-xs border border-red-500/50 transition-all mr-2"><TrashIcon className="w-3.5 h-3.5" /></button>)}
                                            <button onClick={() => handlePasswordReset(user.email!)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs border border-gray-600 mr-2 flex items-center gap-1"><KeyIcon className="w-3 h-3" /> Reset</button>
                                            <button disabled={!!processingUid} onClick={() => handleUpdateCredits(user.uid, -10)} className="bg-red-900/40 hover:bg-red-900/80 text-red-200 px-2 py-1 rounded text-xs border border-red-800">-10</button>
                                            <button disabled={!!processingUid} onClick={() => handleUpdateCredits(user.uid, 10)} className="bg-green-900/40 hover:bg-green-900/80 text-green-200 px-2 py-1 rounded text-xs border border-green-800">+10</button>
                                            <button disabled={!!processingUid} onClick={() => handleUpdateCredits(user.uid, 50)} className="bg-blue-900/40 hover:bg-blue-900/80 text-blue-200 px-2 py-1 rounded text-xs border border-blue-200">+50</button>
                                            <button disabled={!!processingUid} onClick={() => handleUpdateCredits(user.uid, 100)} className="bg-purple-900/40 hover:bg-purple-900/80 text-purple-200 px-2 py-1 rounded text-xs border border-purple-800">+100</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                        <div className="bg-gray-800 rounded-xl w-full max-w-sm border border-gray-700 p-6">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white">建立帳號</h3><button onClick={() => setIsCreateModalOpen(false)}><CloseIcon className="w-6 h-6 text-gray-400" /></button></div>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div><label className="block text-gray-400 text-sm mb-1">Email</label><input type="email" required className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
                                <div><label className="block text-gray-400 text-sm mb-1">密碼</label><input type="password" required minLength={6} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
                                <div><label className="block text-gray-400 text-sm mb-1">備註 (例如：VIP, 手機後四碼)</label><input type="text" className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-purple-500 outline-none" value={newRemark} onChange={e => setNewRemark(e.target.value)} /></div>
                                <button type="submit" disabled={isCreating} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">{isCreating ? 'Creating...' : '建立'}</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
