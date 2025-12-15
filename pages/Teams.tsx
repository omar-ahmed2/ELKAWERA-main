import React, { useState, useEffect } from 'react';
import { Team, Player } from '../types';
import { getAllTeams, saveTeam, deleteTeam, getPlayersByTeamId, removePlayerFromTeam, trackScoutActivity } from '../utils/db';
import { PlusCircle, Trash2, Users, Shield, Upload, Edit3, ArrowLeft, Save, X, UserPlus, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { InvitePlayerModal } from '../components/InvitePlayerModal';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { showToast } from '../components/Toast';

export const Teams: React.FC = () => {
  const { user } = useAuth();
  const { t, dir } = useSettings();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [squad, setSquad] = useState<Player[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removePlayerId, setRemovePlayerId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Team>>({
    name: '',
    shortName: '',
    color: '#00ff9d',
    logoUrl: undefined,
  });

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadSquad(selectedTeam.id);
      setFormData(selectedTeam); // Pre-fill form for editing
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedTeam && user?.role === 'scout') {
      trackScoutActivity(user.id, user.name, 'view_team', selectedTeam.id, selectedTeam.name, 'team').catch(console.error);
    }
  }, [selectedTeam, user]);

  const loadTeams = () => {
    getAllTeams().then(setTeams);
  };

  const loadSquad = (teamId: string) => {
    getPlayersByTeamId(teamId).then(setSquad);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.shortName) return;

    const teamToSave: Team = {
      id: selectedTeam ? selectedTeam.id : uuidv4(),
      name: formData.name!,
      shortName: formData.shortName!.substring(0, 3).toUpperCase(),
      color: formData.color || '#00ff9d',
      logoUrl: formData.logoUrl || undefined,
      captainId: selectedTeam ? selectedTeam.captainId : (user?.id || ''),
      captainName: selectedTeam ? selectedTeam.captainName : (user?.name || ''),
      experiencePoints: selectedTeam ? selectedTeam.experiencePoints : 0,
      ranking: selectedTeam ? selectedTeam.ranking : 0,
      wins: selectedTeam ? selectedTeam.wins : 0,
      draws: selectedTeam ? selectedTeam.draws : 0,
      losses: selectedTeam ? selectedTeam.losses : 0,
      totalMatches: selectedTeam ? selectedTeam.totalMatches : 0,
      createdAt: selectedTeam ? selectedTeam.createdAt : Date.now(),
    };

    await saveTeam(teamToSave);

    // Show success toast
    showToast(
      isEditing ? 'Team updated successfully!' : 'Team created successfully!',
      'success'
    );

    // Reset states
    setFormData({ name: '', shortName: '', color: '#00ff9d', logoUrl: undefined });
    setIsCreating(false);
    setIsEditing(false);

    if (selectedTeam) {
      setSelectedTeam(teamToSave); // Update current view
    }

    loadTeams();
  };

  const confirmDelete = async () => {
    if (deleteTeamId) {
      await deleteTeam(deleteTeamId);
      if (selectedTeam?.id === deleteTeamId) setSelectedTeam(null);
      setDeleteTeamId(null);
      loadTeams();
    }
  };

  const confirmRemovePlayer = async () => {
    if (removePlayerId) {
      await removePlayerFromTeam(removePlayerId);
      setRemovePlayerId(null);
      if (selectedTeam) {
        loadSquad(selectedTeam.id);
      }
      loadTeams();
      showToast('Player removed from team', 'success');
    }
  };

  const startCreating = () => {
    setSelectedTeam(null);
    setFormData({ name: '', shortName: '', color: '#00ff9d', logoUrl: undefined });
    setIsCreating(true);
  };

  const handleInviteSent = () => {
    // Reload squad to reflect any changes
    if (selectedTeam) {
      loadSquad(selectedTeam.id);
    }
  };

  // Separate teams for captain AND player view
  // Both captains and players can own teams (captainId = user.id)
  const yourTeams = (user?.role === 'captain' || user?.role === 'player')
    ? teams.filter(t => t.captainId === user.id)
    : [];
  const otherTeams = (user?.role === 'captain' || user?.role === 'player')
    ? teams.filter(t => t.captainId !== user.id)
    : teams;

  // Check if player already has a team (limit to 1 for players)
  const playerHasTeam = user?.role === 'player' && yourTeams.length > 0;
  const canCreateTeam = user?.role === 'captain' || (user?.role === 'player' && !playerHasTeam);

  // --- DETAIL VIEW ---
  if (selectedTeam && !isEditing) {
    const avgRating = squad.length > 0 ? Math.round(squad.reduce((acc, p) => acc + p.overallScore, 0) / squad.length) : 0;
    // Allow both captains and players to manage their own teams
    const isOwnTeam = user?.role === 'admin' || ((user?.role === 'captain' || user?.role === 'player') && selectedTeam.captainId === user?.id);
    const canScheduleMatch = squad.length >= 3 && squad.length <= 7;

    return (
      <div className="max-w-6xl mx-auto animate-fade-in-up" dir={dir}>
        <ConfirmationDialog
          isOpen={!!removePlayerId}
          onClose={() => setRemovePlayerId(null)}
          onConfirm={confirmRemovePlayer}
          title={t('teams.remove_player_confirm')}
          message={t('teams.remove_player_msg')}
        />

        <ConfirmationDialog
          isOpen={!!deleteTeamId}
          onClose={() => setDeleteTeamId(null)}
          onConfirm={confirmDelete}
          title={t('teams.delete_confirm_title')}
          message={t('teams.delete_confirm_msg').replace('{name}', selectedTeam.name)}
        />

        <InvitePlayerModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          captainId={selectedTeam.captainId}
          captainName={selectedTeam.captainName}
          currentPlayerCount={squad.length}
          onInviteSent={handleInviteSent}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setSelectedTeam(null)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={20} className={dir === 'rtl' ? 'rotate-180' : ''} /> {t('teams.details.back')}
          </button>
          <div className="flex gap-2">
            {isOwnTeam && (
              <>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-elkawera-accent/20 text-elkawera-accent rounded hover:bg-elkawera-accent/30 transition-colors"
                >
                  <UserPlus size={16} /> {t('teams.details.invite')}
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-secondary)]/80 transition-colors"
                >
                  <Edit3 size={16} /> {t('teams.details.edit')}
                </button>
                <button
                  onClick={() => setDeleteTeamId(selectedTeam.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={16} /> {t('teams.details.delete')}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Player Count Warning */}
        {isOwnTeam && !canScheduleMatch && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex items-start gap-3 ${squad.length < 3
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
            <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold mb-1">
                {squad.length < 5 ? t('teams.min_players') : t('teams.max_players')}
              </div>
              <div className="text-sm opacity-90">
                {squad.length < 5
                  ? `${t('teams.min_players_msg')} (${squad.length}/5)`
                  : `${t('teams.max_players_msg')} (${squad.length}/7)`}
              </div>
            </div>
          </div>
        )}

        {/* Team Banner */}
        <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl overflow-hidden p-8 mb-8">
          <div className="absolute inset-0 opacity-30 bg-mesh mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div
              className="w-32 h-32 rounded-full bg-white shadow-2xl flex items-center justify-center border-4 border-white/20"
              style={{ borderColor: selectedTeam.color }}
            >
              {selectedTeam.logoUrl ? (
                <img src={selectedTeam.logoUrl} className="w-full h-full object-cover rounded-full" alt={selectedTeam.name} />
              ) : (
                <span className="text-3xl font-bold" style={{ color: selectedTeam.color }}>{selectedTeam.shortName}</span>
              )}
            </div>
            <div className="text-center md:text-left rtl:md:text-right">
              <h1 className="text-5xl font-display font-bold uppercase drop-shadow-lg text-[var(--text-primary)]">{selectedTeam.name}</h1>
              <div className="flex items-center justify-center md:justify-start rtl:md:justify-start gap-4 mt-2 text-[var(--text-secondary)]">
                <span className="px-3 py-1 bg-black/40 rounded text-sm font-bold tracking-widest">{selectedTeam.shortName}</span>
                <span className="flex items-center gap-1 text-sm"><Users size={14} /> {squad.length}</span>
                <span className="text-sm">{t('teams.details.captain')}: {selectedTeam.captainName}</span>
              </div>
            </div>
            <div className="md:ml-auto rtl:md:mr-auto rtl:md:ml-0 flex gap-6 text-center">
              <div>
                <div className="text-4xl font-display font-bold text-elkawera-accent">{avgRating}</div>
                <div className="text-xs uppercase tracking-widest opacity-60 text-[var(--text-secondary)]">{t('teams.details.avg_rating')}</div>
              </div>
              <div className="w-px bg-[var(--border-color)]"></div>
              <div>
                <div className={`text-4xl font-display font-bold ${squad.length < 3 ? 'text-red-400' : squad.length > 7 ? 'text-yellow-400' : 'text-[var(--text-primary)]'
                  }`}>{squad.length}</div>
                <div className="text-xs uppercase tracking-widest opacity-60 text-[var(--text-secondary)]">{t('teams.details.squad_size')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Squad List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-display font-bold uppercase text-[var(--text-primary)]">{t('teams.details.squad_list')}</h2>
            {isOwnTeam && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-sm text-elkawera-accent hover:underline flex items-center gap-1"
              >
                <UserPlus size={16} /> {t('teams.details.invite')}
              </button>
            )}
          </div>

          {squad.length === 0 ? (
            <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--border-color)]">
              <p className="text-[var(--text-secondary)]">{t('teams.details.no_players')}</p>
              {isOwnTeam && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="text-elkawera-accent hover:underline mt-2 inline-block"
                >
                  {t('teams.details.invite_link')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-6 py-3 bg-[var(--bg-secondary)] rounded-lg text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wider border border-[var(--border-color)]">
                <div className="col-span-1 border-r border-transparent rtl:border-transparent">{t('stats.overall')}</div>
                <div className="col-span-5 md:col-span-4 rtl:pr-4">{t('teams.table.player')}</div>
                <div className="col-span-2">{t('teams.table.pos')}</div>
                <div className="col-span-2 hidden md:block">{t('teams.table.tier')}</div>
                <div className="col-span-2 hidden md:block">{t('teams.table.age')}</div>
                <div className="col-span-4 md:col-span-1 text-right rtl:text-left">{t('teams.table.action')}</div>
              </div>

              {squad.map(player => (
                <div key={player.id} className="grid grid-cols-12 items-center px-6 py-4 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-lg hover:border-elkawera-accent/50 transition-colors group">
                  <div className="col-span-1 font-display font-bold text-xl text-elkawera-accent">{player.overallScore}</div>
                  <div className="col-span-5 md:col-span-4 flex items-center gap-3 rtl:pr-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                      {player.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" alt={player.name} /> : <Users size={16} className="m-2 text-gray-500" />}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{player.name}</div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] md:hidden">
                        {player.country} • {player.position}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 font-mono text-sm text-[var(--text-secondary)]">{player.position}</div>
                  <div className="col-span-2 hidden md:block">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${player.cardType === 'Platinum' ? 'bg-cyan-900/50 text-cyan-200' :
                      player.cardType === 'Gold' ? 'bg-yellow-900/50 text-yellow-200' :
                        'bg-gray-700/50 text-gray-300'
                      }`}>
                      {player.cardType}
                    </span>
                  </div>
                  <div className="col-span-2 hidden md:block text-sm text-[var(--text-secondary)]">{player.age}</div>
                  <div className="col-span-4 md:col-span-1 text-right rtl:text-left flex items-center justify-end rtl:justify-start gap-2">
                    {user?.role === 'captain' && selectedTeam?.captainId === user.id && (
                      <button
                        onClick={() => setRemovePlayerId(player.id)}
                        className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title={t('teams.remove_player_confirm')}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <Link to={`/create?id=${player.id}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2">
                      <Edit3 size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN VIEW (Create / Edit Form or Grid) ---
  return (
    <div className="max-w-6xl mx-auto space-y-8" dir={dir}>
      {!isCreating && !isEditing && (
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase text-[var(--text-primary)]">{t('teams.title')}</h1>
            <p className="text-[var(--text-secondary)]">{t('teams.subtitle')}</p>
          </div>
          {canCreateTeam && (
            <button
              onClick={startCreating}
              className="flex items-center gap-2 px-6 py-3 bg-elkawera-accent text-black font-bold rounded-full hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] transition-colors shadow-lg shadow-elkawera-accent/20"
            >
              <PlusCircle size={20} /> {t('teams.create_btn')}
            </button>
          )}
          {playerHasTeam && (
            <div className="text-sm text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-4 py-2 rounded-lg border border-[var(--border-color)]">
              <span className="text-yellow-400">⚠️</span> {t('teams.player_max_team_warning')}
            </div>
          )}
        </div>
      )}

      {(isCreating || isEditing) && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-2xl animate-fade-in-down shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold uppercase text-[var(--text-primary)]">{isEditing ? t('teams.edit_title') : t('teams.create_title')}</h2>
            <button
              onClick={() => { setIsCreating(false); setIsEditing(false); }}
              className="p-2 hover:bg-[var(--bg-primary)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSave} className="grid md:grid-cols-4 gap-8 items-start">
            <div className="md:col-span-3 space-y-6">
              <div>
                <label className="block text-xs uppercase text-[var(--text-secondary)] mb-2">{t('teams.form.name')}</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4 focus:border-elkawera-accent focus:outline-none text-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                  placeholder="e.g. Manchester City"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase text-[var(--text-secondary)] mb-2">{t('teams.form.short_name')}</label>
                  <input
                    required
                    maxLength={3}
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4 focus:border-elkawera-accent focus:outline-none uppercase font-mono tracking-widest text-[var(--text-primary)]"
                    placeholder="MCI"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[var(--text-secondary)] mb-2">{t('teams.form.color')}</label>
                  <div className="flex items-center gap-2 h-[58px]">
                    <div className="relative w-full h-full">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        className="w-full h-full rounded-lg border border-[var(--border-color)] flex items-center justify-center font-mono text-sm font-bold text-shadow text-[var(--text-primary)]"
                        style={{ backgroundColor: formData.color }}
                      >
                        {formData.color}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs uppercase text-[var(--text-secondary)] mb-2">{t('teams.form.logo')}</label>
              <label className="cursor-pointer flex flex-col items-center justify-center bg-[var(--bg-primary)]/50 border border-[var(--border-color)] hover:border-elkawera-accent border-dashed rounded-xl h-[200px] w-full transition-all group overflow-hidden">
                {formData.logoUrl ? (
                  <div className="relative w-full h-full p-4">
                    <img src={formData.logoUrl} alt="Logo Preview" className="h-full w-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold uppercase">{t('teams.form.change')}</div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Upload size={32} className="mx-auto mb-3 text-[var(--text-secondary)] group-hover:text-elkawera-accent transition-colors" />
                    <span className="text-xs text-[var(--text-secondary)]">{t('teams.form.upload_text')}</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>

            <div className="md:col-span-4 border-t border-[var(--border-color)] pt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setIsEditing(false); }}
                className="px-6 py-3 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors font-bold"
              >
                {t('teams.form.cancel')}
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-elkawera-accent text-black font-bold rounded-lg hover:bg-[var(--text-primary)] hover:text-white transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,157,0.2)]"
              >
                <Save size={18} /> {isEditing ? t('teams.form.update') : t('teams.form.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Your Teams Section - For Captains AND Players */}
      {(user?.role === 'captain' || user?.role === 'player') && yourTeams.length > 0 && !isCreating && !isEditing && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="text-elkawera-accent" size={24} />
            <h2 className="text-2xl font-display font-bold uppercase text-[var(--text-primary)]">{t('teams.your_teams')}</h2>
            {user?.role === 'player' && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
                {t('teams.player_max_team_warning')}
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {yourTeams.map(team => (
              <TeamCard key={team.id} team={team} onClick={() => setSelectedTeam(team)} isOwn={true} t={t} />
            ))}
          </div>
        </div>
      )}

      {/* Other Teams Section */}
      {!isCreating && !isEditing && (
        <div className="space-y-4">
          {(user?.role === 'captain' || user?.role === 'player') && (
            <div className="flex items-center gap-3">
              <Users className="text-[var(--text-secondary)]" size={24} />
              <h2 className="text-2xl font-display font-bold uppercase text-[var(--text-primary)]">{t('teams.other_teams')}</h2>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherTeams.length === 0 && yourTeams.length === 0 && (
              <div className="col-span-full text-center py-24 text-[var(--text-secondary)] border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-secondary)]">
                <Shield size={64} className="mx-auto mb-6 opacity-30" />
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('teams.no_teams')}</h3>
                <p className="mb-6">
                  {user?.role === 'player'
                    ? t('teams.player_create_msg')
                    : t('teams.create_first_team')}
                </p>
                {canCreateTeam && (
                  <button onClick={startCreating} className="text-elkawera-accent hover:underline font-bold">{t('teams.link_create')}</button>
                )}
              </div>
            )}

            {otherTeams.map(team => (
              <TeamCard key={team.id} team={team} onClick={() => setSelectedTeam(team)} isOwn={false} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Team Card Component - Updated to accept t prop
const TeamCard: React.FC<{ team: Team; onClick: () => void; isOwn: boolean; t: (key: string) => string }> = ({ team, onClick, isOwn, t }) => {
  return (
    <div
      onClick={onClick}
      className={`relative group bg-[var(--bg-secondary)] border rounded-2xl overflow-hidden hover:-translate-y-1 transition-all cursor-pointer shadow-lg ${isOwn ? 'border-elkawera-accent/50 hover:border-elkawera-accent' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]/30'
        }`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-black shadow-lg overflow-hidden bg-white border-4 border-white/10"
            style={{ borderColor: team.color }}
          >
            {team.logoUrl ? (
              <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
            ) : (
              <span style={{ color: team.color }}>{team.shortName}</span>
            )}
          </div>
          <div className="px-3 py-1 bg-black/50 rounded text-xs font-mono text-gray-400 group-hover:text-white transition-colors">
            {t('teams.card.details')} &rarr;
          </div>
        </div>

        <h3 className={`text-2xl font-display font-bold uppercase mb-1 truncate transition-colors ${isOwn ? 'text-elkawera-accent' : 'text-[var(--text-primary)] group-hover:text-elkawera-accent'
          }`}>{team.name}</h3>
        <div className="text-[var(--text-secondary)] text-sm flex items-center gap-2">
          <span style={{ color: team.color }}>●</span> {team.shortName}
        </div>
      </div>

      {/* Decoration */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60 pointer-events-none" />
      <div
        className={`absolute bottom-0 left-0 w-full transition-all ${isOwn ? 'h-2' : 'h-1.5 group-hover:h-2'
          }`}
        style={{ backgroundColor: team.color }}
      />
    </div>
  );
};
