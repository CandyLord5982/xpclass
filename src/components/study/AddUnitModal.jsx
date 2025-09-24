import React, { useState } from 'react'
import { supabase } from '../../supabase/client'
import { X, BookOpen, Plus } from 'lucide-react'

const AddUnitModal = ({ levelId, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    color_theme: 'blue',
    estimated_duration: 60
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get the next unit number for this course (legacy prop name levelId)
      const { data: existingUnits, error: countError } = await supabase
        .from('units')
        .select('unit_number')
        .eq('course_id', levelId)
        .order('unit_number', { ascending: false })
        .limit(1)

      if (countError) throw countError

      const nextUnitNumber = existingUnits.length > 0 ? existingUnits[0].unit_number + 1 : 1

      // Create the unit (use course_id instead of legacy level_id)
      const { data, error } = await supabase
        .from('units')
        .insert({
          course_id: levelId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          unit_number: nextUnitNumber,
          color_theme: formData.color_theme,
          unlock_requirement: 0,
          is_active: true,
          estimated_duration: formData.estimated_duration
        })
        .select()
        .single()

      if (error) throw error

      onCreated(data)
    } catch (err) {
      console.error('Error creating unit:', err)
      setError(err.message || 'Failed to create unit')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create New Unit
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Unit Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Basic Vocabulary, Grammar Fundamentals"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of what this unit covers"
              rows={3}
            />
          </div>

          {/* Color Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color Theme
            </label>
            <div className="flex space-x-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleChange('color_theme', color.value)}
                  className={`
                    w-8 h-8 rounded-full border-2 transition-all
                    ${color.class}
                    ${formData.color_theme === color.value
                      ? 'border-gray-800 ring-2 ring-gray-300'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.estimated_duration}
              onChange={(e) => handleChange('estimated_duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="300"
            />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="bg-white rounded-lg border p-3">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-lg ${
                  formData.color_theme === 'blue' ? 'bg-blue-100' :
                  formData.color_theme === 'green' ? 'bg-green-100' :
                  formData.color_theme === 'purple' ? 'bg-purple-100' :
                  formData.color_theme === 'orange' ? 'bg-orange-100' :
                  formData.color_theme === 'red' ? 'bg-red-100' :
                  'bg-yellow-100'
                } flex items-center justify-center`}>
                  <BookOpen className={`w-6 h-6 ${
                    formData.color_theme === 'blue' ? 'text-blue-600' :
                    formData.color_theme === 'green' ? 'text-green-600' :
                    formData.color_theme === 'purple' ? 'text-purple-600' :
                    formData.color_theme === 'orange' ? 'text-orange-600' :
                    formData.color_theme === 'red' ? 'text-red-600' :
                    'text-yellow-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {formData.title || 'Unit Title'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formData.description || 'Unit description'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Est. {formData.estimated_duration} minutes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create Unit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddUnitModal