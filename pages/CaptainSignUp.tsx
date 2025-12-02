import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Upload } from 'lucide-react';
import { saveTeam, saveCaptainStats } from '../utils/db';
import { Team, CaptainStats } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const CaptainSignUp: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [age, setAge] = useState<number>(18);
    const [teamName, setTeamName] = useState('');
    const [teamAbbreviation, setTeamAbbreviation] = useState('');
    const [teamColor, setTeamColor] = useState('#00ff9d');
    const [teamLogo, setTeamLogo] = useState<string | null>(null);
    const [error, setError] = useState('');
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('Logo file size must be less than 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setTeamLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (age < 18) {
            setError('Captains must be at least 18 years old');
            return;
        }
        if (teamAbbreviation.length < 2 || teamAbbreviation.length > 4) {
            setError('Team abbreviation must be 2-4 characters');
            return;
        }

        try {
            // Create captain account
            const newUser = await signUp(name, email, password, age, undefined, undefined, undefined, undefined, 'captain');

            // Create team
            const team: Team = {
                id: uuidv4(),
                name: teamName,
                shortName: teamAbbreviation.toUpperCase(),
                color: teamColor,
                logoUrl: teamLogo || undefined,
                captainId: newUser.id,
                captainName: name,
                experiencePoints: 0,
                ranking: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                totalMatches: 0,
                createdAt: Date.now()
            };
            await saveTeam(team);

            // Initialize captain stats
            const captainStats: CaptainStats = {
                userId: newUser.id,
                matchesManaged: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                playersRecruited: 0,
                verifiedMatches: 0,
                rank: 'Bronze Captain',
                rankPoints: 0,
                createdAt: Date.now()
            };
            await saveCaptainStats(captainStats);

            navigate('/captain/dashboard');
        } catch (err) {
            setError(typeof err === 'string' ? err : 'Registration failed');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Shield size={40} className="text-elkawera-accent" />
                        <h1 className="text-3xl font-display font-bold text-white uppercase tracking-tight">
                            Captain Sign-Up
                        </h1>
                    </div>
                    <p className="text-gray-400 mt-2">Create your team and start your journey as a captain</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Captain Information */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-elkawera-accent uppercase tracking-wide">Captain Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-elkawera-accent focus:outline-none transition-colors"
                                    placeholder="e.g. John Smith"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">Age</label>
                                <input
                                    type="number"
                                    min="18"
                                    max="70"
                                    required
                                    value={age}
                                    onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                                    className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-elkawera-accent focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-elkawera-accent focus:outline-none transition-colors"
                                placeholder="captain@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-elkawera-accent focus:outline-none transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {/* Team Information */}
                    <div className="space-y-4 pt-6 border-t border-white/10">
                        <h2 className="text-xl font-bold text-elkawera-accent uppercase tracking-wide">Team Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">Team Name</label>
                                <input
                                    type="text"
                                    required
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-elkawera-accent focus:outline-none transition-colors"
                                    placeholder="e.g. Thunder FC"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">
                                    Abbreviation (2-4 chars)
                                </label>
                                <input
                                    type="text"
                                    required
                                    minLength={2}
                                    maxLength={4}
                                    value={teamAbbreviation}
                                    onChange={(e) => setTeamAbbreviation(e.target.value.toUpperCase())}
                                    className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white focus:border-elkawera-accent focus:outline-none transition-colors uppercase"
                                    placeholder="e.g. TFC"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">Team Color</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="color"
                                    value={teamColor}
                                    onChange={(e) => setTeamColor(e.target.value)}
                                    className="w-20 h-12 rounded-lg cursor-pointer bg-black/50 border border-white/20"
                                />
                                <span className="text-gray-300">{teamColor}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs uppercase text-gray-400 mb-2 font-bold tracking-wider">
                                Team Logo (Optional, max 2MB)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 px-4 py-3 bg-black/50 border border-white/20 rounded-xl cursor-pointer hover:border-elkawera-accent transition-colors">
                                    <Upload size={18} className="text-gray-400" />
                                    <span className="text-sm text-gray-300">Upload Logo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                </label>
                                {teamLogo && (
                                    <img src={teamLogo} alt="Team Logo" className="w-12 h-12 rounded-lg object-cover border border-white/20" />
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-elkawera-accent text-black font-bold uppercase rounded-xl hover:bg-white transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(0,255,157,0.3)] flex items-center justify-center gap-2"
                    >
                        <Shield size={20} /> Create Captain Account & Team
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    Already have an account? <Link to="/login" className="text-elkawera-accent hover:underline font-bold">Sign In</Link>
                </div>
                <div className="mt-4 text-center text-sm text-gray-400">
                    Want to join as a player? <Link to="/signup" className="text-elkawera-accent hover:underline font-bold">Player Sign-Up</Link>
                </div>
            </div>
        </div>
    );
};
