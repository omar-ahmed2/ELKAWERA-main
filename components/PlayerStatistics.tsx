import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    LineChart, Line, CartesianGrid, AreaChart, Area,
    ResponsiveContainer
} from 'recharts';
import { Match, Player, Team } from '../types';
import { Trophy, TrendingUp, Activity, Target, Shield, Calendar, Flame, Zap } from 'lucide-react';

interface PlayerStatisticsProps {
    player: Player;
    matches: Match[]; // All matches to filter from or pre-filtered matches
    teams: Team[];
}

export const PlayerStatistics: React.FC<PlayerStatisticsProps> = ({ player, matches, teams }) => {

    // 1. Filter matches played by this player
    const playerMatches = useMemo(() => {
        return matches.filter(m =>
            m.status === 'finished' &&
            (m.homePlayerIds.includes(player.id) || m.awayPlayerIds.includes(player.id))
        ).sort((a, b) => (a.finishedAt || 0) - (b.finishedAt || 0));
    }, [matches, player.id]);

    // 2. Calculate Stats
    const stats = useMemo(() => {
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let goals = 0;
        let assists = 0;
        let cleanSheets = 0;
        let defensiveContribs = 0;
        let saves = 0;
        let penaltySaves = 0;

        const matchHistory = playerMatches.map(match => {
            const isHome = match.homePlayerIds.includes(player.id);
            const teamId = isHome ? match.homeTeamId : match.awayTeamId;
            const opponentId = isHome ? match.awayTeamId : match.homeTeamId;

            const teamScore = isHome ? match.homeScore : match.awayScore;
            const opponentScore = isHome ? match.awayScore : match.homeScore;

            // Result
            let result: 'W' | 'D' | 'L' = 'D';
            if (teamScore > opponentScore) { wins++; result = 'W'; }
            else if (teamScore < opponentScore) { losses++; result = 'L'; }
            else { draws++; }

            // Player specific events in this match
            const playerEvents = match.events.filter(e => e.playerId === player.id);
            const mGoals = playerEvents.filter(e => e.type === 'goal').length;
            const mAssists = playerEvents.filter(e => e.type === 'assist').length;
            const mDef = playerEvents.filter(e => e.type === 'defensive_contribution').length;
            const mCS = playerEvents.some(e => e.type === 'clean_sheet');
            const mSaves = playerEvents.filter(e => e.type === 'save').length;
            const mPSaves = playerEvents.filter(e => e.type === 'penalty_save').length;

            goals += mGoals;
            assists += mAssists;
            defensiveContribs += mDef;
            if (mCS) cleanSheets++;
            saves += mSaves;
            penaltySaves += mPSaves;

            return {
                date: new Date(match.finishedAt || 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                goals: mGoals,
                assists: mAssists,
                rating: 6 + (mGoals * 1) + (mAssists * 0.5) + (mDef * 0.2) + (mCS ? 1 : 0), // Base rating calc
                result,
                opponent: teams.find(t => t.id === opponentId)?.shortName || 'OPP'
            };
        });

        return { wins, draws, losses, totalMatches: playerMatches.length, matchHistory, goals, assists, cleanSheets, defensiveContribs, saves, penaltySaves };
    }, [playerMatches, player.id, teams]);



    // 4. Form Guide (Last 5)
    const formGuide = stats.matchHistory.slice(-5).map(m => m.result);

    // 5. Activity Heatmap Data (Dummy visual for now based on recent matches)
    // Real implementation would map dates to a grid. We'll show a "Frequency" gauge instead for simplicity/impact.
    const matchesPerWeek = playerMatches.length > 0
        ? (playerMatches.length / Math.max(1, (Date.now() - player.createdAt) / (1000 * 60 * 60 * 24 * 7))).toFixed(1)
        : 0;

    return (
        <div className="space-y-6">

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <div className="text-gray-400 text-xs font-bold uppercase">Matches</div>
                        <div className="text-2xl text-white font-display font-bold">{stats.totalMatches}</div>
                    </div>
                    <Activity className="text-blue-400" size={24} />
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <div className="text-gray-400 text-xs font-bold uppercase">Win Rate</div>
                        <div className="text-2xl text-white font-display font-bold">
                            {stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0}%
                        </div>
                    </div>
                    <Trophy className="text-yellow-400" size={24} />
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <div className="text-gray-400 text-xs font-bold uppercase">Form</div>
                        <div className="flex gap-1 mt-1">
                            {formGuide.length === 0 ? <span className="text-gray-600">-</span> :
                                formGuide.map((res, i) => (
                                    <span key={i} className={`text-xs font-bold px-1.5 py-0.5 rounded ${res === 'W' ? 'bg-green-500 text-black' :
                                        res === 'D' ? 'bg-gray-500 text-white' : 'bg-red-500 text-white'
                                        }`}>
                                        {res}
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                    <TrendingUp className="text-green-400" size={24} />
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                        <div className="text-gray-400 text-xs font-bold uppercase">Activity</div>
                        <div className="text-2xl text-white font-display font-bold">{matchesPerWeek} <span className="text-xs text-gray-400 font-sans">/week</span></div>
                    </div>
                    <Zap className="text-orange-400" size={24} />
                </div>
            </div>

            {/* Career Totals Row */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Trophy className="text-yellow-400" size={20} />
                    Career Achievements
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    <div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Goals</div>
                        <div className="text-3xl font-display font-black text-white">{stats.goals}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Assists</div>
                        <div className="text-3xl font-display font-black text-white">{stats.assists}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Clean Sheets</div>
                        <div className="text-3xl font-display font-black text-emerald-400">{stats.cleanSheets}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Def. Actions</div>
                        <div className="text-3xl font-display font-black text-blue-400">{stats.defensiveContribs}</div>
                    </div>
                    {player.position === 'GK' && (
                        <>
                            <div>
                                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Regular Saves</div>
                                <div className="text-3xl font-display font-black text-amber-400">{stats.saves}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Penalty Saves</div>
                                <div className="text-3xl font-display font-black text-red-500">{stats.penaltySaves}</div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">


                {/* Match History Chart */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity size={100} />
                    </div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Calendar className="text-blue-400" size={20} />
                        Match Contributions
                    </h3>
                    <div className="h-[300px] w-full">
                        {stats.matchHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.matchHistory.slice(-10)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff10' }}
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="goals" name="Goals" fill="#4ade80" radius={[4, 4, 0, 0]} stackId="a" />
                                    <Bar dataKey="assists" name="Assists" fill="#60a5fa" radius={[4, 4, 0, 0]} stackId="a" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2">
                                <Activity size={32} />
                                <p>No match history available yet</p>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Impact Area Chart */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Shield className="text-purple-400" size={20} />
                    Performance Rating History (Rough Estimate)
                </h3>
                <div className="h-[200px] w-full">
                    {stats.matchHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.matchHistory}>
                                <defs>
                                    <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 10]} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="rating" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRating)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            Not enough data for performance analysis
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
