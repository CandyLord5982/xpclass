import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useStudentLevels } from '../../hooks/useStudentLevels'
import { supabase } from '../../supabase/client'
import Card from '../ui/Card'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import {
  User,
  Star,
  Trophy,
  Target,
  BookOpen,
  Clock,
  Flame,
  Calendar,
  Mail,
  Edit3,
  Settings,
  Award,
  TrendingUp,
  Activity,
  CheckCircle,
  PlayCircle,
  Crown,
  Zap,
  Shield,
  Gem,
  X
} from 'lucide-react'

const Profile = () => {
  const { user, profile, updateProfile } = useAuth()
  const { 
    currentLevel, 
    nextLevel, 
    levelProgress, 
    currentBadge, 
    nextBadge,
    hasUnlockedPerk,
    isMaxLevel 
  } = useStudentLevels()
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    full_name: ''
  })

  // Stats state
  const [stats, setStats] = useState({
    totalXP: 0,
    exercisesCompleted: 0,
    streakCount: 0,
    totalPracticeTime: 0,
    averageScore: 0,
    levelsCompleted: 0,
    unitsCompleted: 0,
    sessionsCompleted: 0
  })

  // Recent activity state
  const [recentActivity, setRecentActivity] = useState([])

  // Avatar state
  const [availableAvatars, setAvailableAvatars] = useState([])
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('')

  // Badge state
  const [earnedBadges, setEarnedBadges] = useState([])
  const [upcomingBadges, setUpcomingBadges] = useState([])
  const [showBadgeModal, setShowBadgeModal] = useState(false)

  useEffect(() => {
    if (profile) {
      setEditData({
        full_name: profile.full_name || ''
      })
      setSelectedAvatar(profile.avatar_url || '👤')
      fetchUserStats()
      fetchRecentActivity()
      fetchAvailableAvatars()
      processBadges()
    }
  }, [profile])

  const fetchUserStats = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch user progress data
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          *,
          exercises (
            id,
            title,
            exercise_type,
            xp_reward
          )
        `)
        .eq('user_id', user.id)

      if (progressError) throw progressError

      // Calculate stats from progress data
      const completed = progressData?.filter(p => p.status === 'completed') || []
      const totalXP = profile?.xp || 0
      const exercisesCompleted = completed.length
      const averageScore = completed.length > 0
        ? Math.round(completed.reduce((sum, p) => sum + (p.score || 0), 0) / completed.length)
        : 0

      // Fetch additional user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      const newStats = {
        totalXP,
        exercisesCompleted,
        streakCount: userData?.streak_count || 0,
        totalPracticeTime: userData?.total_practice_time || 0,
        averageScore,
        levelsCompleted: 0, // We can calculate this if needed
        unitsCompleted: 0,  // We can calculate this if needed
        sessionsCompleted: 0 // We can calculate this if needed
      }

      setStats(newStats)

      // Process badges after stats are updated
      processBadges()

    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select(`
          *,
          exercises (
            title,
            exercise_type
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setRecentActivity(data || [])
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const fetchAvailableAvatars = async () => {
    try {
      // Fetch ALL avatars, not just unlocked ones
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .eq('is_active', true)
        .order('unlock_xp', { ascending: true })

      if (error) throw error

      setAvailableAvatars(data || [])
    } catch (error) {
      console.error('Error fetching avatars:', error)
      // Fallback to default avatars if function fails
      setAvailableAvatars([
        { id: '1', name: 'Default', image_url: '👤', unlock_xp: 0, description: 'Default avatar', tier: 'default' },
        { id: '2', name: 'Smiley', image_url: '😊', unlock_xp: 0, description: 'Happy face', tier: 'default' },
        { id: '3', name: 'Rookie', image_url: '🌱', unlock_xp: 500, description: 'Rookie learner', tier: 'bronze' },
        { id: '4', name: 'Scholar', image_url: '🎓', unlock_xp: 2000, description: 'Academic scholar', tier: 'silver' },
        { id: '5', name: 'Expert', image_url: '⚡', unlock_xp: 8000, description: 'Expert level', tier: 'gold' }
      ])
    }
  }

  const processBadges = async () => {
    try {
      // Get user's current XP
      const userXP = stats.totalXP || profile?.xp || 0

      // Fetch student levels from the existing admin system
      const { data: studentLevels, error } = await supabase
        .from('student_levels')
        .select('*')
        .eq('is_active', true)
        .order('level_number', { ascending: true })

      if (error) throw error

      const levels = studentLevels || []

      // Convert student levels to badge format and separate earned vs upcoming
      const earned = levels.filter(level => userXP >= level.xp_required)
      const upcoming = levels.filter(level => userXP < level.xp_required)

      setEarnedBadges(earned)
      setUpcomingBadges(upcoming)
    } catch (error) {
      console.error('Error processing badges:', error)
    }
  }

  const handleAvatarSelect = async (avatar) => {
    if (stats.totalXP < avatar.unlock_xp) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: avatar.image_url })
        .eq('id', user.id)

      if (error) throw error

      setSelectedAvatar(avatar.image_url)
      setShowAvatarSelector(false)
    } catch (error) {
      console.error('Error updating avatar:', error)
    }
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing)
    if (!isEditing) {
      setEditData({
        full_name: profile?.full_name || ''
      })
    }
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editData)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const getExerciseTypeIcon = (type) => {
    const icons = {
      multiple_choice: Target,
      flashcard: BookOpen,
      fill_blank: Activity
    }
    return icons[type] || BookOpen
  }

  const getExerciseTypeLabel = (type) => {
    const labels = {
      multiple_choice: 'Multiple Choice',
      flashcard: 'Flashcard',
      fill_blank: 'Fill in the Blank'
    }
    return labels[type] || type
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return 'Vừa xong'
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`
    return `${Math.floor(diffInMinutes / 1440)} ngày trước`
  }

  const formatPracticeTime = (minutes) => {
    if (minutes < 60) return `${minutes} phút`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours} giờ`
  }

  const getTierIcon = (tier) => {
    const icons = {
      bronze: Shield,
      silver: Award,
      gold: Crown,
      platinum: Gem,
      diamond: Zap
    }
    return icons[tier] || Shield
  }

  const getTierColor = (tier) => {
    const colors = {
      bronze: 'text-amber-600',
      silver: 'text-gray-500',
      gold: 'text-yellow-500',
      platinum: 'text-purple-500',
      diamond: 'text-cyan-400'
    }
    return colors[tier] || 'text-gray-500'
  }

  const getTierBgColor = (tier) => {
    const colors = {
      bronze: 'bg-amber-100',
      silver: 'bg-gray-100',
      gold: 'bg-yellow-100',
      platinum: 'bg-purple-100',
      diamond: 'bg-cyan-100'
    }
    return colors[tier] || 'bg-gray-100'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <Card.Content className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer hover:bg-white/30 transition-colors overflow-hidden"
                onClick={() => setShowAvatarSelector(true)}
                title="Click to change avatar"
              >
                {selectedAvatar ? (
                  selectedAvatar.startsWith('http') ? (
                    <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    selectedAvatar
                  )
                ) : (
                  profile?.full_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Tên đầy đủ"
                      value={editData.full_name}
                      onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="px-3 py-1 rounded-lg text-gray-900 text-xl font-bold"
                    />
                    <p className="text-blue-100 flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>{profile?.email}</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-3xl font-bold">
                      {profile?.full_name || 'Người dùng'}
                    </h1>
                    <p className="text-blue-100 flex items-center space-x-2 mt-1">
                      <Mail className="w-4 h-4" />
                      <span>{profile?.email}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              {isEditing ? (
                <div className="space-x-2">
                  <Button onClick={handleSaveProfile} variant="outline" className="text-white border-white">
                    Lưu
                  </Button>
                  <Button onClick={handleEditToggle} variant="ghost" className="text-white">
                    Hủy
                  </Button>
                </div>
              ) : (
                <Button onClick={handleEditToggle} variant="ghost" className="text-white">
                  <Edit3 className="w-4 h-4 mr-2" />
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </div>

          {/* Level and XP Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center space-x-2">
                {currentBadge && (
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${getTierBgColor(currentBadge.tier)}`}>
                    <img
                      src={currentBadge.icon}
                      alt={currentBadge.name}
                      className="w-5 h-5 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'inline'
                      }}
                    />
                    <span className="text-lg hidden">{currentBadge.icon}</span>
                    <span className={`text-sm font-medium ${getTierColor(currentBadge.tier)}`}>
                      {currentBadge.name}
                    </span>
                  </div>
                )}
              </div>
              <span className="font-semibold">{stats.totalXP} XP</span>
            </div>
            
            {!isMaxLevel && nextLevel ? (
              <>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-300"
                    style={{ width: `${levelProgress.progressPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-blue-100 mt-1 text-center">
                  {levelProgress.xpNeeded} XP to unlock {nextBadge?.name}
                </div>
              </>
            ) : (
              <div className="w-full bg-white/20 rounded-full h-3">
                <div className="bg-white h-3 rounded-full w-full" />
              </div>
            )}
            
            {isMaxLevel && (
              <div className="text-xs text-blue-100 mt-1 text-center">
                🎉 You've reached the highest level!
              </div>
            )}
          </div>
        </Card.Content>
      </Card>



      {/* Badge Collection */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Badges ({earnedBadges.length} earned)</span>
            </h3>
            <button
              onClick={() => setShowBadgeModal(true)}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>View All</span>
            </button>
          </div>
        </Card.Header>
        
        <Card.Content>
          {earnedBadges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {earnedBadges.slice(0, 6).map((badge) => (
                <div key={badge.id} className="text-center">
                  <div className={`w-16 h-16 mx-auto mb-2 p-2 rounded-full ${getTierBgColor(badge.badge_tier)}`}>
                    <img
                      src={badge.badge_icon}
                      alt={badge.badge_name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'inline'
                      }}
                    />
                    <span className="text-2xl hidden">{badge.badge_icon}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{badge.badge_name}</div>
                </div>
              ))}
              {earnedBadges.length > 6 && (
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setShowBadgeModal(true)}
                    className="w-16 h-16 mx-auto mb-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <span className="text-sm text-gray-600">+{earnedBadges.length - 6}</span>
                  </button>
                  <div className="text-sm text-gray-600 text-center">More...</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No badges earned yet. Keep learning to unlock your first badge!</p>
              <button
                onClick={() => setShowBadgeModal(true)}
                className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                View All Available Badges
              </button>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <Card.Content className="p-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalXP}</div>
            <div className="text-sm text-gray-600">Total XP</div>
            {currentBadge && (
              <div className="text-xs text-gray-500 mt-1">
                {currentBadge?.name}
              </div>
            )}
          </Card.Content>
        </Card>

        <Card className="text-center">
          <Card.Content className="p-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.exercisesCompleted}</div>
            <div className="text-sm text-gray-600">Bài tập hoàn thành</div>
          </Card.Content>
        </Card>

        <Card className="text-center">
          <Card.Content className="p-4">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.streakCount}</div>
            <div className="text-sm text-gray-600">Chuỗi ngày học</div>
          </Card.Content>
        </Card>

        <Card className="text-center">
          <Card.Content className="p-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.averageScore}%</div>
            <div className="text-sm text-gray-600">Điểm trung bình</div>
          </Card.Content>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <Card.Header>
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Hoạt động gần đây</span>
          </h2>
        </Card.Header>
        <Card.Content>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const IconComponent = getExerciseTypeIcon(activity.exercises?.exercise_type)
                return (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        Hoàn thành: {activity.exercises?.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {getExerciseTypeLabel(activity.exercises?.exercise_type)} • Điểm: {activity.score}% • {formatTimeAgo(activity.completed_at)}
                      </p>
                    </div>
                    <div className="text-green-600 font-semibold">
                      +{activity.score || 0} XP
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Chưa có hoạt động nào. Hãy bắt đầu học thôi!</p>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Thời gian học tập</span>
            </h3>
          </Card.Header>
          <Card.Content>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatPracticeTime(stats.totalPracticeTime)}
            </div>
            <p className="text-gray-600">Tổng thời gian luyện tập</p>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Tham gia từ</span>
            </h3>
          </Card.Header>
          <Card.Content>
            <div className="text-lg font-medium text-gray-900 mb-2">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('vi-VN') : 'N/A'}
            </div>
            <p className="text-gray-600">Ngày đăng ký tài khoản</p>
          </Card.Content>
        </Card>
      </div>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Chọn Avatar</h3>
              <button
                onClick={() => setShowAvatarSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6">
              {availableAvatars.map((avatar) => {
                const isUnlocked = stats.totalXP >= avatar.unlock_xp
                const isSelected = selectedAvatar === avatar.image_url

                return (
                  <div key={avatar.id} className="text-center">
                    <div className="relative w-20 h-20">
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center text-2xl transition-all overflow-hidden border-2 ${
                          isUnlocked
                            ? isSelected
                              ? 'bg-blue-500 text-white ring-4 ring-blue-300 border-blue-600 cursor-pointer'
                              : 'bg-gray-100 hover:bg-gray-200 border-gray-300 cursor-pointer'
                            : 'bg-gray-300 opacity-50 border-gray-400 cursor-not-allowed'
                        }`}
                        onClick={() => isUnlocked && handleAvatarSelect(avatar)}
                        title={
                          isUnlocked
                            ? `${avatar.name} - ${avatar.description}`
                            : `${avatar.name} - Cần ${avatar.unlock_xp} XP để mở khóa`
                        }
                      >
                        {avatar.image_url.startsWith('http') ? (
                          <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          avatar.image_url
                        )}
                      </div>
                      
                      {/* Lock overlay for locked avatars - positioned absolutely over the entire container */}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-xs mt-2">
                      <div className={`font-medium ${isUnlocked ? 'text-gray-800' : 'text-gray-500'}`}>
                        {avatar.name}
                      </div>
                      {!isUnlocked ? (
                        <div className="text-red-500 font-medium">
                          {avatar.unlock_xp} XP
                        </div>
                      ) : (
                        avatar.tier !== 'default' && (
                          <div className="text-gray-500 capitalize">
                            {avatar.tier}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <span className="text-lg font-bold text-blue-900">
                  XP hiện tại: {stats.totalXP}
                </span>
                {currentLevel && (
                  <div className="text-sm text-blue-700 mt-1">
                    Cấp {currentLevel.level_number} • {currentBadge?.name}
                  </div>
                )}
                
                {/* Show next unlockable avatar */}
                {(() => {
                  const nextAvatar = availableAvatars.find(avatar => avatar.unlock_xp > stats.totalXP)
                  if (nextAvatar) {
                    return (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-800 font-medium">
                          Avatar tiếp theo: {nextAvatar.name}
                        </div>
                        <div className="text-xs text-blue-600">
                          Cần {nextAvatar.unlock_xp - stats.totalXP} XP nữa
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div className="mt-3 p-3 bg-green-100 rounded-lg border border-green-200">
                      <div className="text-sm text-green-800 font-medium">
                        🎉 Bạn đã mở khóa tất cả avatars!
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {showBadgeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Badge Collection</h2>
                <button
                  onClick={() => setShowBadgeModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Earned Badges */}
              {earnedBadges.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <span>Earned Badges ({earnedBadges.length})</span>
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {earnedBadges.map((badge) => (
                      <div key={badge.id} className="text-center">
                        <div className={`w-16 h-16 mx-auto mb-2 p-2 rounded-full ${getTierBgColor(badge.badge_tier)}`}>
                          <img
                            src={badge.badge_icon}
                            alt={badge.badge_name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'inline'
                            }}
                          />
                          <span className="text-2xl hidden">{badge.badge_icon}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">{badge.badge_name}</div>
                        <div className="text-xs text-gray-500">{badge.xp_required} XP</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Badges */}
              {upcomingBadges.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Target className="w-5 h-5 text-gray-600" />
                    <span>Upcoming Badges ({upcomingBadges.length})</span>
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {upcomingBadges.map((badge) => (
                      <div key={badge.id} className="text-center relative">
                        <div className="w-16 h-16 mx-auto mb-2 p-2 rounded-full bg-gray-100 relative">
                          <img
                            src={badge.badge_icon}
                            alt={badge.badge_name}
                            className="w-full h-full object-contain opacity-30 grayscale"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'inline'
                            }}
                          />
                          <span className="text-2xl hidden opacity-30 grayscale">{badge.badge_icon}</span>
                          {/* Lock overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-600">{badge.badge_name}</div>
                        <div className="text-xs text-gray-500">{badge.xp_required} XP</div>
                        <div className="text-xs text-red-500 mt-1">
                          {badge.xp_required - (stats.totalXP || 0)} XP needed
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {earnedBadges.length === 0 && upcomingBadges.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No badges available</h3>
                  <p>Badge system is not configured yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile